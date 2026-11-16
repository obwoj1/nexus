"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";

async function currentUserId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to use projects.");
  return user.id;
}

export async function saveProjectAction(form: FormData) {
  const parsed = z.object({
    id: z.string().uuid().optional().or(z.literal("")),
    name: z.string().trim().min(1).max(100),
    instructions: z.string().max(3000),
    context: z.string().max(25000),
  }).safeParse({ id: form.get("id") || "", name: form.get("name"), instructions: form.get("instructions") ?? "", context: form.get("context") ?? "" });
  if (!parsed.success) return { error: "Check the project name, instructions, and context length." };
  try {
    const userId = await currentUserId();
    const admin = createAdminClient();
    const { id, ...project } = parsed.data;
    if (!id) {
      const { count, error } = await admin.from("nexus_projects").select("id", { count: "exact", head: true }).eq("user_id", userId);
      if (error) return { error: "Projects are unavailable. Apply the Nexus project-workspaces migration first." };
      if ((count ?? 0) >= 50) return { error: "You can create up to 50 project spaces." };
    }
    const result = id
      ? await admin.from("nexus_projects").update({ ...project, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId)
      : await admin.from("nexus_projects").insert({ ...project, user_id: userId });
    if (result.error) return { error: "Could not save this project. Names must be unique in your workspace." };
    revalidatePath("/projects");
    revalidatePath("/agents");
    return { success: true };
  } catch {
    return { error: "Your session expired. Sign in again and retry." };
  }
}

export async function deleteProjectAction(id: string) {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { error: "Invalid project." };
  try {
    const userId = await currentUserId();
    const { error } = await createAdminClient().from("nexus_projects").delete().eq("id", parsed.data).eq("user_id", userId);
    if (error) return { error: "Could not delete this project." };
    revalidatePath("/projects");
    revalidatePath("/agents");
    return { success: true };
  } catch {
    return { error: "Your session expired. Sign in again and retry." };
  }
}
