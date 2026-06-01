"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function disconnectOutlookAction(): Promise<{ success: boolean }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false };

    const admin = createAdminClient();
    await admin.from("profiles").update({
      outlook_email:            null,
      outlook_access_token:     null,
      outlook_refresh_token:    null,
      outlook_token_expires_at: null,
    }).eq("user_id", user.id);

    revalidatePath("/calendar");
    return { success: true };
  } catch {
    return { success: false };
  }
}
