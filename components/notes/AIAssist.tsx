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

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: BlockNoteEditor<any, any, any>;
}

export function AIAssist({ editor }: Props) {
  const [hasSelection, setHasSelection] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<string | null>(null);
  // Store selection range in a ref so it survives the blur that happens on mousedown
  const selectionRef = useRef<{ from: number; to: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = editor.onSelectionChange(() => {
      const { state } = editor._tiptapEditor;
      const { from, to } = state.selection;
      if (from === to) {
        selectionRef.current = null;
        setHasSelection(false);
        setOpen(false);
      } else {
        selectionRef.current = { from, to };
        setHasSelection(true);
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
    const sel = selectionRef.current;
    if (!sel) return;

    // Read text from stored range (selection may have been lost by now)
    const { state } = editor._tiptapEditor;
    const text = state.doc.textBetween(sel.from, sel.to, " ").trim();
    if (!text) return;

    setLoading(true);
    setActiveMode(mode);
    setOpen(false);

    const { result, error } = await aiAssistAction(text, mode);

    if (error || !result) {
      console.error("[AIAssist]", error);
    } else {
      // Restore selection then replace with Claudia's response
      editor._tiptapEditor
        .chain()
        .setTextSelection({ from: sel.from, to: sel.to })
        .insertContent(result)
        .run();
    }

    selectionRef.current = null;
    setHasSelection(false);
    setLoading(false);
    setActiveMode(null);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        // preventDefault keeps editor focus so ProseMirror doesn't clear the selection
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => { if (hasSelection && !loading) setOpen((v) => !v); }}
        disabled={!hasSelection || loading}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200 disabled:opacity-30 disabled:cursor-default"
        style={{
          background: hasSelection ? "rgba(200,144,10,0.12)" : "transparent",
          border: `1px solid ${hasSelection ? "rgba(200,144,10,0.3)" : "rgba(255,235,180,0.08)"}`,
          color: hasSelection ? "#C8900A" : "rgba(245,240,232,0.3)",
        }}
        title={hasSelection ? "Ask Claudia to transform selected text" : "Select text to use AI assist"}
      >
        {loading
          ? <Loader2 className="w-3 h-3 animate-spin" />
          : <Sparkles className="w-3 h-3" />}
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
              border: "1px solid rgba(200,144,10,0.2)",
              boxShadow: "0 16px 40px rgba(0,0,0,0.7)",
              minWidth: "140px",
            }}
          >
            {MODES.map((m) => (
              <button
                key={m.key}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleMode(m.key)}
                className="w-full flex items-center px-3 py-2 text-xs text-left transition-colors"
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
