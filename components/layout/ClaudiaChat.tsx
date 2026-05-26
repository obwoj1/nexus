"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { X, Send, Sparkles, ChevronDown } from "lucide-react";
import { askClaudiaAction, type ChatMessage } from "@/app/actions/claudia";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "nexus-claudia-global-chat";

function loadHistory(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]") as ChatMessage[];
  } catch { return []; }
}

function saveHistory(msgs: ChatMessage[]) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-40))); } catch { /* ignore */ }
}

export function ClaudiaChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initialized = useRef(false);

  // Load history from sessionStorage on mount
  useEffect(() => {
    const hist = loadHistory();
    setMessages(hist);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open]);

  // Greeting on first open
  useEffect(() => {
    if (!open || initialized.current || messages.length > 0) return;
    initialized.current = true;
    startTransition(async () => {
      const res = await askClaudiaAction([], "briefing");
      if (res.result) {
        const greeting: ChatMessage = { role: "assistant", content: res.result };
        setMessages([greeting]);
        saveHistory([greeting]);
      }
    });
  }, [open]); // eslint-disable-line

  function handleSend() {
    const text = input.trim();
    if (!text || isPending) return;
    setInput("");

    const userMsg: ChatMessage = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    saveHistory(next);

    startTransition(async () => {
      const res = await askClaudiaAction(next);
      if (res.result) {
        const reply: ChatMessage = { role: "assistant", content: res.result };
        const withReply = [...next, reply];
        setMessages(withReply);
        saveHistory(withReply);
      }
    });
  }

  return (
    <>
      {/* ── Floating button ── */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="fab"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-20 right-5 md:bottom-8 md:right-8 z-50 w-13 h-13 rounded-full flex items-center justify-center shadow-lg"
            style={{
              width: 52, height: 52,
              background: "linear-gradient(135deg, #C8900A, #F5CE58)",
              boxShadow: "0 0 24px rgba(200,144,10,0.5), 0 4px 16px rgba(0,0,0,0.4)",
            }}
            title="Ask Claudia"
          >
            <Sparkles className="w-5 h-5 text-black" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Chat panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-50 flex flex-col"
            style={{
              width: "min(420px, calc(100vw - 32px))",
              height: "min(560px, calc(100dvh - 120px))",
              background: "rgba(10,8,6,0.96)",
              backdropFilter: "blur(24px)",
              border: "1px solid rgba(200,144,10,0.25)",
              borderRadius: 20,
              boxShadow: "0 0 60px -12px rgba(200,144,10,0.3), 0 24px 48px rgba(0,0,0,0.6)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 shrink-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #C8900A, #F5CE58)" }}>
                  <Sparkles className="w-3.5 h-3.5 text-black" />
                </div>
                <div>
                  <p className="text-xs font-semibold leading-none" style={{ color: "#F5F0E8" }}>Claudia Ainina</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "rgba(245,240,232,0.35)" }}>Your personal AI</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-white/5">
                <ChevronDown className="w-4 h-4" style={{ color: "rgba(245,240,232,0.4)" }} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
              {messages.length === 0 && !isPending && (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-xs text-center" style={{ color: "rgba(245,240,232,0.2)" }}>
                    Ask me anything about your day,<br />your goals, your health — anything.
                  </p>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className="max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed"
                    style={msg.role === "user"
                      ? { background: "rgba(200,144,10,0.2)", color: "#F5F0E8", borderBottomRightRadius: 6 }
                      : { background: "rgba(255,255,255,0.05)", color: "rgba(245,240,232,0.85)", borderBottomLeftRadius: 6 }
                    }
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {isPending && (
                <div className="flex justify-start">
                  <div className="px-3.5 py-2.5 rounded-2xl flex gap-1.5 items-center"
                    style={{ background: "rgba(255,255,255,0.05)", borderBottomLeftRadius: 6 }}>
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                        style={{ background: "rgba(200,144,10,0.7)", animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-3 pb-3 shrink-0">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder="Ask Claudia anything…"
                  className="flex-1 bg-transparent text-xs outline-none"
                  style={{ color: "#F5F0E8" }}
                />
                <button
                  onClick={handleSend}
                  disabled={isPending || !input.trim()}
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 disabled:opacity-30 transition-opacity"
                  style={{ background: "rgba(200,144,10,0.25)" }}
                >
                  <Send className="w-3.5 h-3.5" style={{ color: "#C8900A" }} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
