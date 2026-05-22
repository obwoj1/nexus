import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/Topbar";
import { NotesShell } from "@/components/notes/NotesShell";
import type { Block } from "@blocknote/core";
import type { NoteItem } from "@/components/notes/NotesList";

export default async function NotesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();

  // Daily journal — ensure today's note exists
  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
  const journalTitle = `Journal — ${todayLabel}`;

  const { data: existing } = await admin
    .from("notes")
    .select("id")
    .eq("user_id", user.id)
    .eq("title", journalTitle)
    .maybeSingle();

  if (!existing) {
    await admin.from("notes").insert({ user_id: user.id, title: journalTitle, content: [] });
  }

  // Fetch all notes (journal will now be included)
  const { data: notes } = await admin
    .from("notes")
    .select("id, title, is_pinned, updated_at, content")
    .eq("user_id", user.id)
    .order("is_pinned", { ascending: false })
    .order("updated_at", { ascending: false });

  const noteList: NoteItem[] = (notes ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    is_pinned: n.is_pinned,
    updated_at: n.updated_at,
  }));

  const contentMap: Record<string, Block[]> = Object.fromEntries(
    (notes ?? []).map((n) => [n.id, (n.content as Block[]) ?? []])
  );

  // Pass the journal note id so the shell can open it by default
  const journalId = (notes ?? []).find((n) => n.title === journalTitle)?.id ?? null;

  return (
    <div className="flex flex-col flex-1 h-screen overflow-hidden">
      <Topbar section="NOTES" title="Notes" />
      <NotesShell initialNotes={noteList} noteContents={contentMap} journalId={journalId} />
    </div>
  );
}
