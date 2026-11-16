"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";

async function currentUserId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to schedule tasks.");
  return user.id;
}

export async function createScheduledTaskAction(form: FormData) {
  const parsed = z.object({
    name: z.string().trim().min(1).max(100), prompt: z.string().trim().min(4).max(3000),
    runDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    timezoneOffset: z.coerce.number().int().min(-840).max(840).default(0),
    recurrence: z.enum(["once", "daily", "weekdays", "weekly"]),
  }).safeParse({
    name: form.get("name"), prompt: form.get("prompt"), runDate: form.get("runDate"),
    timezoneOffset: form.get("timezoneOffset") || "0", recurrence: form.get("recurrence"),
  });
  if (!parsed.success) return { error: "Enter a name, prompt, run date, and recurrence." };
  try {
    const userId = await currentUserId();
    const localMidnight = Date.parse(`${parsed.data.runDate}T00:00:00`);
    if (!Number.isFinite(localMidnight)) return { error: "Choose a valid run date." };
    const nextRunAt = new Date(localMidnight + parsed.data.timezoneOffset * 60_000).toISOString();
    const admin = createAdminClient();
    const { count, error: countError } = await admin.from("nexus_scheduled_tasks").select("id", { count: "exact", head: true }).eq("user_id", userId).in("status", ["active", "paused", "failed"]);
    if (countError) return { error: "Scheduling is unavailable. Apply the Nexus scheduled-tasks migration first." };
    if ((count ?? 0) >= 20) return { error: "You can keep up to 20 scheduled tasks." };
    const { error } = await admin.from("nexus_scheduled_tasks").insert({ user_id: userId, name: parsed.data.name, prompt: parsed.data.prompt, next_run_at: nextRunAt, recurrence: parsed.data.recurrence });
    if (error) return { error: "Could not save this scheduled task." };
    revalidatePath("/schedule");
    return { success: true };
  } catch {
    return { error: "Your session expired. Sign in again and retry." };
  }
}

export async function updateScheduledTaskStatusAction(id: string, status: "active" | "paused" | "completed") {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { error: "Invalid scheduled task." };
  try {
    const userId = await currentUserId();
    const admin = createAdminClient();
    const { error } = await admin.from("nexus_scheduled_tasks").update({ status }).eq("id", parsed.data).eq("user_id", userId);
    if (error) return { error: "Could not update this task." };
    revalidatePath("/schedule");
    return { success: true };
  } catch {
    return { error: "Your session expired. Sign in again and retry." };
  }
}
