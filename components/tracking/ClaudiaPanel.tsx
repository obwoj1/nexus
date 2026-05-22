"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { Sparkles, X, Send, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { askClaudiaTrackingAction, type ChatMessage } from "@/app/actions/claudiaTracking";

export function ClaudiaPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = sessionStorage.getItem("claudia-messages");
      return saved ? (JSON.parse(saved) as ChatMessage[]) : [];
    } catch { return []; }
  });
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [greeted, setGreeted] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("claudia-greeted") === "1";
  });
  const bottomRef = useRef<HTMLDivElement>(null);

  // Persist messages to sessionStorage
  useEffect(() => {
    try { sessionStorage.setItem("claudia-messages", JSON.stringify(messages)); } catch { /* ignore */ }
  }, [messages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPending]);

  // Generate greeting when panel first opens
  useEffect(() => {
    if (open && !greeted) {
      setGreeted(true);
      try { sessionStorage.setItem("claudia-greeted", "1"); } catch { /* ignore */ }
      startTransition(async () => {
        const { result, error } = await askClaudiaTrackingAction([], true);
        if (result) setMessages([{ role: "assistant", content: result }]);
        else if (error) setMessages([{ role: "assistant", content: "Hey! I'm having trouble pulling your data right now. Try again in a sec." }]);
      });
    }
  }, [open, greeted]);

  function handleSend() {
    const text = input.trim();
    if (!text || isPending) return;
    const newMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    startTransition(async () => {
      const { result, error } = await askClaudiaTrackingAction(newMessages);
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: result ?? (error ?? "Something went wrong."),
      }]);
    });
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: 360, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 360, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 260 }}
          className="w-[360px] shrink-0 flex flex-col h-full"
          style={{ borderLeft: "1px solid rgba(200,144,10,0.15)", background: "#080604" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5"
            style={{ borderBottom: "1px solid rgba(200,144,10,0.12)" }}>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,#7A4800,#C8900A,#F5CE58)", boxShadow: "0 0 12px rgba(200,144,10,0.3)" }}>
                <Sparkles className="w-3.5 h-3.5" style={{ color: "#080705" }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "#F5F0E8" }}>Claudia</p>
                <p className="text-[10px]" style={{ color: "rgba(200,144,10,0.6)" }}>Has access to your live data</p>
              </div>
            </div>
            <button onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5">
              <X className="w-3.5 h-3.5" style={{ color: "rgba(245,240,232,0.4)" }} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
            {messages.length === 0 && isPending && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl rounded-tl-sm w-fit"
                style={{ background: "rgba(200,144,10,0.07)", border: "1px solid rgba(200,144,10,0.12)" }}>
                <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#C8900A" }} />
                <span className="text-xs" style={{ color: "rgba(245,240,232,0.5)" }}>Checking your data…</span>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[88%] px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user" ? "rounded-2xl rounded-br-sm" : "rounded-2xl rounded-tl-sm"
                  }`}
                  style={msg.role === "user" ? {
                    background: "rgba(255,255,255,0.07)",
                    color: "#F5F0E8",
                    border: "1px solid rgba(255,235,180,0.1)",
                  } : {
                    background: "rgba(200,144,10,0.08)",
                    color: "#F5F0E8",
                    border: "1px solid rgba(200,144,10,0.15)",
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {messages.length > 0 && isPending && (
              <div className="flex justify-start">
                <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-sm flex items-center gap-2"
                  style={{ background: "rgba(200,144,10,0.08)", border: "1px solid rgba(200,144,10,0.15)" }}>
                  <span className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                        style={{ background: "#C8900A", animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3" style={{ borderTop: "1px solid rgba(200,144,10,0.1)" }}>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(200,144,10,0.15)" }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder="Ask about your data…"
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: "#F5F0E8" }}
              />
              <button onClick={handleSend} disabled={!input.trim() || isPending}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
                style={{ background: "rgba(200,144,10,0.2)" }}>
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#C8900A" }} />
                  : <Send className="w-3.5 h-3.5" style={{ color: "#C8900A" }} />}
              </button>
            </div>
            <p className="text-[9px] text-center mt-2" style={{ color: "rgba(245,240,232,0.2)" }}>
              Claudia reads your live habits, goals, health, subscriptions & dates
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
