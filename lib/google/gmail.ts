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

function extractBodyText(payload: Record<string, unknown>): string {
  // Single-part body
  const body = payload.body as { data?: string } | undefined;
  if (body?.data) return decodeBase64Url(body.data);

  // Multipart — prefer text/plain, fall back to text/html
  const parts = payload.parts as Array<{ mimeType: string; body?: { data?: string }; parts?: unknown[] }> | undefined;
  if (!parts) return "";

  for (const part of parts) {
    if (part.mimeType === "text/plain" && part.body?.data) {
      return decodeBase64Url(part.body.data);
    }
  }
  for (const part of parts) {
    if (part.mimeType === "text/html" && part.body?.data) {
      // Strip HTML tags for plain-text matching
      return decodeBase64Url(part.body.data).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    }
  }
  return "";
}

const BUY_PATTERNS = [
  // "You bought 5 shares of Apple (AAPL) at $150.00"
  /bought?\s+([\d,]+(?:\.\d+)?)\s+shares?\s+of\s+(.*?)\s*\(([A-Z]{1,5})\)\s+at\s+\$?([\d,]+(?:\.\d+)?)/i,
  // "Bought 5 AAPL @ $150.00"
  /bought?\s+([\d,]+(?:\.\d+)?)\s+([A-Z]{1,5})\s+@\s+\$?([\d,]+(?:\.\d+)?)/i,
  // "Market buy · 5 shares · AAPL · $150.00/share"
  /market\s+buy\W+([\d,]+(?:\.\d+)?)\s+shares?\W+([A-Z]{1,5})\W+\$?([\d,]+(?:\.\d+)?)/i,
];

const SELL_PATTERNS = [
  /sold?\s+([\d,]+(?:\.\d+)?)\s+shares?\s+of\s+(.*?)\s*\(([A-Z]{1,5})\)\s+at\s+\$?([\d,]+(?:\.\d+)?)/i,
  /sold?\s+([\d,]+(?:\.\d+)?)\s+([A-Z]{1,5})\s+@\s+\$?([\d,]+(?:\.\d+)?)/i,
  /market\s+sell\W+([\d,]+(?:\.\d+)?)\s+shares?\W+([A-Z]{1,5})\W+\$?([\d,]+(?:\.\d+)?)/i,
];

function parseTrade(text: string, date: string): RobinhoodTrade | null {
  const clean = (s: string) => parseFloat(s.replace(/,/g, ""));

  for (const pat of BUY_PATTERNS) {
    const m = text.match(pat);
    if (m) {
      // Pattern with company name: groups 1=qty, 2=name, 3=ticker, 4=price
      // Pattern without name:      groups 1=qty, 2=ticker, 3=price
      const hasName = pat.source.includes("shares?\\s+of");
      return {
        action: "buy",
        ticker: hasName ? m[3].toUpperCase() : m[2].toUpperCase(),
        name:   hasName ? m[2].trim() : m[2].toUpperCase(),
        quantity: clean(m[1]),
        price:    hasName ? clean(m[4]) : clean(m[3]),
        date,
      };
    }
  }

  for (const pat of SELL_PATTERNS) {
    const m = text.match(pat);
    if (m) {
      const hasName = pat.source.includes("shares?\\s+of");
      return {
        action: "sell",
        ticker: hasName ? m[3].toUpperCase() : m[2].toUpperCase(),
        name:   hasName ? m[2].trim() : m[2].toUpperCase(),
        quantity: clean(m[1]),
        price:    hasName ? clean(m[4]) : clean(m[3]),
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

interface GFullMessagePayload {
  body?: { data?: string };
  parts?: Array<{ mimeType: string; body?: { data?: string }; parts?: unknown[] }>;
  headers?: GMessageHeader[];
}

interface GFullMessage {
  id: string;
  payload?: GFullMessagePayload;
}

export async function scanRobinhoodTrades(userId: string, maxEmails = 100): Promise<RobinhoodTrade[]> {
  const token = await getValidGoogleToken(userId);

  const listUrl = new URL("https://www.googleapis.com/gmail/v1/users/me/messages");
  listUrl.searchParams.set("maxResults", String(maxEmails));
  listUrl.searchParams.set("q", "from:robinhood.com");

  const listRes = await fetch(listUrl.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!listRes.ok) throw new Error("GMAIL_LIST_FAILED");

  const listData: GMessageListResponse = await listRes.json();
  if (!listData.messages?.length) return [];

  const trades = await Promise.all(
    listData.messages.map(async (msg) => {
      try {
        const res = await fetch(
          `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
          { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
        );
        if (!res.ok) return null;
        const detail: GFullMessage = await res.json();
        if (!detail.payload) return null;

        const headers = detail.payload.headers ?? [];
        const date = headers.find((h) => h.name === "Date")?.value ?? "";
        const text = extractBodyText(detail.payload as Record<string, unknown>);
        return parseTrade(text, date);
      } catch {
        return null;
      }
    })
  );

  return trades.filter((t): t is RobinhoodTrade => t !== null);
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
