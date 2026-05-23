"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function getUserId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Session expired — please refresh the page");
  return user.id;
}

const db = () => createAdminClient();

// ── SESSIONS ──────────────────────────────────────────────────────────────────

export async function createSessionAction(name: string, date: string, templateId?: string) {
  try {
    const userId = await getUserId();
    const { data, error } = await db()
      .from("workout_sessions")
      .insert({ user_id: userId, name, date, template_id: templateId ?? null })
      .select("id")
      .single();
    if (error) return { error: error.message };
    revalidatePath("/workouts");
    return { id: data.id as string };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create session" };
  }
}

export async function updateSessionAction(
  id: string,
  updates: { name?: string; duration_minutes?: number | null; notes?: string | null },
) {
  try {
    const userId = await getUserId();
    await db().from("workout_sessions").update(updates).eq("id", id).eq("user_id", userId);
    revalidatePath("/workouts");
  } catch { /* non-critical — optimistic update already applied */ }
}

export async function deleteSessionAction(id: string) {
  try {
    const userId = await getUserId();
    await db().from("workout_sessions").delete().eq("id", id).eq("user_id", userId);
    revalidatePath("/workouts");
  } catch { /* non-critical */ }
}

// ── SETS ──────────────────────────────────────────────────────────────────────

export async function addSetAction(
  sessionId: string,
  exerciseId: string,
  setNumber: number,
  reps: number | null,
  weightLbs: number | null,
) {
  try {
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
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to log set" };
  }
}

export async function updateSetAction(id: string, reps: number | null, weightLbs: number | null) {
  try {
    const userId = await getUserId();
    const { data: setRow } = await db().from("session_sets").select("session_id").eq("id", id).single();
    if (!setRow) return;
    const { data: session } = await db().from("workout_sessions").select("user_id").eq("id", setRow.session_id).single();
    if ((session as { user_id: string } | null)?.user_id !== userId) return;
    await db().from("session_sets").update({ reps, weight_lbs: weightLbs }).eq("id", id);
  } catch { /* non-critical */ }
}

export async function deleteSetAction(id: string) {
  try {
    const userId = await getUserId();
    const { data: setRow } = await db().from("session_sets").select("session_id").eq("id", id).single();
    if (!setRow) return;
    const { data: session } = await db().from("workout_sessions").select("user_id").eq("id", setRow.session_id).single();
    if ((session as { user_id: string } | null)?.user_id !== userId) return;
    await db().from("session_sets").delete().eq("id", id);
  } catch { /* non-critical */ }
}

// ── TEMPLATES ─────────────────────────────────────────────────────────────────

export async function createTemplateAction(name: string, exerciseIds: string[]) {
  try {
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
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create template" };
  }
}

export async function deleteTemplateAction(id: string) {
  try {
    const userId = await getUserId();
    await db().from("workout_templates").delete().eq("id", id).eq("user_id", userId);
    revalidatePath("/workouts");
  } catch { /* non-critical */ }
}

export async function removeExerciseFromTemplateAction(id: string) {
  try {
    const userId = await getUserId();
    const { data: te } = await db().from("template_exercises").select("template_id").eq("id", id).single();
    if (!te) return;
    const { data: tmpl } = await db().from("workout_templates").select("user_id").eq("id", te.template_id).single();
    if ((tmpl as { user_id: string } | null)?.user_id !== userId) return;
    await db().from("template_exercises").delete().eq("id", id);
    revalidatePath("/workouts");
  } catch { /* non-critical */ }
}

// ── PROGRESS ──────────────────────────────────────────────────────────────────

export async function getExerciseProgressAction(
  exerciseId: string,
): Promise<{ date: string; maxWeight: number; totalVolume: number; est1RM: number }[]> {
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

  const byDate: Record<string, { maxWeight: number; totalVolume: number; est1RM: number }> = {};
  sets.forEach((set) => {
    const date = dateById[set.session_id];
    if (!date) return;
    const w = Number(set.weight_lbs ?? 0);
    const r = Number(set.reps ?? 0);
    if (!byDate[date]) byDate[date] = { maxWeight: 0, totalVolume: 0, est1RM: 0 };
    if (w > byDate[date].maxWeight) byDate[date].maxWeight = w;
    byDate[date].totalVolume += w * r;
    // Epley formula: weight × (1 + reps/30), capped at 1 rep = just the weight
    const epley = r <= 1 ? w : Math.round(w * (1 + r / 30));
    if (epley > byDate[date].est1RM) byDate[date].est1RM = epley;
  });

  return Object.entries(byDate).map(([date, stats]) => ({
    date: new Date(date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    maxWeight: stats.maxWeight,
    totalVolume: stats.totalVolume,
    est1RM: stats.est1RM,
  }));
}

// ── BODY PHOTOS ───────────────────────────────────────────────────────────────

export async function uploadBodyPhotoAction(formData: FormData) {
  const userId = await getUserId();
  const file = formData.get("file") as File | null;
  const date = formData.get("date") as string | null;
  const notes = (formData.get("notes") as string) || null;

  if (!file || !date) return { error: "Missing file or date" };

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${userId}/${date}-${Date.now()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await db().storage
    .from("body-progress")
    .upload(path, bytes, { contentType: file.type, upsert: false });
  if (uploadError) return { error: uploadError.message };

  const { data: signed } = await db().storage
    .from("body-progress")
    .createSignedUrl(path, 3600);

  const { data, error } = await db()
    .from("body_photos")
    .insert({ user_id: userId, storage_path: path, date, notes })
    .select("id")
    .single();
  if (error) return { error: error.message };

  return { id: data.id as string, url: signed?.signedUrl ?? "" };
}

export async function deleteBodyPhotoAction(id: string, storagePath: string) {
  const userId = await getUserId();
  const { data } = await db().from("body_photos").select("user_id").eq("id", id).single();
  if ((data as { user_id: string } | null)?.user_id !== userId) return;
  await db().storage.from("body-progress").remove([storagePath]);
  await db().from("body_photos").delete().eq("id", id);
  revalidatePath("/workouts");
}

export async function refreshPhotoUrlAction(storagePath: string): Promise<string> {
  const { data } = await db().storage
    .from("body-progress")
    .createSignedUrl(storagePath, 3600);
  return data?.signedUrl ?? "";
}

// ── BODY METRICS ─────────────────────────────────────────────────────────────

export async function upsertBodyMetricAction(date: string, weightLbs: number | null, bodyFatPct: number | null, notes: string | null) {
  try {
    const userId = await getUserId();
    const { error } = await db()
      .from("body_metrics")
      .upsert({ user_id: userId, date, weight_lbs: weightLbs, body_fat_pct: bodyFatPct, notes }, { onConflict: "user_id,date" });
    if (error) return { error: error.message };
    revalidatePath("/workouts");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save" };
  }
}

export async function deleteBodyMetricAction(id: string) {
  try {
    const userId = await getUserId();
    await db().from("body_metrics").delete().eq("id", id).eq("user_id", userId);
    revalidatePath("/workouts");
  } catch { /* non-critical */ }
}

// ── CUSTOM EXERCISES ──────────────────────────────────────────────────────────

export async function createCustomExerciseAction(
  name: string,
  muscleGroup: string,
  equipment: string,
  type: string,
) {
  try {
    const userId = await getUserId();
    const { data, error } = await db()
      .from("custom_exercises")
      .insert({ user_id: userId, name: name.trim(), muscle_group: muscleGroup, equipment, type })
      .select("id")
      .single();
    if (error) return { error: error.message };
    revalidatePath("/workouts");
    return { id: data.id as string };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create exercise" };
  }
}
