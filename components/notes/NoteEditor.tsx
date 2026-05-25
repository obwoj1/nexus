"use client";

import { useEffect, useRef, useState } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import type { Theme } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { saveNoteAction } from "@/app/actions/notes";
import type { Block, PartialBlock } from "@blocknote/core";

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
  onSaved: (content: Block[]) => void;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

const DEBOUNCE_MS = 1500;

export function NoteEditor({ noteId, initialTitle, initialContent, onTitleChange, onSaved }: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const titleRef = useRef(initialTitle);
  const noteIdRef = useRef(noteId);
  const contentRef = useRef<Block[]>(initialContent);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useCreateBlockNote();

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

    const unsub = editor.onChange(() => {
      contentRef.current = editor.document as Block[];
      scheduleSave();
    });

    return () => {
      clearTimeout(t);
      unsub();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function scheduleSave() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void doSave(), DEBOUNCE_MS);
  }

  async function doSave() {
    setStatus("saving");
    const content = contentRef.current;
    const result = await saveNoteAction({
      id: noteIdRef.current,
      title: titleRef.current,
      content,
    });
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    if (result.success) {
      onSaved(content);
      setStatus("saved");
      statusTimerRef.current = setTimeout(() => setStatus("idle"), 2000);
    } else {
      setStatus("error");
      statusTimerRef.current = setTimeout(() => setStatus("idle"), 3000);
    }
  }

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setTitle(val);
    titleRef.current = val;
    onTitleChange(val);
    scheduleSave();
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-end gap-3 px-6 md:px-12 pt-8 md:pt-10 pb-4 shrink-0">
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="Untitled"
          className="flex-1 text-2xl md:text-3xl font-semibold tracking-tight bg-transparent border-none outline-none placeholder:opacity-20"
          style={{ color: "#F5F0E8" }}
        />

        {/* Subtle auto-save status — no button needed */}
        <span
          className="text-[10px] font-medium shrink-0 pb-1 transition-opacity duration-300"
          style={{
            color:   status === "saved"  ? "#4ADE80"
                   : status === "error"  ? "#F87171"
                   : "rgba(245,240,232,0.2)",
            opacity: status === "idle" ? 0 : 1,
          }}
        >
          {status === "saving" && "Saving…"}
          {status === "saved"  && "Saved"}
          {status === "error"  && "Failed to save"}
        </span>
      </div>

      <div className="flex-1 px-2 md:px-8 overflow-y-auto blocknote-nexus">
        <BlockNoteView
          editor={editor}
          theme={nexusTheme}
        />
      </div>
    </div>
  );
}
