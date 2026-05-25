"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCreateBlockNote, useEditorChange } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import type { Theme } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { saveNoteAction } from "@/app/actions/notes";
import type { Block, PartialBlock } from "@blocknote/core";
import { Save, Check, Loader2 } from "lucide-react";

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
  const [title, setTitle] = useState(initialTitle);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef(initialTitle);
  const isLoadingRef = useRef(true);
  const dirtyRef = useRef(false);
  const noteIdRef = useRef(noteId);

  const editor = useCreateBlockNote();

  // Load saved content after mount
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
      dirtyRef.current = true;
      setSaveStatus("unsaved");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSaveStatus("saving");
        const result = await saveNoteAction({ id: noteId, title: newTitle, content });
        if (!result.success) {
          setSaveStatus("unsaved");
        } else {
          dirtyRef.current = false;
          setSaveStatus("saved");
        }
      }, 1500);
    },
    [noteId]
  );

  // Proper BlockNote React hook for content change — fires reliably
  useEditorChange(() => {
    if (isLoadingRef.current) return;
    scheduleSave(titleRef.current, editor.document as Block[]);
  }, editor);

  // Manual save — immediate, no debounce
  async function handleManualSave() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus("saving");
    const result = await saveNoteAction({
      id: noteId,
      title: titleRef.current,
      content: editor.document as Block[],
    });
    if (result.success) {
      dirtyRef.current = false;
      setSaveStatus("saved");
    } else {
      setSaveStatus("unsaved");
    }
  }

  // On unmount, flush any pending save
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (dirtyRef.current) {
        void saveNoteAction({
          id: noteIdRef.current,
          title: titleRef.current,
          content: editor.document as Block[],
        });
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setTitle(val);
    titleRef.current = val;
    onTitleChange(val);
    scheduleSave(val, editor.document as Block[]);
  }

  const isSaved = saveStatus === "saved";
  const isSaving = saveStatus === "saving";

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 md:px-12 pt-8 md:pt-10 pb-2">
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="Untitled"
          className="w-full text-2xl md:text-3xl font-semibold tracking-tight bg-transparent border-none outline-none placeholder:opacity-20"
          style={{ color: "#F5F0E8" }}
        />
      </div>

      {/* Save bar */}
      <div className="flex items-center justify-between px-6 md:px-12 mb-4">
        <span className="text-xs" style={{
          color: isSaved
            ? "rgba(74,222,128,0.5)"
            : isSaving
            ? "rgba(245,240,232,0.3)"
            : "rgba(200,144,10,0.6)",
        }}>
          {isSaved ? "All changes saved" : isSaving ? "Saving…" : "Unsaved changes"}
        </span>

        <button
          onClick={handleManualSave}
          disabled={isSaving || isSaved}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all disabled:opacity-40"
          style={{
            background: isSaved ? "rgba(74,222,128,0.08)" : "rgba(200,144,10,0.12)",
            border: isSaved ? "1px solid rgba(74,222,128,0.2)" : "1px solid rgba(200,144,10,0.3)",
            color: isSaved ? "rgba(74,222,128,0.7)" : "#C8900A",
          }}
        >
          {isSaving
            ? <><Loader2 className="w-3 h-3 animate-spin" /> Saving</>
            : isSaved
            ? <><Check className="w-3 h-3" /> Saved</>
            : <><Save className="w-3 h-3" /> Save</>
          }
        </button>
      </div>

      <div className="flex-1 px-2 md:px-8 overflow-y-auto blocknote-nexus">
        <BlockNoteView editor={editor} theme={nexusTheme} />
      </div>
    </div>
  );
}
