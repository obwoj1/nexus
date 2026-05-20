"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pin, Trash2, FileText, Loader2 } from "lucide-react";
import { createNoteAction, deleteNoteAction, togglePinAction } from "@/app/actions/notes";
import { formatDistanceToNow } from "date-fns";

export interface NoteItem {
  id: string;
  title: string;
  is_pinned: boolean;
  updated_at: string;
}

interface Props {
  notes: NoteItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreated: (id: string) => void;
  onDeleted: (id: string) => void;
  onTitleUpdate: (id: string, title: string) => void;
}

export function NotesList({ notes: initial, activeId, onSelect, onCreated, onDeleted, onTitleUpdate }: Props) {
  const [notes, setNotes] = useState(initial);
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    startTransition(async () => {
      const res = await createNoteAction();
      if ("id" in res) {
        const newNote: NoteItem = {
          id: res.id,
          title: "Untitled",
          is_pinned: false,
          updated_at: new Date().toISOString(),
        };
        setNotes((prev) => [newNote, ...prev]);
        onCreated(res.id);
      }
    });
  }

  function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    startTransition(async () => {
      await deleteNoteAction(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      onDeleted(id);
    });
  }

  function handlePin(id: string, pinned: boolean, e: React.MouseEvent) {
    e.stopPropagation();
    startTransition(async () => {
      await togglePinAction(id, !pinned);
      setNotes((prev) =>
        prev.map((n) => n.id === id ? { ...n, is_pinned: !pinned } : n)
      );
    });
  }

  // Keep titles in sync when editor changes them
  function updateTitle(id: string, title: string) {
    setNotes((prev) => prev.map((n) => n.id === id ? { ...n, title } : n));
    onTitleUpdate(id, title);
  }

  // Expose updateTitle so parent can call it
  (NotesList as unknown as { _updateTitle: typeof updateTitle })._updateTitle = updateTitle;

  const pinned = notes.filter((n) => n.is_pinned);
  const unpinned = notes.filter((n) => !n.is_pinned);

  function NoteRow({ note }: { note: NoteItem }) {
    const isActive = note.id === activeId;
    return (
      <motion.div
        layout
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -8 }}
        onClick={() => onSelect(note.id)}
        className="group flex items-start gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-colors duration-150"
        style={{
          background: isActive ? "rgba(200,144,10,0.1)" : "transparent",
          border: isActive ? "1px solid rgba(200,144,10,0.2)" : "1px solid transparent",
        }}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full"
            style={{ background: "linear-gradient(180deg, #C8900A, #F5CE58)" }} />
        )}
        <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0"
          style={{ color: isActive ? "#C8900A" : "rgba(245,240,232,0.3)" }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm truncate"
            style={{ color: isActive ? "#F5F0E8" : "rgba(245,240,232,0.6)", fontWeight: isActive ? 500 : 400 }}>
            {note.title || "Untitled"}
          </p>
          <p className="text-[10px] mt-0.5"
            style={{ color: "rgba(245,240,232,0.25)" }}>
            {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
          </p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => handlePin(note.id, note.is_pinned, e)}
            className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/10 transition-colors"
            title={note.is_pinned ? "Unpin" : "Pin"}>
            <Pin className="w-3 h-3"
              style={{ color: note.is_pinned ? "#C8900A" : "rgba(245,240,232,0.3)" }} />
          </button>
          <button onClick={(e) => handleDelete(note.id, e)}
            className="w-5 h-5 rounded flex items-center justify-center hover:bg-red-500/10 transition-colors"
            title="Delete">
            <Trash2 className="w-3 h-3" style={{ color: "rgba(248,113,113,0.5)" }} />
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ borderRight: "1px solid rgba(255,235,180,0.07)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4"
        style={{ borderBottom: "1px solid rgba(255,235,180,0.07)" }}>
        <p className="text-xs tracking-widest uppercase font-medium"
          style={{ color: "rgba(245,240,232,0.4)" }}>Notes</p>
        <button
          onClick={handleCreate}
          disabled={isPending}
          className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors hover:bg-[rgba(200,144,10,0.15)] disabled:opacity-40"
          style={{ border: "1px solid rgba(200,144,10,0.2)" }}
          title="New note"
        >
          {isPending
            ? <Loader2 className="w-3 h-3 animate-spin" style={{ color: "#C8900A" }} />
            : <Plus className="w-3 h-3" style={{ color: "#C8900A" }} />}
        </button>
      </div>

      {/* Notes */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <FileText className="w-5 h-5" style={{ color: "rgba(245,240,232,0.15)" }} />
            <p className="text-xs text-center" style={{ color: "rgba(245,240,232,0.25)" }}>
              No notes yet
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {pinned.length > 0 && (
              <>
                <p className="text-[9px] tracking-widest uppercase px-3 mb-1 mt-1"
                  style={{ color: "rgba(200,144,10,0.5)" }}>Pinned</p>
                {pinned.map((n) => <NoteRow key={n.id} note={n} />)}
                {unpinned.length > 0 && (
                  <div className="my-2 mx-3 h-px" style={{ background: "rgba(255,235,180,0.06)" }} />
                )}
              </>
            )}
            {unpinned.map((n) => <NoteRow key={n.id} note={n} />)}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
