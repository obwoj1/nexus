"use client";

import { useEffect, useRef, useState } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import type { Theme } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { saveNoteAction } from "@/app/actions/notes";
import type { Block, PartialBlock } from "@blocknote/core";
import { Save, Check, Loader2, AlertCircle } from "lucide-react";

const nexusTheme: Theme = {
  colors: {
    editor:   { text: "#F5F0E8",               background: "transparent" },
    menu:     { text: "#F5F0E8",               background: "#0D0C0A" },
    tooltip:  { text: "rgba(245,240,232,0.8)", background: "#111111" },
    hovered:  { text: "#F5F0E8",               background: "rgba(200,144,10,0.12)" },
    selected: { text: "#F5F0E8",               background: "rgba(200,144,10,0.20)" },
    disabled: { text: "rgba(245,240,232,0.3)", background: "transparent" },
    shadow: "rgba(0,0,0,0.65)",
    border: "rgba(200,144,10,0.18)",
    sideMenu: "rgba(245,240,232,0.25)",
    highlights: {
      gray:   { text: "#9E9E9E", background: "rgba(158,158,158,0.12)" },
      brown:  { text: "#A1887F", background: "rgba(161,136,127,0.12)" },
      red:    { text: "#EF5350", background: "rgba(239,83,80,0.12)" },
      orange: { text: "#FFA726", background: "rgba(255,167,38,0.12)" },
      yellow: { text: "#F5CE58", background: "rgba(245,206,88,0.12)" },
      green:  { text: "#66BB6A", background: "rgba(102,187,106,0.12)" },
      blue:   { text: "#42A5F5", background: "rgba(66,165,245,0.12)" },
      purple: { text: "#AB47BC", background: "rgba(171,71,188,0.12)" },
      pink:   { text: "#EC407A", background: "rgba(236,64,122,0.12)" },
    },
  },
  borderRadius: 8,
  fontFamily: "'Geist Sans', system-ui, sans-serif",
};

interface Props {
  noteId: string;
  initialTitle: string;
  initialContent: Block[];
  onTitleChange: (title: string) => void;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function NoteEditor({ noteId, initialTitle, initialContent, onTitleChange }: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const titleRef = useRef(initialTitle);
  const noteIdRef = useRef(noteId);
  // contentRef is updated on every editor change — always holds latest blocks
  const contentRef = useRef<Block[]>(initialContent);

  const editor = useCreateBlockNote();

  // Load existing content into the editor after mount
  useEffect(() => {
    const t = setTimeout(() => {
      if (initialContent.length > 0) {
        try {
          editor.replaceBlocks(editor.document, initialContent as PartialBlock[]);
          contentRef.current = initialContent;
        } catch (e) {
          console.error("[NoteEditor] replaceBlocks failed:", e);
        }
      }
    }, 0);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cmd+S / Ctrl+S
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        void doSave();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function doSave() {
    setStatus("saving");
    const result = await saveNoteAction({
      id: noteIdRef.current,
      title: titleRef.current,
      content: contentRef.current,   // always up-to-date via onChange
    });
    if (result.success) {
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2500);
    } else {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setTitle(val);
    titleRef.current = val;
    onTitleChange(val);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header row: title + save button */}
      <div className="flex items-start gap-4 px-6 md:px-12 pt-8 md:pt-10 pb-3 shrink-0">
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="Untitled"
          className="flex-1 text-2xl md:text-3xl font-semibold tracking-tight bg-transparent border-none outline-none placeholder:opacity-20"
          style={{ color: "#F5F0E8" }}
        />

        <button
          onClick={doSave}
          disabled={status === "saving"}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold shrink-0 transition-all disabled:opacity-60"
          style={{
            background: status === "saved"  ? "rgba(74,222,128,0.12)"
                      : status === "error"  ? "rgba(248,113,113,0.1)"
                      : "rgba(200,144,10,0.15)",
            border:     status === "saved"  ? "1px solid rgba(74,222,128,0.3)"
                      : status === "error"  ? "1px solid rgba(248,113,113,0.3)"
                      : "1px solid rgba(200,144,10,0.4)",
            color:      status === "saved"  ? "#4ADE80"
                      : status === "error"  ? "#F87171"
                      : "#C8900A",
          }}
        >
          {status === "saving" && <><Loader2 className="w-4 h-4 animate-spin" />Saving…</>}
          {status === "saved"  && <><Check   className="w-4 h-4" />Saved</>}
          {status === "error"  && <><AlertCircle className="w-4 h-4" />Failed — retry</>}
          {status === "idle"   && <><Save    className="w-4 h-4" />Save</>}
        </button>
      </div>

      <p className="px-6 md:px-12 text-[10px] mb-3 shrink-0" style={{ color: "rgba(245,240,232,0.18)" }}>
        ⌘S to save
      </p>

      <div className="flex-1 px-2 md:px-8 overflow-y-auto blocknote-nexus">
        <BlockNoteView
          editor={editor}
          theme={nexusTheme}
          onChange={() => {
            // Keep contentRef in sync on every keystroke
            contentRef.current = editor.document as Block[];
          }}
        />
      </div>
    </div>
  );
}
