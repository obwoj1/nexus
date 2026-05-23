"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { NotesList, type NoteItem } from "./NotesList";
import { getNoteContentAction } from "@/app/actions/notes";

const NoteEditor = dynamic(
  () => import("./NoteEditor").then((m) => m.NoteEditor),
  { ssr: false, loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="w-5 h-5 rounded-full border-2 animate-spin"
        style={{ borderColor: "rgba(200,144,10,0.4)", borderTopColor: "transparent" }} />
    </div>
  )}
);
import { FileText, ChevronLeft } from "lucide-react";
import type { Block } from "@blocknote/core";

interface Props {
  initialNotes: NoteItem[];
  initialContents: Record<string, Block[]>;
  journalId: string | null;
  timezone: string;
}

export function NotesShell({ initialNotes, initialContents, journalId, timezone }: Props) {
  const [activeId, setActiveId] = useState<string | null>(
    journalId ?? initialNotes[0]?.id ?? null
  );
  const [mobileView, setMobileView] = useState<"list" | "editor">(
    (journalId ?? initialNotes[0]?.id) ? "editor" : "list"
  );
  const [titleMap, setTitleMap] = useState<Record<string, string>>(
    Object.fromEntries(initialNotes.map((n) => [n.id, n.title]))
  );
  // contentMap: key present = loaded (value may be []); key absent = not yet fetched
  const [contentMap, setContentMap] = useState<Record<string, Block[]>>(initialContents);
  const [contentLoading, setContentLoading] = useState(false);

  async function handleSelect(id: string) {
    if (id === activeId && contentMap[id] !== undefined) {
      setMobileView("editor");
      return;
    }
    setActiveId(id);
    setMobileView("editor");
    if (contentMap[id] === undefined) {
      setContentLoading(true);
      const content = await getNoteContentAction(id);
      setContentMap((prev) => ({ ...prev, [id]: content }));
      setContentLoading(false);
    }
  }

  function handleCreated(id: string) {
    setTitleMap((prev) => ({ ...prev, [id]: "Untitled" }));
    setContentMap((prev) => ({ ...prev, [id]: [] }));
    setActiveId(id);
    setMobileView("editor");
  }

  function handleDeleted(id: string) {
    setTitleMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setContentMap((prev) => {
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

  const activeContent = activeId !== null ? (contentMap[activeId] ?? null) : null;
  const activeTitle = activeId ? (titleMap[activeId] ?? "Untitled") : "Untitled";
  // Only render editor once content is ready (null = still loading)
  const editorReady = activeId !== null && activeContent !== null && !contentLoading;

  return (
    <div className="flex flex-1 h-full overflow-hidden">
      {/* Sidebar — full-width on mobile when in list view, hidden otherwise */}
      <div className={`shrink-0 flex flex-col
        w-full md:w-[240px]
        ${mobileView === "editor" ? "hidden md:flex" : "flex"}
      `}>
        <NotesList
          notes={initialNotes}
          activeId={activeId}
          titleOverride={titleMap}
          todayJournalId={journalId}
          timezone={timezone}
          onSelect={handleSelect}
          onCreated={handleCreated}
          onDeleted={handleDeleted}
          onTitleUpdate={(id, title) => setTitleMap((prev) => ({ ...prev, [id]: title }))}
        />
      </div>

      {/* Editor area — full-width on mobile when in editor view, hidden otherwise */}
      <div className={`flex-1 overflow-hidden flex flex-col
        ${mobileView === "list" ? "hidden md:flex" : "flex"}
      `}>
        {/* Mobile back button */}
        <div className="md:hidden shrink-0 px-3 pt-3">
          <button
            onClick={() => setMobileView("list")}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-xl"
            style={{ color: "rgba(200,144,10,0.8)", background: "rgba(200,144,10,0.08)", border: "1px solid rgba(200,144,10,0.15)" }}>
            <ChevronLeft className="w-3.5 h-3.5" />
            All Notes
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          {contentLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-5 h-5 rounded-full border-2 animate-spin"
                style={{ borderColor: "rgba(200,144,10,0.4)", borderTopColor: "transparent" }} />
            </div>
          ) : editorReady ? (
            <NoteEditor
              key={activeId}
              noteId={activeId!}
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
    </div>
  );
}
