"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Trash2, CheckCheck, Loader2, Sparkles } from "lucide-react";
import { markAsReadAction, batchMarkOldAsReadAction } from "@/app/actions/gmail";
import type { GmailMessage } from "@/lib/google/gmail";

function parseSenderName(from: string): string {
  const match = from.match(/^"?([^"<]+?)"?\s*</);
  return match ? match[1].trim() : from.split("@")[0];
}

function formatDate(dateStr: string): string {
  try { return formatDistanceToNow(new Date(dateStr), { addSuffix: true }); }
  catch { return dateStr; }
}

function senderInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

interface Props {
  initialMessages: GmailMessage[];
  oldUnreadCount: number;
  daysOld?: number;
}

export function QuickReadPanel({ initialMessages, oldUnreadCount, daysOld = 30 }: Props) {
  const [messages, setMessages] = useState(initialMessages);
  const [remaining, setRemaining] = useState(oldUnreadCount);
  const [lastCleared, setLastCleared] = useState(0);
  const [isPending, startTransition] = useTransition();

  function removeMessage(id: string) {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    setRemaining((n) => Math.max(0, n - 1));
  }

  function handleMarkOne(id: string) {
    startTransition(async () => {
      const res = await markAsReadAction([id]);
      if (res.success) removeMessage(id);
    });
  }

  function handleMarkAll() {
    startTransition(async () => {
      const res = await batchMarkOldAsReadAction(daysOld);
      if (res.success) {
        setLastCleared(res.count);
        setMessages([]);
        setRemaining((n) => Math.max(0, n - res.count));
      }
    });
  }

  if (remaining === 0 && messages.length === 0 && lastCleared === 0) return null;

  return (
    <section className="mb-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(200,144,10,0.15)", border: "1px solid rgba(200,144,10,0.2)" }}>
            <Sparkles className="w-3.5 h-3.5" style={{ color: "#C8900A" }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "#F5F0E8" }}>Quick Read</p>
            <p className="text-xs" style={{ color: "rgba(245,240,232,0.4)" }}>
              {remaining > 0
                ? `${remaining.toLocaleString()} unread emails older than ${daysOld} days`
                : lastCleared > 0
                ? `Cleared ${lastCleared.toLocaleString()} old emails`
                : "All caught up"}
            </p>
          </div>
        </div>

        {remaining > 0 && (
          <button
            onClick={handleMarkAll}
            disabled={isPending}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 disabled:opacity-50"
            style={{
              background: "rgba(200,144,10,0.12)",
              border: "1px solid rgba(200,144,10,0.25)",
              color: "#E8B428",
            }}
          >
            {isPending
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <CheckCheck className="w-3.5 h-3.5" />}
            {isPending ? "Clearing…" : `Mark all ${daysOld}d+ as read`}
          </button>
        )}
      </div>

      {/* Success state */}
      {lastCleared > 0 && messages.length === 0 && (
        <div className="rounded-2xl p-5 text-center"
          style={{ background: "rgba(74,222,128,0.05)", border: "1px solid rgba(74,222,128,0.15)" }}>
          <CheckCheck className="w-5 h-5 mx-auto mb-2" style={{ color: "rgba(74,222,128,0.7)" }} />
          <p className="text-sm font-medium" style={{ color: "rgba(74,222,128,0.9)" }}>
            Marked {lastCleared.toLocaleString()} emails as read
          </p>
          {remaining > 0 && (
            <p className="text-xs mt-1" style={{ color: "rgba(245,240,232,0.4)" }}>
              {remaining.toLocaleString()} more remaining — click &ldquo;Mark all&rdquo; again to continue
            </p>
          )}
        </div>
      )}

      {/* Message list */}
      <div className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const name = parseSenderName(msg.from);
            const initials = senderInitials(name);
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-start gap-4 px-5 py-4 rounded-2xl overflow-hidden"
                style={{
                  background: "rgba(200,144,10,0.03)",
                  border: "1px solid rgba(200,144,10,0.1)",
                }}
              >
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
                    <p className="text-sm font-medium truncate" style={{ color: "#F5F0E8" }}>{name}</p>
                    <p className="text-[11px] shrink-0" style={{ color: "rgba(245,240,232,0.3)" }}>
                      {formatDate(msg.date)}
                    </p>
                  </div>
                  <p className="text-sm truncate mb-0.5" style={{ color: "rgba(245,240,232,0.6)" }}>
                    {msg.subject}
                  </p>
                  <p className="text-xs truncate" style={{ color: "rgba(245,240,232,0.3)" }}>
                    {msg.snippet}
                  </p>
                </div>

                {/* Mark as read */}
                <button
                  onClick={() => handleMarkOne(msg.id)}
                  disabled={isPending}
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-150 hover:scale-110 disabled:opacity-40"
                  style={{
                    background: "rgba(200,144,10,0.1)",
                    border: "1px solid rgba(200,144,10,0.15)",
                  }}
                  title="Mark as read"
                >
                  <Trash2 className="w-3.5 h-3.5" style={{ color: "#C8900A" }} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </section>
  );
}
