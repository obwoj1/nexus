"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function getUserId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

export async function createNoteAction(): Promise<{ id: string } | { error: string }> {
  try {
    const userId = await getUserId();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("notes")
      .insert({ user_id: userId, title: "Untitled", content: [] })
      .select("id")
      .single();
    if (error) return { error: error.message };
    revalidatePath("/notes");
    return { id: data.id };
  } catch {
    return { error: "Failed to create note" };
  }
}

const saveSchema = z.object({
  id: z.string().uuid(),
  title: z.string().max(500),
  content: z.array(z.unknown()),
});

export async function saveNoteAction(
  input: z.infer<typeof saveSchema>
): Promise<{ success: boolean }> {
  try {
    const parsed = saveSchema.safeParse(input);
    if (!parsed.success) return { success: false };
    const userId = await getUserId();
    const supabase = await createClient();
    await supabase
      .from("notes")
      .update({ title: parsed.data.title, content: parsed.data.content })
      .eq("id", parsed.data.id)
      .eq("user_id", userId);
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function deleteNoteAction(id: string): Promise<{ success: boolean }> {
  try {
    const userId = await getUserId();
    const supabase = await createClient();
    await supabase.from("notes").delete().eq("id", id).eq("user_id", userId);
    revalidatePath("/notes");
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function togglePinAction(id: string, pinned: boolean): Promise<{ success: boolean }> {
  try {
    const userId = await getUserId();
    const supabase = await createClient();
    await supabase
      .from("notes")
      .update({ is_pinned: pinned })
      .eq("id", id)
      .eq("user_id", userId);
    revalidatePath("/notes");
    return { success: true };
  } catch {
    return { success: false };
  }
}
