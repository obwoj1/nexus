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

  const editor = useCreateBlockNote({
    initialContent: initialContent.length > 0 ? initialContent : undefined,
  });

  const scheduleSave = useCallback(
    (newTitle: string, content: Block[]) => {
      setSaveStatus("unsaved");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSaveStatus("saving");
        await saveNoteAction({ id: noteId, title: newTitle, content });
        setSaveStatus("saved");
      }, 1000);
    },
    [noteId]
  );

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setTitle(val);
    onTitleChange(val);
    scheduleSave(val, editor.document as Block[]);
  }

  function handleEditorChange() {
    scheduleSave(title, editor.document as Block[]);
  }

  useEffect(() => {
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, []);

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
        <BlockNoteView
          editor={editor}
          onChange={handleEditorChange}
          theme="dark"
        />
      </div>
    </div>
  );
}
