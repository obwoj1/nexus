"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";

type WaitlistStatus = "pending" | "invited" | "rejected";

export interface WaitlistEntry {
  id: string;
  name: string;
  email: string;
  status: WaitlistStatus;
  created_at: string;
}

async function assertOwner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ALLOWED_EMAIL) {
    throw new Error("Unauthorized");
  }
}

export async function getWaitlist(): Promise<WaitlistEntry[]> {
  await assertOwner();
  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("waitlist")
    .select("id, name, email, status, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as WaitlistEntry[];
}

export async function updateWaitlistStatus(id: string, status: WaitlistStatus) {
  await assertOwner();
  const admin = await createAdminClient();
  const { error } = await admin
    .from("waitlist")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
