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
  const [selectedText, setSelectedText] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track text selection via BlockNote's selection change event
  useEffect(() => {
    const unsubscribe = editor.onSelectionChange(() => {
      const { state } = editor._tiptapEditor;
      const { from, to } = state.selection;
      if (from === to) {
        setSelectedText("");
        setOpen(false);
      } else {
        const text = state.doc.textBetween(from, to, " ");
        setSelectedText(text.trim());
      }
    });
    return unsubscribe;
  }, [editor]);

  // Close dropdown on outside click
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
    if (!selectedText) return;
    setLoading(true);
    setActiveMode(mode);
    setOpen(false);

    const { result, error } = await aiAssistAction(selectedText, mode);

    if (error || !result) {
      console.error("[AIAssist]", error);
    } else {
      // Replace selected text with Claudia's response
      editor._tiptapEditor.commands.insertContent(result);
    }

    setLoading(false);
    setActiveMode(null);
    setSelectedText("");
  }

  const hasSelection = selectedText.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <button
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
