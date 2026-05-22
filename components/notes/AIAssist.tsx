"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { BlockNoteEditor } from "@blocknote/core";
import { aiAssistAction } from "@/app/actions/aiNotes";

const MODES = [
  { key: "rewrite"   as const, label: "Rewrite" },
  { key: "expand"    as const, label: "Expand" },
  { key: "summarize" as const, label: "Summarize" },
  { key: "fix"       as const, label: "Fix grammar" },
];

interface SelectionSnapshot {
  from: number;
  to: number;
  text: string;
}

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: BlockNoteEditor<any, any, any>;
}

export function AIAssist({ editor }: Props) {
  const [active, setActive] = useState(false);   // visual: text is selected
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<string | null>(null);
  // Snapshot survives editor blur — stores range + text at selection time
  const snapshotRef = useRef<SelectionSnapshot | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = editor.onSelectionChange(() => {
      const { state } = editor._tiptapEditor;
      const { from, to } = state.selection;
      if (from === to) {
        snapshotRef.current = null;
        setActive(false);
        setOpen(false);
      } else {
        const text = state.doc.textBetween(from, to, " ").trim();
        snapshotRef.current = { from, to, text };
        setActive(true);
      }
    });
    return unsubscribe;
  }, [editor]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function handleMode(mode: typeof MODES[number]["key"]) {
    const snap = snapshotRef.current;
    if (!snap || !snap.text) return;

    setLoading(true);
    setActiveMode(mode);
    setOpen(false);

    const { result, error } = await aiAssistAction(snap.text, mode);

    if (error || !result) {
      console.error("[AIAssist]", error);
    } else {
      editor._tiptapEditor
        .chain()
        .setTextSelection({ from: snap.from, to: snap.to })
        .insertContent(result)
        .run();
    }

    snapshotRef.current = null;
    setActive(false);
    setLoading(false);
    setActiveMode(null);
  }

  function handleButtonClick() {
    // Use ref directly — avoids stale-state timing issues after editor events
    if (snapshotRef.current && !loading) {
      setOpen((v) => !v);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        // preventDefault preserves ProseMirror selection on mousedown
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleButtonClick}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
        style={{
          background: active
            ? "rgba(200,144,10,0.15)"
            : loading
            ? "rgba(200,144,10,0.08)"
            : "rgba(255,255,255,0.04)",
          border: `1px solid ${active || loading ? "rgba(200,144,10,0.35)" : "rgba(255,235,180,0.1)"}`,
          color: active || loading ? "#C8900A" : "rgba(245,240,232,0.35)",
          cursor: active && !loading ? "pointer" : "default",
          boxShadow: active ? "0 0 12px -2px rgba(200,144,10,0.2)" : "none",
        }}
        title={active ? "Ask Claudia to transform selected text" : "Select text to use AI assist"}
      >
        {loading
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <Sparkles className="w-3.5 h-3.5" />}
        <span>{loading ? (activeMode ?? "Thinking…") : "Ask Claudia"}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-1.5 right-0 z-50 rounded-xl overflow-hidden"
            style={{
              background: "#0D0C0A",
              border: "1px solid rgba(200,144,10,0.25)",
              boxShadow: "0 16px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(200,144,10,0.05)",
              minWidth: "148px",
            }}
          >
            <div className="px-3 py-2 border-b" style={{ borderColor: "rgba(200,144,10,0.12)" }}>
              <p className="text-[9px] tracking-widest uppercase font-semibold"
                style={{ color: "rgba(200,144,10,0.6)" }}>Claudia AI</p>
            </div>
            {MODES.map((m) => (
              <button
                key={m.key}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleMode(m.key)}
                className="w-full flex items-center px-3 py-2.5 text-xs text-left transition-colors"
                style={{ color: "rgba(245,240,232,0.8)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(200,144,10,0.1)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {m.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
