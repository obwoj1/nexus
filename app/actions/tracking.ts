"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function getUserId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

const db = () => createAdminClient();

// ── HABITS ───────────────────────────────────────────────────────────────────

export async function createHabitAction(name: string, color: string) {
  const userId = await getUserId();
  const { data, error } = await db().from("habits").insert({ user_id: userId, name, color }).select("id").single();
  if (error) return { error: error.message };
  revalidatePath("/tracking");
  return { id: data.id };
}

export async function deleteHabitAction(id: string) {
  const userId = await getUserId();
  await db().from("habits").delete().eq("id", id).eq("user_id", userId);
  revalidatePath("/tracking");
}

export async function toggleHabitLogAction(habitId: string, date: string, completed: boolean) {
  const userId = await getUserId();
  if (completed) {
    const { error } = await db().from("habit_logs").insert({ user_id: userId, habit_id: habitId, date });
    if (error && error.code !== "23505") console.error("[toggleHabitLog]", error); // 23505 = unique violation, expected
  } else {
    await db().from("habit_logs").delete().eq("habit_id", habitId).eq("date", date).eq("user_id", userId);
  }
  revalidatePath("/tracking");
}

// ── SUBSCRIPTIONS ─────────────────────────────────────────────────────────────

const subSchema = z.object({
  name: z.string().min(1).max(100),
  amount: z.number().positive(),
  billing_cycle: z.enum(["weekly", "monthly", "annual"]),
  next_billing_date: z.string().nullable(),
  category: z.string().nullable(),
});

export async function createSubscriptionAction(input: z.infer<typeof subSchema>) {
  const parsed = subSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };
  const userId = await getUserId();
  const { data, error } = await db().from("subscriptions").insert({ user_id: userId, ...parsed.data }).select("id").single();
  if (error) return { error: error.message };
  revalidatePath("/tracking");
  return { id: data.id };
}

export async function deleteSubscriptionAction(id: string) {
  const userId = await getUserId();
  await db().from("subscriptions").delete().eq("id", id).eq("user_id", userId);
  revalidatePath("/tracking");
}

// ── GOALS ─────────────────────────────────────────────────────────────────────

export async function createGoalAction(title: string, description: string, targetDate: string | null) {
  const userId = await getUserId();
  const { data, error } = await db().from("goals")
    .insert({ user_id: userId, title, description: description || null, target_date: targetDate || null })
    .select("id").single();
  if (error) return { error: error.message };
  revalidatePath("/tracking");
  return { id: data.id };
}

export async function updateGoalProgressAction(id: string, progress: number) {
  const userId = await getUserId();
  const status = progress === 100 ? "completed" : "active";
  await db().from("goals").update({ progress, status }).eq("id", id).eq("user_id", userId);
  revalidatePath("/tracking");
}

export async function deleteGoalAction(id: string) {
  const userId = await getUserId();
  await db().from("goals").delete().eq("id", id).eq("user_id", userId);
  revalidatePath("/tracking");
}

// ── READING LIST ──────────────────────────────────────────────────────────────

export async function createReadingItemAction(title: string, author: string, type: "book" | "article") {
  const userId = await getUserId();
  const { data, error } = await db().from("reading_list")
    .insert({ user_id: userId, title, author: author || null, type })
    .select("id").single();
  if (error) return { error: error.message };
  revalidatePath("/tracking");
  return { id: data.id };
}

export async function updateReadingStatusAction(id: string, status: "to-read" | "reading" | "done", rating?: number) {
  const userId = await getUserId();
  await db().from("reading_list")
    .update({ status, ...(rating !== undefined ? { rating } : {}) })
    .eq("id", id).eq("user_id", userId);
  revalidatePath("/tracking");
}

export async function deleteReadingItemAction(id: string) {
  const userId = await getUserId();
  await db().from("reading_list").delete().eq("id", id).eq("user_id", userId);
  revalidatePath("/tracking");
}

// ── HEALTH METRICS ────────────────────────────────────────────────────────────

const healthSchema = z.object({
  date: z.string(),
  sleep_hours: z.number().min(0).max(24).nullable(),
  water_oz: z.number().int().min(0).nullable(),
  mood: z.number().int().min(1).max(5).nullable(),
  weight_lbs: z.number().min(0).nullable(),
});

export async function upsertHealthAction(input: z.infer<typeof healthSchema>) {
  const parsed = healthSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };
  const userId = await getUserId();
  const { error } = await db().from("health_metrics")
    .upsert({ user_id: userId, ...parsed.data }, { onConflict: "user_id, date" });
  if (error) return { error: error.message };
  revalidatePath("/tracking");
  return { success: true };
}

// ── IMPORTANT DATES ───────────────────────────────────────────────────────────

export async function createDateAction(label: string, date: string, type: string, recurring: boolean) {
  const userId = await getUserId();
  const { data, error } = await db().from("important_dates")
    .insert({ user_id: userId, label, date, type, recurring })
    .select("id").single();
  if (error) return { error: error.message };
  revalidatePath("/tracking");
  return { id: data.id };
}

export async function deleteDateAction(id: string) {
  const userId = await getUserId();
  await db().from("important_dates").delete().eq("id", id).eq("user_id", userId);
  revalidatePath("/tracking");
}
