import { createClient, createAdminClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { Topbar } from "@/components/layout/Topbar";
import { NotesShell } from "@/components/notes/NotesShell";
import type { Block } from "@blocknote/core";
import type { NoteItem } from "@/components/notes/NotesList";

const DEFAULT_TZ = "America/New_York";
const JOURNAL_PATTERN = /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s/;

function isJournalTitle(title: string) {
  return title.startsWith("Journal — ") || JOURNAL_PATTERN.test(title);
}

export default async function NotesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const cookieStore = await cookies();
  const timezone = cookieStore.get("nexus-tz")?.value ?? DEFAULT_TZ;

  const admin = createAdminClient();

  const journalTitle = new Date().toLocaleDateString("en-US", {
    timeZone: timezone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Ensure today's journal entry exists; clean up same-day duplicates
  const { data: existing } = await admin
    .from("notes")
    .select("id, updated_at")
    .eq("user_id", user.id)
    .eq("title", journalTitle)
    .order("updated_at", { ascending: false });

  let journalId: string | null = null;
  const todayDuplicates: string[] = [];

  if (!existing || existing.length === 0) {
    const { data: newJournal } = await admin
      .from("notes")
      .insert({ user_id: user.id, title: journalTitle, content: [], is_journal: true })
      .select("id")
      .single();
    journalId = newJournal?.id ?? null;
  } else {
    journalId = existing[0].id;
    if (existing.length > 1) {
      const dups = existing.slice(1).map((e) => e.id);
      todayDuplicates.push(...dups);
      await admin.from("notes").delete().in("id", dups);
    }
  }

  // Fetch all notes metadata
  const { data: notes } = await admin
    .from("notes")
    .select("id, title, is_pinned, updated_at")
    .eq("user_id", user.id)
    .order("is_pinned", { ascending: false })
    .order("updated_at", { ascending: false });

  // Dedup past journal dates that have multiple rows with the same title
  const deletedIds = new Set<string>(todayDuplicates);
  if (notes) {
    const seenTitles = new Map<string, string>(); // title → canonical id (first seen = most recent)
    const pastDups: string[] = [];
    for (const n of notes) {
      if (!isJournalTitle(n.title)) continue;
      if (deletedIds.has(n.id)) continue; // already marked
      if (seenTitles.has(n.title)) {
        pastDups.push(n.id);
        deletedIds.add(n.id);
      } else {
        seenTitles.set(n.title, n.id);
      }
    }
    if (pastDups.length > 0) {
      await admin.from("notes").delete().in("id", pastDups);
    }
  }

  // Build noteList excluding any duplicates we just deleted
  const noteList: NoteItem[] = (notes ?? [])
    .filter((n) => !deletedIds.has(n.id))
    .map((n) => ({
      id: n.id,
      title: n.title,
      is_pinned: n.is_pinned,
      updated_at: n.updated_at,
    }));

  // Pre-fetch today's journal content so it opens instantly
  let journalContent: Block[] = [];
  if (journalId) {
    const { data: jData } = await admin
      .from("notes")
      .select("content")
      .eq("id", journalId)
      .single();
    journalContent = (jData?.content as Block[]) ?? [];
  }

  const initialContents: Record<string, Block[]> = journalId
    ? { [journalId]: journalContent }
    : {};

  return (
    <div className="flex flex-col flex-1 h-screen overflow-hidden">
      <Topbar section="NOTES" title="Notes" />
      <NotesShell
        initialNotes={noteList}
        initialContents={initialContents}
        journalId={journalId}
        timezone={timezone}
      />
    </div>
  );
}
