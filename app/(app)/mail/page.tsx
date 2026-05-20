import { createClient } from "@/lib/supabase/server";
import { getInboxMessages, getInboxStats, getOldUnreadMessages, getOldUnreadCount, type GmailMessage } from "@/lib/google/gmail";
import { Topbar } from "@/components/layout/Topbar";
import { QuickReadPanel } from "@/components/mail/QuickReadPanel";
import { formatDistanceToNow } from "date-fns";
import { Mail, AlertCircle } from "lucide-react";

function parseSenderName(from: string): string {
  const match = from.match(/^"?([^"<]+?)"?\s*</);
  return match ? match[1].trim() : from.split("@")[0];
}

function formatDate(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return dateStr;
  }
}

function senderInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

function MessageRow({ message }: { message: GmailMessage }) {
  const name = parseSenderName(message.from);
  const initials = senderInitials(name);

  return (
    <div className="flex items-start gap-4 px-5 py-4 rounded-2xl transition-colors duration-150 cursor-default"
      style={{
        background: message.isUnread ? "rgba(200,144,10,0.04)" : "#161210",
        border: message.isUnread
          ? "1px solid rgba(200,144,10,0.12)"
          : "1px solid rgba(255,235,180,0.07)",
      }}>

      {/* Avatar */}
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-semibold shrink-0"
        style={{
          background: "linear-gradient(135deg, #3D2200, #6B3D00)",
          color: "rgba(245,240,232,0.7)",
          border: "1px solid rgba(200,144,10,0.15)",
        }}>
        {initials}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-3 mb-0.5">
          <p className="text-sm truncate"
            style={{ color: message.isUnread ? "#F5F0E8" : "rgba(245,240,232,0.6)", fontWeight: message.isUnread ? 600 : 400 }}>
            {name}
          </p>
          <p className="text-[11px] shrink-0" style={{ color: "rgba(245,240,232,0.3)" }}>
            {formatDate(message.date)}
          </p>
        </div>
        <p className="text-sm truncate mb-1"
          style={{ color: message.isUnread ? "rgba(245,240,232,0.85)" : "rgba(245,240,232,0.45)", fontWeight: message.isUnread ? 500 : 400 }}>
          {message.subject}
        </p>
        <p className="text-xs truncate" style={{ color: "rgba(245,240,232,0.3)" }}>
          {message.snippet}
        </p>
      </div>

      {/* Unread dot */}
      {message.isUnread && (
        <div className="w-2 h-2 rounded-full shrink-0 mt-1.5"
          style={{ background: "#C8900A", boxShadow: "0 0 6px rgba(200,144,10,0.6)" }} />
      )}
    </div>
  );
}

export default async function MailPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [messagesResult, statsResult, oldMessagesResult, oldCountResult] = await Promise.allSettled([
    getInboxMessages(user.id, 25),
    getInboxStats(user.id),
    getOldUnreadMessages(user.id, 30, 25),
    getOldUnreadCount(user.id, 30),
  ]);

  const messages    = messagesResult.status    === "fulfilled" ? messagesResult.value    : null;
  const stats       = statsResult.status       === "fulfilled" ? statsResult.value       : null;
  const oldMessages = oldMessagesResult.status === "fulfilled" ? oldMessagesResult.value : [];
  const oldCount    = oldCountResult.status    === "fulfilled" ? oldCountResult.value    : 0;
  const hasError    = messagesResult.status    === "rejected";

  return (
    <div className="flex flex-col flex-1">
      <Topbar section="MAIL" title="Inbox" />

      <main className="flex-1 p-8 max-w-3xl">
        {hasError && (
          <div className="mb-6 rounded-xl p-4 flex items-center gap-3"
            style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)" }}>
            <AlertCircle className="w-4 h-4 shrink-0" style={{ color: "rgba(248,113,113,0.8)" }} />
            <p className="text-sm" style={{ color: "rgba(248,113,113,0.9)" }}>
              Could not load inbox. Sign out and back in to reconnect Google.
            </p>
          </div>
        )}

        {/* Stats row */}
        {stats && (
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4" style={{ color: "#C8900A" }} />
              <span className="text-sm font-medium" style={{ color: "#F5F0E8" }}>
                {stats.total.toLocaleString()} messages
              </span>
            </div>
            {stats.unread > 0 && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: "rgba(200,144,10,0.15)", color: "#E8B428", border: "1px solid rgba(200,144,10,0.2)" }}>
                {stats.unread} unread
              </span>
            )}
          </div>
        )}

        {/* Quick Read cleanup */}
        {oldCount > 0 && (
          <QuickReadPanel
            initialMessages={oldMessages}
            oldUnreadCount={oldCount}
            daysOld={30}
          />
        )}

        {/* Message list */}
        {messages === null ? null : messages.length === 0 ? (
          <div className="rounded-2xl p-12 text-center"
            style={{ background: "#161210", border: "1px solid rgba(255,235,180,0.06)" }}>
            <Mail className="w-8 h-8 mx-auto mb-3" style={{ color: "rgba(200,144,10,0.3)" }} />
            <p style={{ color: "rgba(245,240,232,0.3)" }}>Inbox is empty</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {messages.map((msg) => <MessageRow key={msg.id} message={msg} />)}
          </div>
        )}
      </main>
    </div>
  );
}
