"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, Mail } from "lucide-react";
import { analyzeInboxAction } from "@/app/actions/aiEmail";
import type { FlaggedEmail } from "@/lib/ai/emailAnalyzer";
import Link from "next/link";

export function PriorityCard() {
  const [flagged, setFlagged] = useState<FlaggedEmail[]>([]);
  const [summary, setSummary] = useState("");
  const [hasScanned, setHasScanned] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleScan() {
    startTransition(async () => {
      const result = await analyzeInboxAction();
      setFlagged(result.flagged.slice(0, 3));
      setSummary(result.summary);
      setHasScanned(true);
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut", delay: 0.35 }}
      className="col-span-3 rounded-2xl p-5 relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(61,34,0,0.4) 0%, rgba(16,12,4,0.95) 50%)",
        border: "1px solid rgba(200,144,10,0.2)",
        boxShadow: "0 0 30px -10px rgba(200,144,10,0.15), 0 4px 24px rgba(0,0,0,0.3)",
      }}
    >
      {/* Ambient glow */}
      <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(200,144,10,0.08) 0%, transparent 70%)" }} />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(200,144,10,0.15)", border: "1px solid rgba(200,144,10,0.25)" }}>
              <Sparkles className="w-3.5 h-3.5" style={{ color: "#F5CE58" }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "#F5F0E8" }}>Priority Inbox</p>
              <p className="text-xs" style={{ color: "rgba(245,240,232,0.35)" }}>
                {hasScanned ? "Powered by Claude" : "AI-powered email triage"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasScanned && (
              <Link href="/mail"
                className="text-xs px-3 py-1.5 rounded-lg transition-colors hover:bg-white/5"
                style={{ color: "rgba(245,240,232,0.4)", border: "1px solid rgba(255,235,180,0.08)" }}>
                View all
              </Link>
            )}
            <button
              onClick={handleScan}
              disabled={isPending}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 disabled:opacity-50"
              style={{
                background: "rgba(200,144,10,0.15)",
                border: "1px solid rgba(200,144,10,0.3)",
                color: "#E8B428",
              }}
            >
              {isPending
                ? <><Loader2 className="w-3 h-3 animate-spin" /> Scanning…</>
                : <><Sparkles className="w-3 h-3" />{hasScanned ? "Re-scan" : "Scan now"}</>}
            </button>
          </div>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {!hasScanned && !isPending && (
            <motion.div key="empty"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-3 py-2">
              <Mail className="w-4 h-4 shrink-0" style={{ color: "rgba(245,240,232,0.2)" }} />
              <p className="text-sm" style={{ color: "rgba(245,240,232,0.3)" }}>
                Click &ldquo;Scan now&rdquo; — Claude will read your inbox and surface what actually matters.
              </p>
            </motion.div>
          )}

          {isPending && (
            <motion.div key="loading"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-3 py-2">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" style={{ color: "rgba(200,144,10,0.5)" }} />
              <p className="text-sm" style={{ color: "rgba(245,240,232,0.4)" }}>
                Reading your inbox…
              </p>
            </motion.div>
          )}

          {hasScanned && !isPending && (
            <motion.div key="results"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}>

              {/* Summary line */}
              {summary && (
                <p className="text-sm leading-relaxed mb-4" style={{ color: "rgba(245,240,232,0.6)" }}>
                  {summary}
                </p>
              )}

              {/* Flagged items */}
              {flagged.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {flagged.map((item, i) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="flex items-start gap-3 px-4 py-3 rounded-xl"
                      style={{
                        background: item.priority === "high"
                          ? "rgba(200,144,10,0.08)"
                          : "rgba(200,144,10,0.04)",
                        border: item.priority === "high"
                          ? "1px solid rgba(200,144,10,0.2)"
                          : "1px solid rgba(200,144,10,0.1)",
                      }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                        style={{
                          background: item.priority === "high" ? "#F5CE58" : "#C8900A",
                          boxShadow: item.priority === "high" ? "0 0 6px rgba(245,206,88,0.6)" : "none",
                        }} />
                      <p className="text-xs leading-relaxed" style={{ color: "rgba(245,240,232,0.7)" }}>
                        {item.reason}
                      </p>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-sm" style={{ color: "rgba(245,240,232,0.35)" }}>
                  Inbox looks clear — nothing urgent right now.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
