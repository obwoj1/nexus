"use client";

import { useState } from "react";
import { NotesList, type NoteItem } from "./NotesList";
import { NoteEditor } from "./NoteEditor";
import { FileText } from "lucide-react";
import type { Block } from "@blocknote/core";

interface NoteWithContent extends NoteItem {
  content: Block[];
}

interface Props {
  initialNotes: NoteItem[];
  noteContents: Record<string, Block[]>;
}

export function NotesShell({ initialNotes, noteContents }: Props) {
  const [activeId, setActiveId] = useState<string | null>(
    initialNotes[0]?.id ?? null
  );
  const [titleMap, setTitleMap] = useState<Record<string, string>>(
    Object.fromEntries(initialNotes.map((n) => [n.id, n.title]))
  );
  const [contentMap] = useState<Record<string, Block[]>>(noteContents);

  function handleCreated(id: string) {
    setTitleMap((prev) => ({ ...prev, [id]: "Untitled" }));
    setActiveId(id);
  }

  function handleDeleted(id: string) {
    setTitleMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (activeId === id) setActiveId(null);
  }

  function handleTitleChange(title: string) {
    if (!activeId) return;
    setTitleMap((prev) => ({ ...prev, [activeId]: title }));
  }

  const activeContent = activeId ? (contentMap[activeId] ?? []) : [];
  const activeTitle = activeId ? (titleMap[activeId] ?? "Untitled") : "Untitled";

  return (
    <div className="flex flex-1 h-full overflow-hidden">
      {/* Sidebar */}
      <div className="w-[240px] shrink-0 flex flex-col">
        <NotesList
          notes={initialNotes}
          activeId={activeId}
          onSelect={setActiveId}
          onCreated={handleCreated}
          onDeleted={handleDeleted}
          onTitleUpdate={(id, title) => setTitleMap((prev) => ({ ...prev, [id]: title }))}
        />
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        {activeId ? (
          <NoteEditor
            key={activeId}
            noteId={activeId}
            initialTitle={activeTitle}
            initialContent={activeContent}
            onTitleChange={handleTitleChange}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <FileText className="w-10 h-10" style={{ color: "rgba(245,240,232,0.1)" }} />
            <p className="text-sm" style={{ color: "rgba(245,240,232,0.25)" }}>
              Select a note or create a new one
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
