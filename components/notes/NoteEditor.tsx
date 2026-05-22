"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AIAssist } from "./AIAssist";
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
}

export function NoteEditor({ noteId, initialTitle, initialContent, onTitleChange }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef(initialTitle);
  const pendingContentRef = useRef<Block[] | null>(null);
  const isLoadingRef = useRef(true);

  const editor = useCreateBlockNote();

  // Load saved content imperatively after mount
  useEffect(() => {
    const t = setTimeout(() => {
      if (initialContent.length > 0) {
        try {
          editor.replaceBlocks(editor.document, initialContent as PartialBlock[]);
        } catch (e) {
          console.error("[NoteEditor] replaceBlocks failed:", e);
        }
      }
      isLoadingRef.current = false;
    }, 0);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scheduleSave = useCallback(
    (newTitle: string, content: Block[]) => {
      setSaveStatus("unsaved");
      pendingContentRef.current = content;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        pendingContentRef.current = null;
        setSaveStatus("saving");
        const result = await saveNoteAction({ id: noteId, title: newTitle, content });
        if (!result.success) {
          console.error("[NoteEditor] save failed:", result.error);
          setSaveStatus("unsaved");
        } else {
          setSaveStatus("saved");
          // Sync the Next.js router cache so navigating away and back shows fresh data
          router.refresh();
        }
      }, 500);
    },
    [noteId, router]
  );

  useEffect(() => {
    const unsubscribe = editor.onChange(() => {
      if (isLoadingRef.current) return;
      scheduleSave(titleRef.current, editor.document as Block[]);
    });
    return unsubscribe;
  }, [editor, scheduleSave]);

  const noteIdRef = useRef(noteId);
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (pendingContentRef.current !== null) {
        saveNoteAction({
          id: noteIdRef.current,
          title: titleRef.current,
          content: pendingContentRef.current,
        });
      }
    };
  }, []);

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setTitle(val);
    titleRef.current = val;
    onTitleChange(val);
    scheduleSave(val, editor.document as Block[]);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-12 pt-10 pb-2">
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="Untitled"
          className="w-full text-3xl font-semibold tracking-tight bg-transparent border-none outline-none placeholder:opacity-20"
          style={{ color: "#F5F0E8" }}
        />
      </div>

      <div className="px-12 mb-4 flex items-center gap-3">
        <span className="text-xs" style={{
          color: saveStatus === "saved"
            ? "rgba(74,222,128,0.5)"
            : saveStatus === "saving"
            ? "rgba(245,240,232,0.3)"
            : "rgba(200,144,10,0.5)",
        }}>
          {saveStatus === "saved" ? "Saved" : saveStatus === "saving" ? "Saving…" : "Unsaved changes"}
        </span>
        <AIAssist editor={editor} />
      </div>

      <div className="flex-1 px-8 overflow-y-auto blocknote-nexus">
        <BlockNoteView editor={editor} theme={nexusTheme} />
      </div>
    </div>
  );
}
