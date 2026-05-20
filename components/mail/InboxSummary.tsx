"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { analyzeInboxAction } from "@/app/actions/aiEmail";
import type { FlaggedEmail } from "@/lib/ai/emailAnalyzer";

interface Props {
  unreadCount: number;
}

export function InboxSummary({ unreadCount }: Props) {
  const [summary, setSummary] = useState("");
  const [flagged, setFlagged] = useState<FlaggedEmail[]>([]);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(true);
  const [isPending, startTransition] = useTransition();

  function handleAnalyze() {
    setError("");
    startTransition(async () => {
      const result = await analyzeInboxAction();
      if (result.error) { setError(result.error); return; }
      setSummary(result.summary);
      setFlagged(result.flagged);
    });
  }

  const hasResult = summary.length > 0;

  return (
    <div className="mb-8 rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(61,34,0,0.5) 0%, rgba(20,15,5,0.9) 60%)",
        border: "1px solid rgba(200,144,10,0.25)",
        boxShadow: "0 0 30px -8px rgba(200,144,10,0.2)",
      }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(200,144,10,0.2)", border: "1px solid rgba(200,144,10,0.3)" }}>
            <Sparkles className="w-3.5 h-3.5" style={{ color: "#F5CE58" }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "#F5F0E8" }}>AI Inbox Summary</p>
            <p className="text-xs" style={{ color: "rgba(245,240,232,0.4)" }}>
              {hasResult ? "Powered by Claudia Ainina" : `Analyze your ${unreadCount} unread emails`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasResult && (
            <button onClick={() => setExpanded((e) => !e)}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5">
              {expanded
                ? <ChevronUp className="w-3.5 h-3.5" style={{ color: "rgba(245,240,232,0.4)" }} />
                : <ChevronDown className="w-3.5 h-3.5" style={{ color: "rgba(245,240,232,0.4)" }} />}
            </button>
          )}
          <button
            onClick={handleAnalyze}
            disabled={isPending}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 disabled:opacity-50"
            style={{
              background: "rgba(200,144,10,0.15)",
              border: "1px solid rgba(200,144,10,0.3)",
              color: "#E8B428",
            }}
          >
            {isPending
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing…</>
              : <><Sparkles className="w-3.5 h-3.5" />{hasResult ? "Re-scan" : "Scan inbox"}</>}
          </button>
        </div>
      </div>

      {/* Results */}
      <AnimatePresence>
        {hasResult && expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="px-5 pb-5" style={{ borderTop: "1px solid rgba(200,144,10,0.1)" }}>
              {/* Summary text */}
              <p className="text-sm leading-relaxed pt-4 mb-4" style={{ color: "rgba(245,240,232,0.75)" }}>
                {summary}
              </p>

              {/* Flagged emails */}
              {flagged.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] tracking-widest uppercase font-medium mb-1"
                    style={{ color: "rgba(200,144,10,0.7)" }}>
                    NEEDS ATTENTION · {flagged.length}
                  </p>
                  {flagged.map((item) => (
                    <div key={item.id}
                      className="flex items-start gap-3 px-4 py-3 rounded-xl"
                      style={{
                        background: item.priority === "high"
                          ? "rgba(200,144,10,0.08)"
                          : "rgba(200,144,10,0.04)",
                        border: item.priority === "high"
                          ? "1px solid rgba(200,144,10,0.2)"
                          : "1px solid rgba(200,144,10,0.1)",
                      }}>
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                        style={{
                          background: item.priority === "high" ? "#F5CE58" : "#C8900A",
                          boxShadow: item.priority === "high" ? "0 0 6px rgba(245,206,88,0.6)" : "none",
                        }} />
                      <p className="text-xs leading-relaxed" style={{ color: "rgba(245,240,232,0.7)" }}>
                        {item.reason}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {flagged.length === 0 && (
                <p className="text-xs" style={{ color: "rgba(245,240,232,0.35)" }}>
                  No urgent emails found in your inbox.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <p className="px-5 pb-4 text-xs" style={{ color: "rgba(248,113,113,0.8)" }}>{error}</p>
      )}
    </div>
  );
}
