"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";

async function authenticatedUserId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to use Study.");
  return user.id;
}

const courseSchema = z.object({
  name: z.string().trim().min(1).max(160),
  code: z.string().trim().max(40).default(""),
  term: z.string().trim().max(80).default(""),
});

export async function createStudyCourseAction(input: FormData) {
  try {
    const parsed = courseSchema.safeParse({ name: input.get("name"), code: input.get("code") || "", term: input.get("term") || "" });
    if (!parsed.success) return { error: "Enter a course name (up to 160 characters)." };
    const userId = await authenticatedUserId();
    const admin = createAdminClient();
    const { error } = await admin.from("study_courses").insert({ user_id: userId, ...parsed.data });
    if (error) return { error: "Could not save this course." };
    revalidatePath("/study");
    return { success: true };
  } catch {
    return { error: "Your session expired. Sign in again and retry." };
  }
}

const assignmentSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().trim().min(1).max(240),
  dueAt: z.string().max(40).optional().default(""),
  timezoneOffset: z.coerce.number().int().min(-840).max(840).default(0),
  details: z.string().max(8000).optional().default(""),
}).refine(({ dueAt }) => !dueAt || Number.isFinite(Date.parse(dueAt)), { path: ["dueAt"], message: "Invalid due date" });

export async function createStudyAssignmentAction(input: FormData) {
  try {
    const parsed = assignmentSchema.safeParse({
      courseId: input.get("courseId"), title: input.get("title"),
      dueAt: input.get("dueAt") || "", details: input.get("details") || "",
      timezoneOffset: input.get("timezoneOffset") || "0",
    });
    if (!parsed.success) return { error: "Check the course, title, and due date." };
    const userId = await authenticatedUserId();
    const admin = createAdminClient();
    const { error } = await admin.from("study_assignments").insert({
      user_id: userId, course_id: parsed.data.courseId, title: parsed.data.title,
      due_at: parsed.data.dueAt ? new Date(Date.parse(parsed.data.dueAt) + parsed.data.timezoneOffset * 60_000).toISOString() : null,
      details: parsed.data.details,
    });
    if (error) return { error: "Could not save this assignment." };
    revalidatePath("/study");
    return { success: true };
  } catch {
    return { error: "Your session expired. Sign in again and retry." };
  }
}

export async function toggleStudyAssignmentAction(id: string, completed: boolean) {
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) return { error: "Invalid assignment." };
  try {
    const userId = await authenticatedUserId();
    const admin = createAdminClient();
    const { error } = await admin.from("study_assignments").update({ status: completed ? "completed" : "todo" })
      .eq("id", parsedId.data).eq("user_id", userId);
    if (error) return { error: "Could not update this assignment." };
    revalidatePath("/study");
    return { success: true };
  } catch {
    return { error: "Your session expired. Sign in again and retry." };
  }
}

const cardSchema = z.object({
  courseId: z.string().uuid(),
  front: z.string().trim().min(1).max(2000),
  back: z.string().trim().min(1).max(5000),
});

export async function createStudyCardAction(input: FormData) {
  const parsed = cardSchema.safeParse({ courseId: input.get("courseId"), front: input.get("front"), back: input.get("back") });
  if (!parsed.success) return { error: "Add a course, question, and answer." };
  try {
    const userId = await authenticatedUserId();
    const admin = createAdminClient();
    const { error } = await admin.from("study_cards").insert({ user_id: userId, ...parsed.data });
    if (error) return { error: "Could not save this flashcard." };
    revalidatePath("/study");
    return { success: true };
  } catch {
    return { error: "Your session expired. Sign in again and retry." };
  }
}

const reviewSchema = z.object({ id: z.string().uuid(), rating: z.enum(["again", "hard", "good", "easy"]) });

export async function reviewStudyCardAction(id: string, rating: string) {
  const parsed = reviewSchema.safeParse({ id, rating });
  if (!parsed.success) return { error: "Invalid review rating." };
  try {
    const userId = await authenticatedUserId();
    const admin = createAdminClient();
    const { data: card, error: readError } = await admin.from("study_cards").select("interval_days,repetitions,ease_factor")
      .eq("id", parsed.data.id).eq("user_id", userId).single();
    if (readError || !card) return { error: "This card is unavailable." };
    const ratingValue = parsed.data.rating;
    const oldInterval = card.interval_days || 0;
    let repetitions = card.repetitions || 0;
    let ease = Number(card.ease_factor) || 2.5;
    let days = 0;
    if (ratingValue === "again") { repetitions = 0; ease = Math.max(1.3, ease - 0.2); }
    else {
      repetitions += 1;
      if (ratingValue === "hard") { days = Math.max(1, Math.ceil((oldInterval || 1) * 1.2)); ease = Math.max(1.3, ease - 0.15); }
      if (ratingValue === "good") days = repetitions === 1 ? 1 : repetitions === 2 ? 3 : Math.ceil(oldInterval * ease);
      if (ratingValue === "easy") { days = repetitions === 1 ? 4 : Math.ceil(oldInterval * ease * 1.3); ease = Math.min(4, ease + 0.15); }
    }
    const dueAt = new Date(Date.now() + (ratingValue === "again" ? 10 * 60_000 : days * 86_400_000)).toISOString();
    const { error } = await admin.from("study_cards").update({ due_at: dueAt, interval_days: days, repetitions, ease_factor: ease })
      .eq("id", parsed.data.id).eq("user_id", userId);
    if (error) return { error: "Could not save this review." };
    revalidatePath("/study");
    return { success: true };
  } catch {
    return { error: "Your session expired. Sign in again and retry." };
  }
}
