"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function getUserId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

const db = () => createAdminClient();

// ── SESSIONS ──────────────────────────────────────────────────────────────────

export async function createSessionAction(name: string, date: string, templateId?: string) {
  const userId = await getUserId();
  const { data, error } = await db()
    .from("workout_sessions")
    .insert({ user_id: userId, name, date, template_id: templateId ?? null })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/workouts");
  return { id: data.id as string };
}

export async function updateSessionAction(
  id: string,
  updates: { name?: string; duration_minutes?: number | null; notes?: string | null },
) {
  const userId = await getUserId();
  await db().from("workout_sessions").update(updates).eq("id", id).eq("user_id", userId);
  revalidatePath("/workouts");
}

export async function deleteSessionAction(id: string) {
  const userId = await getUserId();
  await db().from("workout_sessions").delete().eq("id", id).eq("user_id", userId);
  revalidatePath("/workouts");
}

// ── SETS ──────────────────────────────────────────────────────────────────────

export async function addSetAction(
  sessionId: string,
  exerciseId: string,
  setNumber: number,
  reps: number | null,
  weightLbs: number | null,
) {
  const userId = await getUserId();
  const { data: session } = await db()
    .from("workout_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .single();
  if (!session) return { error: "Session not found" };

  const { data, error } = await db()
    .from("session_sets")
    .insert({ session_id: sessionId, exercise_id: exerciseId, set_number: setNumber, reps, weight_lbs: weightLbs })
    .select("id")
    .single();
  if (error) return { error: error.message };
  return { id: data.id as string };
}

export async function updateSetAction(id: string, reps: number | null, weightLbs: number | null) {
  const userId = await getUserId();
  const { data: setRow } = await db().from("session_sets").select("session_id").eq("id", id).single();
  if (!setRow) return;
  const { data: session } = await db().from("workout_sessions").select("user_id").eq("id", setRow.session_id).single();
  if ((session as { user_id: string } | null)?.user_id !== userId) return;
  await db().from("session_sets").update({ reps, weight_lbs: weightLbs }).eq("id", id);
}

export async function deleteSetAction(id: string) {
  const userId = await getUserId();
  const { data: setRow } = await db().from("session_sets").select("session_id").eq("id", id).single();
  if (!setRow) return;
  const { data: session } = await db().from("workout_sessions").select("user_id").eq("id", setRow.session_id).single();
  if ((session as { user_id: string } | null)?.user_id !== userId) return;
  await db().from("session_sets").delete().eq("id", id);
}

// ── TEMPLATES ─────────────────────────────────────────────────────────────────

export async function createTemplateAction(name: string, exerciseIds: string[]) {
  const userId = await getUserId();
  const { data, error } = await db()
    .from("workout_templates")
    .insert({ user_id: userId, name })
    .select("id")
    .single();
  if (error) return { error: error.message };
  if (exerciseIds.length > 0) {
    await db().from("template_exercises").insert(
      exerciseIds.map((exerciseId, i) => ({ template_id: data.id, exercise_id: exerciseId, display_order: i })),
    );
  }
  revalidatePath("/workouts");
  return { id: data.id as string };
}

export async function deleteTemplateAction(id: string) {
  const userId = await getUserId();
  await db().from("workout_templates").delete().eq("id", id).eq("user_id", userId);
  revalidatePath("/workouts");
}

export async function removeExerciseFromTemplateAction(id: string) {
  const userId = await getUserId();
  const { data: te } = await db().from("template_exercises").select("template_id").eq("id", id).single();
  if (!te) return;
  const { data: tmpl } = await db().from("workout_templates").select("user_id").eq("id", te.template_id).single();
  if ((tmpl as { user_id: string } | null)?.user_id !== userId) return;
  await db().from("template_exercises").delete().eq("id", id);
  revalidatePath("/workouts");
}

// ── PROGRESS ──────────────────────────────────────────────────────────────────

export async function getExerciseProgressAction(
  exerciseId: string,
): Promise<{ date: string; maxWeight: number; totalVolume: number }[]> {
  const userId = await getUserId();

  const { data: sessions } = await db()
    .from("workout_sessions")
    .select("id, date")
    .eq("user_id", userId)
    .order("date", { ascending: true });

  if (!sessions?.length) return [];

  const sessionIds = sessions.map((s) => s.id);
  const dateById = Object.fromEntries(sessions.map((s) => [s.id, s.date as string]));

  const { data: sets } = await db()
    .from("session_sets")
    .select("session_id, weight_lbs, reps")
    .eq("exercise_id", exerciseId)
    .in("session_id", sessionIds);

  if (!sets?.length) return [];

  const byDate: Record<string, { maxWeight: number; totalVolume: number }> = {};
  sets.forEach((set) => {
    const date = dateById[set.session_id];
    if (!date) return;
    const w = Number(set.weight_lbs ?? 0);
    const r = Number(set.reps ?? 0);
    if (!byDate[date]) byDate[date] = { maxWeight: 0, totalVolume: 0 };
    if (w > byDate[date].maxWeight) byDate[date].maxWeight = w;
    byDate[date].totalVolume += w * r;
  });

  return Object.entries(byDate).map(([date, stats]) => ({
    date: new Date(date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    maxWeight: stats.maxWeight,
    totalVolume: stats.totalVolume,
  }));
}
