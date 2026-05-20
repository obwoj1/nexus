"use server";

import { createClient } from "@/lib/supabase/server";
import { markMessagesAsRead, batchMarkOldAsRead } from "@/lib/google/gmail";
import { revalidatePath } from "next/cache";

async function getAuthUserId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

export async function markAsReadAction(messageIds: string[]): Promise<{ success: boolean }> {
  try {
    const userId = await getAuthUserId();
    await markMessagesAsRead(userId, messageIds);
    revalidatePath("/mail");
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function batchMarkOldAsReadAction(daysOld = 30): Promise<{ success: boolean; count: number }> {
  try {
    const userId = await getAuthUserId();
    const count = await batchMarkOldAsRead(userId, daysOld);
    revalidatePath("/mail");
    return { success: true, count };
  } catch {
    return { success: false, count: 0 };
  }
}
