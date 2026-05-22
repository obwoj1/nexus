"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pin, Trash2, FileText, BookOpen, Loader2, Search, ChevronDown, Globe } from "lucide-react";
import { createNoteAction, deleteNoteAction, togglePinAction } from "@/app/actions/notes";
import { saveTimezoneAction } from "@/app/actions/timezone";
import { formatDistanceToNow } from "date-fns";

export interface NoteItem {
  id: string;
  title: string;
  is_pinned: boolean;
  updated_at: string;
}

const TIMEZONES = [
  { value: "America/New_York",    label: "Eastern (EST/EDT)" },
  { value: "America/Chicago",     label: "Central (CST/CDT)" },
  { value: "America/Denver",      label: "Mountain (MST/MDT)" },
  { value: "America/Los_Angeles", label: "Pacific (PST/PDT)" },
  { value: "Europe/London",       label: "London (GMT/BST)" },
  { value: "Europe/Paris",        label: "Paris (CET/CEST)" },
  { value: "Asia/Dubai",          label: "Dubai (GST)" },
  { value: "Asia/Kolkata",        label: "India (IST)" },
  { value: "Asia/Tokyo",          label: "Tokyo (JST)" },
  { value: "Pacific/Auckland",    label: "Auckland (NZST)" },
];

function tzAbbr(tz: string) {
  return (
    new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")?.value ?? tz
  );
}

// Identify journal notes by title pattern — no DB column required
function isJournalNote(title: string) {
  return (
    title.startsWith("Journal — ") || // old format
    /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s/.test(title) // new format
  );
}

interface Props {
  notes: NoteItem[];
  activeId: string | null;
  titleOverride?: Record<string, string>;
  todayJournalId?: string | null;
  timezone: string;
  onSelect: (id: string) => void;
  onCreated: (id: string) => void;
  onDeleted: (id: string) => void;
  onTitleUpdate: (id: string, title: string) => void;
}

export function NotesList({
  notes: initial,
  activeId,
  titleOverride,
  todayJournalId,
  timezone,
  onSelect,
  onCreated,
  onDeleted,
}: Props) {
  const router = useRouter();
  const [notes, setNotes] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [journalOpen, setJournalOpen] = useState(true);
  const [tzPickerOpen, setTzPickerOpen] = useState(false);
  const [currentTz, setCurrentTz] = useState(timezone);

  function handleCreate() {
    startTransition(async () => {
      const res = await createNoteAction();
      if ("error" in res) { console.error("Failed to create note:", res.error); return; }
      const newNote: NoteItem = {
        id: res.id,
        title: "Untitled",
        is_pinned: false,
        updated_at: new Date().toISOString(),
      };
      setNotes((prev) => [newNote, ...prev]);
      onCreated(res.id);
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
      setNotes((prev) => prev.map((n) => n.id === id ? { ...n, is_pinned: !pinned } : n));
    });
  }

  async function handleTimezoneChange(tz: string) {
    setCurrentTz(tz);
    setTzPickerOpen(false);
    await saveTimezoneAction(tz);
    router.refresh(); // re-runs the server page → creates today's journal in new timezone
  }

  const [recentOpen, setRecentOpen] = useState(false);

  // Today's entry
  const journalNotes = notes.filter((n) => n.id === todayJournalId);
  // Past journal entries — last 7, excluding today
  const recentJournalNotes = notes
    .filter((n) => isJournalNote(titleOverride?.[n.id] ?? n.title) && n.id !== todayJournalId)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 7);

  const q = search.toLowerCase();
  // Regular notes = everything except journal entries (identified by title pattern)
  const regularNotes = notes
    .filter((n) => !isJournalNote(titleOverride?.[n.id] ?? n.title))
    .filter((n) => (titleOverride?.[n.id] ?? n.title).toLowerCase().includes(q));
  const pinned = regularNotes.filter((n) => n.is_pinned);
  const unpinned = regularNotes.filter((n) => !n.is_pinned);

  function NoteRow({ note, isJournal = false }: { note: NoteItem; isJournal?: boolean }) {
    const isActive = note.id === activeId;
    const displayTitle = (titleOverride?.[note.id] ?? note.title) || "Untitled";
    return (
      <motion.div
        layout
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -8 }}
        onClick={() => onSelect(note.id)}
        className="relative group flex items-start gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-colors duration-150"
        style={{
          background: isActive ? "rgba(200,144,10,0.1)" : "transparent",
          border: isActive ? "1px solid rgba(200,144,10,0.2)" : "1px solid transparent",
        }}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full"
            style={{ background: "linear-gradient(180deg, #C8900A, #F5CE58)" }} />
        )}
        {isJournal
          ? <BookOpen className="w-3.5 h-3.5 mt-0.5 shrink-0"
              style={{ color: isActive ? "#C8900A" : "rgba(245,240,232,0.3)" }} />
          : <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0"
              style={{ color: isActive ? "#C8900A" : "rgba(245,240,232,0.3)" }} />}
        <div className="flex-1 min-w-0">
          <p className="text-sm truncate"
            style={{ color: isActive ? "#F5F0E8" : "rgba(245,240,232,0.6)", fontWeight: isActive ? 500 : 400 }}>
            {displayTitle}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: "rgba(245,240,232,0.25)" }}>
            {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
          </p>
        </div>
        {!isJournal && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={(e) => handlePin(note.id, note.is_pinned, e)}
              className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/10 transition-colors"
              title={note.is_pinned ? "Unpin" : "Pin"}>
              <Pin className="w-3 h-3" style={{ color: note.is_pinned ? "#C8900A" : "rgba(245,240,232,0.3)" }} />
            </button>
            <button onClick={(e) => handleDelete(note.id, e)}
              className="w-5 h-5 rounded flex items-center justify-center hover:bg-red-500/10 transition-colors"
              title="Delete">
              <Trash2 className="w-3 h-3" style={{ color: "rgba(248,113,113,0.5)" }} />
            </button>
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ borderRight: "1px solid rgba(255,235,180,0.07)" }}>

      {/* ── JOURNAL SECTION ── */}
      <div>
        {/* Journal header row */}
        <div className="flex items-center px-3 py-3 gap-1"
          style={{ borderBottom: journalOpen ? "none" : "1px solid rgba(255,235,180,0.07)" }}>
          <button
            onClick={() => setJournalOpen((v) => !v)}
            className="flex-1 flex items-center gap-2 text-left"
          >
            <BookOpen className="w-3 h-3 shrink-0" style={{ color: "rgba(200,144,10,0.7)" }} />
            <p className="text-[10px] tracking-widest uppercase font-semibold"
              style={{ color: "rgba(200,144,10,0.7)" }}>Journal</p>
            <ChevronDown
              className="w-3 h-3 transition-transform duration-200"
              style={{
                color: "rgba(245,240,232,0.3)",
                transform: journalOpen ? "rotate(0deg)" : "rotate(-90deg)",
              }}
            />
          </button>

          {/* Today button */}
          {todayJournalId && (
            <button
              onClick={() => onSelect(todayJournalId)}
              className="px-2 py-0.5 rounded text-[9px] font-semibold tracking-wider uppercase transition-colors"
              style={{
                background: activeId === todayJournalId ? "rgba(200,144,10,0.2)" : "rgba(200,144,10,0.08)",
                border: "1px solid rgba(200,144,10,0.25)",
                color: "#C8900A",
              }}
              title="Open today's journal entry"
            >
              Today
            </button>
          )}

          {/* Timezone picker */}
          <div className="relative">
            <button
              onClick={() => setTzPickerOpen((v) => !v)}
              className="w-6 h-6 rounded flex items-center justify-center transition-colors hover:bg-white/5"
              title={`Journal timezone: ${currentTz}`}
            >
              <Globe className="w-3 h-3" style={{ color: "rgba(245,240,232,0.25)" }} />
            </button>

            <AnimatePresence>
              {tzPickerOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.12 }}
                  className="absolute left-0 top-full mt-1 z-50 rounded-xl overflow-hidden"
                  style={{
                    background: "#0D0C0A",
                    border: "1px solid rgba(200,144,10,0.2)",
                    boxShadow: "0 16px 40px rgba(0,0,0,0.7)",
                    minWidth: "200px",
                  }}
                >
                  <div className="px-3 py-2 border-b" style={{ borderColor: "rgba(255,235,180,0.08)" }}>
                    <p className="text-[9px] tracking-widest uppercase font-semibold"
                      style={{ color: "rgba(245,240,232,0.35)" }}>
                      Journal timezone · {tzAbbr(currentTz)}
                    </p>
                  </div>
                  {TIMEZONES.map((tz) => (
                    <button
                      key={tz.value}
                      onClick={() => handleTimezoneChange(tz.value)}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors"
                      style={{
                        color: currentTz === tz.value ? "#C8900A" : "rgba(245,240,232,0.7)",
                        background: currentTz === tz.value ? "rgba(200,144,10,0.08)" : "transparent",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(200,144,10,0.1)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background =
                        currentTz === tz.value ? "rgba(200,144,10,0.08)" : "transparent")}
                    >
                      {tz.label}
                      {currentTz === tz.value && (
                        <span className="text-[9px]" style={{ color: "#C8900A" }}>✓</span>
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Journal entries */}
        <AnimatePresence initial={false}>
          {journalOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-2 pb-1 pt-1">
                {journalNotes.length === 0 ? (
                  <p className="text-[10px] text-center py-3" style={{ color: "rgba(245,240,232,0.2)" }}>
                    No entry yet
                  </p>
                ) : (
                  journalNotes.map((n) => <NoteRow key={n.id} note={n} isJournal />)
                )}

                {/* Recent past entries */}
                {recentJournalNotes.length > 0 && (
                  <div className="mt-1">
                    <button
                      onClick={() => setRecentOpen((v) => !v)}
                      className="w-full flex items-center gap-1.5 px-3 py-1.5 text-left transition-colors hover:bg-white/[0.02] rounded-lg"
                    >
                      <ChevronDown
                        className="w-2.5 h-2.5 transition-transform duration-150"
                        style={{
                          color: "rgba(245,240,232,0.2)",
                          transform: recentOpen ? "rotate(0deg)" : "rotate(-90deg)",
                        }}
                      />
                      <span className="text-[9px] tracking-widest uppercase"
                        style={{ color: "rgba(245,240,232,0.2)" }}>
                        Recent · {recentJournalNotes.length}
                      </span>
                    </button>
                    <AnimatePresence initial={false}>
                      {recentOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="overflow-hidden"
                        >
                          {recentJournalNotes.map((n) => <NoteRow key={n.id} note={n} isJournal />)}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
              <div className="h-px mx-2" style={{ background: "rgba(255,235,180,0.07)" }} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── NOTES SECTION ── */}
      <div className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid rgba(255,235,180,0.07)" }}>
        <p className="text-[10px] tracking-widest uppercase font-semibold"
          style={{ color: "rgba(245,240,232,0.4)" }}>Notes</p>
        <button
          onClick={handleCreate}
          disabled={isPending}
          className="w-5 h-5 rounded-md flex items-center justify-center transition-colors hover:bg-[rgba(200,144,10,0.15)] disabled:opacity-40"
          style={{ border: "1px solid rgba(200,144,10,0.2)" }}
          title="New note"
        >
          {isPending
            ? <Loader2 className="w-2.5 h-2.5 animate-spin" style={{ color: "#C8900A" }} />
            : <Plus className="w-2.5 h-2.5" style={{ color: "#C8900A" }} />}
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2" style={{ borderBottom: "1px solid rgba(255,235,180,0.05)" }}>
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,235,180,0.07)" }}>
          <Search className="w-3 h-3 shrink-0" style={{ color: "rgba(245,240,232,0.3)" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes..."
            className="flex-1 bg-transparent text-xs outline-none placeholder:opacity-40"
            style={{ color: "#F5F0E8" }}
          />
        </div>
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {regularNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 gap-2">
            <FileText className="w-4 h-4" style={{ color: "rgba(245,240,232,0.15)" }} />
            <p className="text-[10px] text-center" style={{ color: "rgba(245,240,232,0.2)" }}>
              {search ? "No matches" : "No notes yet"}
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
