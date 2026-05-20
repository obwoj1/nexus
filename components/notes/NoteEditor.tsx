"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { saveNoteAction } from "@/app/actions/notes";
import type { Block, PartialBlock } from "@blocknote/core";

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
  // Keeps current title/content accessible in unmount flush and subscription (avoids stale closures)
  const titleRef = useRef(initialTitle);
  const pendingContentRef = useRef<Block[] | null>(null);

  // Create editor with no initial content — we load content imperatively below
  const editor = useCreateBlockNote();

  // Load saved content into editor after mount — replaceBlocks is more reliable than initialContent prop
  useEffect(() => {
    if (initialContent.length > 0) {
      try {
        editor.replaceBlocks(editor.document, initialContent as PartialBlock[]);
      } catch (e) {
        console.error("[NoteEditor] replaceBlocks failed:", e);
      }
    }
  // Run once on mount only — editor and initialContent are stable references
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
        }
      }, 500);
    },
    [noteId]
  );

  // Subscribe to editor content changes
  useEffect(() => {
    const unsubscribe = editor.onChange(() => {
      scheduleSave(titleRef.current, editor.document as Block[]);
    });
    return unsubscribe;
  }, [editor, scheduleSave]);

  // Flush any pending save on unmount (e.g. navigating away before debounce fires)
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
