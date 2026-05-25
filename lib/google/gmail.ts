import { getValidGoogleToken } from "./tokens";

export interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  snippet: string;
  date: string;
  isUnread: boolean;
}

export interface InboxStats {
  total: number;
  unread: number;
}

interface GMessageListItem { id: string; threadId: string }
interface GMessageListResponse { messages?: GMessageListItem[] }
interface GMessageHeader { name: string; value: string }
interface GMessageDetail {
  id: string;
  threadId: string;
  snippet?: string;
  labelIds?: string[];
  payload?: { headers?: GMessageHeader[] };
}
interface GLabelDetail { messagesTotal?: number; messagesUnread?: number }

export async function getInboxMessages(userId: string, limit = 20): Promise<GmailMessage[]> {
  const token = await getValidGoogleToken(userId);

  const listUrl = new URL("https://www.googleapis.com/gmail/v1/users/me/messages");
  listUrl.searchParams.set("maxResults", String(limit));
  listUrl.searchParams.set("labelIds", "INBOX");

  const listRes = await fetch(listUrl.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 60 },
  });

  if (!listRes.ok) throw new Error("GMAIL_LIST_FAILED");

  const listData: GMessageListResponse = await listRes.json();
  if (!listData.messages?.length) return [];

  const messages = await Promise.all(
    listData.messages.map(async (msg) => {
      const res = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 60 } }
      );
      if (!res.ok) return null;
      const detail: GMessageDetail = await res.json();
      const headers = detail.payload?.headers ?? [];
      const get = (name: string) => headers.find((h) => h.name === name)?.value ?? "";
      return {
        id: detail.id,
        threadId: detail.threadId,
        subject: get("Subject") || "(no subject)",
        from: get("From"),
        snippet: detail.snippet ?? "",
        date: get("Date"),
        isUnread: detail.labelIds?.includes("UNREAD") ?? false,
      } satisfies GmailMessage;
    })
  );

  return messages.filter((m): m is GmailMessage => m !== null);
}

export async function getInboxStats(userId: string): Promise<InboxStats> {
  const token = await getValidGoogleToken(userId);

  const res = await fetch(
    "https://www.googleapis.com/gmail/v1/users/me/labels/INBOX",
    { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 60 } }
  );

  if (!res.ok) throw new Error("GMAIL_STATS_FAILED");

  const data: GLabelDetail = await res.json();
  return { total: data.messagesTotal ?? 0, unread: data.messagesUnread ?? 0 };
}

export async function getOldUnreadMessages(userId: string, daysOld = 30, limit = 25): Promise<GmailMessage[]> {
  const token = await getValidGoogleToken(userId);

  const listUrl = new URL("https://www.googleapis.com/gmail/v1/users/me/messages");
  listUrl.searchParams.set("maxResults", String(limit));
  listUrl.searchParams.set("q", `is:unread older_than:${daysOld}d label:inbox`);

  const listRes = await fetch(listUrl.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!listRes.ok) throw new Error("GMAIL_OLD_UNREAD_FAILED");

  const listData: GMessageListResponse & { resultSizeEstimate?: number } = await listRes.json();
  if (!listData.messages?.length) return [];

  const messages = await Promise.all(
    listData.messages.map(async (msg) => {
      const res = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
      );
      if (!res.ok) return null;
      const detail: GMessageDetail = await res.json();
      const headers = detail.payload?.headers ?? [];
      const get = (name: string) => headers.find((h) => h.name === name)?.value ?? "";
      return {
        id: detail.id,
        threadId: detail.threadId,
        subject: get("Subject") || "(no subject)",
        from: get("From"),
        snippet: detail.snippet ?? "",
        date: get("Date"),
        isUnread: true as boolean,
      } satisfies GmailMessage;
    })
  );

  return messages.filter((m): m is GmailMessage => m !== null);
}

export async function getOldUnreadCount(userId: string, daysOld = 30): Promise<number> {
  const token = await getValidGoogleToken(userId);

  const url = new URL("https://www.googleapis.com/gmail/v1/users/me/messages");
  url.searchParams.set("maxResults", "1");
  url.searchParams.set("q", `is:unread older_than:${daysOld}d label:inbox`);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) return 0;

  const data: GMessageListResponse & { resultSizeEstimate?: number } = await res.json();
  return data.resultSizeEstimate ?? 0;
}

export async function markMessagesAsRead(userId: string, messageIds: string[]): Promise<void> {
  if (!messageIds.length) return;
  const token = await getValidGoogleToken(userId);

  // batchModify supports up to 1000 IDs at a time
  const chunks: string[][] = [];
  for (let i = 0; i < messageIds.length; i += 1000) {
    chunks.push(messageIds.slice(i, i + 1000));
  }

  await Promise.all(
    chunks.map((chunk) =>
      fetch("https://www.googleapis.com/gmail/v1/users/me/messages/batchModify", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ids: chunk, removeLabelIds: ["UNREAD"] }),
      })
    )
  );
}

// ── Robinhood trade parsing ────────────────────────────────────────────────

export interface RobinhoodTrade {
  action: "buy" | "sell";
  ticker: string;
  name: string;
  quantity: number;
  price: number;
  date: string;
}

export interface ParsedPosition {
  ticker: string;
  name: string;
  quantity: number;
  avgCostBasis: number;
  orderCount: number;
}

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf-8");
}

type MimePart = {
  mimeType?: string;
  body?: { data?: string };
  parts?: MimePart[];
};

function extractBodyText(payload: MimePart, depth = 0): string {
  if (depth > 6) return "";

  // Direct body data
  if (payload.body?.data) {
    const text = decodeBase64Url(payload.body.data);
    if (payload.mimeType === "text/html") {
      return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    }
    return text;
  }

  if (!payload.parts) return "";

  // Prefer text/plain at any nesting level
  for (const part of payload.parts) {
    if (part.mimeType === "text/plain") {
      const result = extractBodyText(part, depth + 1);
      if (result) return result;
    }
  }
  // Recurse into multipart/* containers
  for (const part of payload.parts) {
    if (part.mimeType?.startsWith("multipart/")) {
      const result = extractBodyText(part, depth + 1);
      if (result) return result;
    }
  }
  // Fall back to text/html
  for (const part of payload.parts) {
    if (part.mimeType === "text/html") {
      const result = extractBodyText(part, depth + 1);
      if (result) return result;
    }
  }
  return "";
}

// Each entry: [action, qtyGroup, tickerGroup, nameGroup (or -1), priceGroup]
type PatternEntry = { action: "buy" | "sell"; re: RegExp; qi: number; ti: number; ni: number; pi: number };

const TRADE_PATTERNS: PatternEntry[] = [
  // "You bought 5 shares of Apple (AAPL) at $150.00 per share"
  { action: "buy",  re: /bought?\s+([\d,]+(?:\.\d+)?)\s+shares?\s+of\s+(.*?)\s*\(([A-Z]{1,6})\).*?at\s+\$?([\d,]+(?:\.\d+)?)/i,  qi:1, ni:2, ti:3, pi:4 },
  // "You sold 5 shares of Apple (AAPL) at $150.00"
  { action: "sell", re: /sold?\s+([\d,]+(?:\.\d+)?)\s+shares?\s+of\s+(.*?)\s*\(([A-Z]{1,6})\).*?at\s+\$?([\d,]+(?:\.\d+)?)/i,    qi:1, ni:2, ti:3, pi:4 },
  // "bought 5 AAPL @ $150.00" or "sold 5 AAPL @ $150"
  { action: "buy",  re: /bought?\s+([\d,]+(?:\.\d+)?)\s+([A-Z]{1,6})\s+(?:shares?\s+)?@\s+\$?([\d,]+(?:\.\d+)?)/i, qi:1, ti:2, ni:-1, pi:3 },
  { action: "sell", re: /sold?\s+([\d,]+(?:\.\d+)?)\s+([A-Z]{1,6})\s+(?:shares?\s+)?@\s+\$?([\d,]+(?:\.\d+)?)/i,   qi:1, ti:2, ni:-1, pi:3 },
  // "Order Executed: Buy 5 AAPL at $150" (subject line format)
  { action: "buy",  re: /buy\s+([\d,]+(?:\.\d+)?)\s+([A-Z]{1,6})\s+at\s+\$?([\d,]+(?:\.\d+)?)/i,  qi:1, ti:2, ni:-1, pi:3 },
  { action: "sell", re: /sell\s+([\d,]+(?:\.\d+)?)\s+([A-Z]{1,6})\s+at\s+\$?([\d,]+(?:\.\d+)?)/i, qi:1, ti:2, ni:-1, pi:3 },
  // "Market Buy · 5 shares · AAPL · avg $150.00"
  { action: "buy",  re: /market\s+buy\W+([\d,]+(?:\.\d+)?)\s+(?:shares?\W+)?([A-Z]{1,6})\W+.*?\$?([\d,]+(?:\.\d+)?)/i,  qi:1, ti:2, ni:-1, pi:3 },
  { action: "sell", re: /market\s+sell\W+([\d,]+(?:\.\d+)?)\s+(?:shares?\W+)?([A-Z]{1,6})\W+.*?\$?([\d,]+(?:\.\d+)?)/i, qi:1, ti:2, ni:-1, pi:3 },
  // "Your order for 5 shares of AAPL (Apple) was filled at $150"
  { action: "buy",  re: /order.*?buy.*?([\d,]+(?:\.\d+)?)\s+(?:shares?\s+of\s+)?([A-Z]{1,6}).*?filled.*?\$?([\d,]+(?:\.\d+)?)/i,  qi:1, ti:2, ni:-1, pi:3 },
  { action: "sell", re: /order.*?sell.*?([\d,]+(?:\.\d+)?)\s+(?:shares?\s+of\s+)?([A-Z]{1,6}).*?filled.*?\$?([\d,]+(?:\.\d+)?)/i, qi:1, ti:2, ni:-1, pi:3 },
];

function parseTrade(subject: string, snippet: string, body: string, date: string): RobinhoodTrade | null {
  const clean = (s: string) => parseFloat(s.replace(/,/g, ""));
  // Try subject first (often most parseable), then snippet, then full body
  const sources = [subject, snippet, body].filter(Boolean);

  for (const { action, re, qi, ti, ni, pi } of TRADE_PATTERNS) {
    for (const src of sources) {
      const m = src.match(re);
      if (!m) continue;
      const ticker = m[ti]?.toUpperCase();
      if (!ticker || ticker.length > 6) continue;
      return {
        action,
        ticker,
        name:     ni > 0 ? m[ni].trim() : ticker,
        quantity: clean(m[qi]),
        price:    clean(m[pi]),
        date,
      };
    }
  }
  return null;
}

export function aggregateTrades(trades: RobinhoodTrade[]): ParsedPosition[] {
  const map = new Map<string, { name: string; qty: number; costSum: number; orders: number }>();

  for (const t of trades) {
    const cur = map.get(t.ticker) ?? { name: t.name, qty: 0, costSum: 0, orders: 0 };
    if (t.action === "buy") {
      cur.costSum += t.quantity * t.price;
      cur.qty += t.quantity;
      cur.orders += 1;
    } else {
      cur.qty -= t.quantity;
    }
    map.set(t.ticker, cur);
  }

  return Array.from(map.entries())
    .filter(([, v]) => v.qty > 0.0001)
    .map(([ticker, v]) => ({
      ticker,
      name:         v.name,
      quantity:     Math.round(v.qty * 1e8) / 1e8,
      avgCostBasis: v.costSum > 0 ? Math.round((v.costSum / v.qty) * 100) / 100 : 0,
      orderCount:   v.orders,
    }));
}

interface GFullMessage {
  id: string;
  snippet?: string;
  payload?: MimePart & { headers?: GMessageHeader[] };
}

export interface ScanResult {
  trades: RobinhoodTrade[];
  emailsFound: number;
}

export async function scanRobinhoodTrades(userId: string, maxEmails = 150): Promise<ScanResult> {
  const token = await getValidGoogleToken(userId);

  const listUrl = new URL("https://www.googleapis.com/gmail/v1/users/me/messages");
  listUrl.searchParams.set("maxResults", String(maxEmails));
  // Cast a wide net — any email from robinhood domain
  listUrl.searchParams.set("q", "from:robinhood.com OR from:robinhood OR (robinhood order)");

  const listRes = await fetch(listUrl.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!listRes.ok) throw new Error("GMAIL_LIST_FAILED");

  const listData: GMessageListResponse = await listRes.json();
  const emailsFound = listData.messages?.length ?? 0;
  if (!emailsFound) return { trades: [], emailsFound: 0 };

  const trades = await Promise.all(
    listData.messages!.map(async (msg) => {
      try {
        const res = await fetch(
          `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
          { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
        );
        if (!res.ok) return null;
        const detail: GFullMessage = await res.json();
        if (!detail.payload) return null;

        const headers = detail.payload.headers ?? [];
        const get = (name: string) => headers.find((h) => h.name === name)?.value ?? "";
        const subject = get("Subject");
        const date    = get("Date");
        const snippet = detail.snippet ?? "";
        const body    = extractBodyText(detail.payload);
        return parseTrade(subject, snippet, body, date);
      } catch {
        return null;
      }
    })
  );

  return {
    trades: trades.filter((t): t is RobinhoodTrade => t !== null),
    emailsFound,
  };
}

export async function batchMarkOldAsRead(userId: string, daysOld = 30): Promise<number> {
  const token = await getValidGoogleToken(userId);
  const allIds: string[] = [];
  let pageToken: string | undefined;

  // Collect up to 5000 message IDs (10 pages × 500)
  for (let page = 0; page < 10; page++) {
    const url = new URL("https://www.googleapis.com/gmail/v1/users/me/messages");
    url.searchParams.set("maxResults", "500");
    url.searchParams.set("q", `is:unread older_than:${daysOld}d label:inbox`);
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) break;

    const data: GMessageListResponse & { nextPageToken?: string } = await res.json();
    const ids = (data.messages ?? []).map((m) => m.id);
    allIds.push(...ids);
    pageToken = data.nextPageToken;
    if (!pageToken || ids.length < 500) break;
  }

  if (!allIds.length) return 0;
  await markMessagesAsRead(userId, allIds);
  return allIds.length;
}
