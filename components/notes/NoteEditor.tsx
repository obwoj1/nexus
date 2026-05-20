"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { saveNoteAction } from "@/app/actions/notes";
import type { Block } from "@blocknote/core";

interface Props {
  noteId: string;
  initialTitle: string;
  initialContent: Block[];
  onTitleChange: (title: string) => void;
}

export function NoteEditor({ noteId, initialTitle, initialContent, onTitleChange }: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keeps current title/content accessible in unmount flush (avoids stale closures)
  const titleRef = useRef(initialTitle);
  const pendingContentRef = useRef<Block[] | null>(null);

  // Log what content this note is mounting with — remove once save is verified
  useEffect(() => {
    console.log(`[NoteEditor] mounted note ${noteId}, initialContent blocks:`, initialContent.length, initialContent);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editor = useCreateBlockNote({
    initialContent: initialContent.length > 0 ? (initialContent as any) : undefined,
  });

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
          console.error("[NoteEditor] save failed:", result.error, "content length:", content.length);
          setSaveStatus("unsaved");
        } else {
          setSaveStatus("saved");
        }
      }, 500);
    },
    [noteId]
  );

  // Subscribe to editor content changes — more reliable than the onChange prop in v0.51.x
  useEffect(() => {
    const unsubscribe = editor.onChange(() => {
      scheduleSave(titleRef.current, editor.document as Block[]);
    });
    return unsubscribe;
  }, [editor, scheduleSave]);

  // Flush any pending save when component unmounts (e.g. page refresh or note switch)
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
      {/* Title */}
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

      {/* DEBUG — remove after save is verified */}
      <div className="px-12 mb-1">
        <span className="text-[10px] font-mono" style={{ color: "rgba(245,240,232,0.3)" }}>
          [debug] initialContent blocks: {initialContent.length}
        </span>
      </div>

      {/* Save status */}
      <div className="px-12 mb-4">
        <span className="text-xs" style={{
          color: saveStatus === "saved"
            ? "rgba(74,222,128,0.5)"
            : saveStatus === "saving"
            ? "rgba(245,240,232,0.3)"
            : "rgba(200,144,10,0.5)",
        }}>
          {saveStatus === "saved" ? "Saved" : saveStatus === "saving" ? "Saving…" : "Unsaved changes"}
        </span>
      </div>

      {/* BlockNote editor */}
      <div className="flex-1 px-8 overflow-y-auto blocknote-nexus">
        <BlockNoteView editor={editor} theme="dark" />
      </div>
    </div>
  );
}
