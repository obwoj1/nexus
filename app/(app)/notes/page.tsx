import { createClient, createAdminClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { Topbar } from "@/components/layout/Topbar";
import { NotesShell } from "@/components/notes/NotesShell";
import type { Block } from "@blocknote/core";
import type { NoteItem } from "@/components/notes/NotesList";

const DEFAULT_TZ = "America/New_York";

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

  // Ensure today's journal entry exists
  const { data: existing } = await admin
    .from("notes")
    .select("id")
    .eq("user_id", user.id)
    .eq("title", journalTitle)
    .maybeSingle();

  if (!existing) {
    await admin.from("notes").insert({
      user_id: user.id,
      title: journalTitle,
      content: [],
    });
  }

  // Fetch metadata only — no content blob to keep initial payload small
  const { data: notes } = await admin
    .from("notes")
    .select("id, title, is_pinned, updated_at")
    .eq("user_id", user.id)
    .order("is_pinned", { ascending: false })
    .order("updated_at", { ascending: false });

  const noteList: NoteItem[] = (notes ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    is_pinned: n.is_pinned,
    updated_at: n.updated_at,
  }));

  const journalId = (notes ?? []).find((n) => n.title === journalTitle)?.id ?? null;

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
