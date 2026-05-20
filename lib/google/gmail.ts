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
