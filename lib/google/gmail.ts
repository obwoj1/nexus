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
