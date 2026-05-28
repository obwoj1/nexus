"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function disconnectSecondaryGoogleAction(): Promise<{ success: boolean }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false };

    const admin = createAdminClient();
    await admin
      .from("profiles")
      .update({
        secondary_google_email: null,
        secondary_google_access_token: null,
        secondary_google_refresh_token: null,
        secondary_google_token_expires_at: null,
      })
      .eq("user_id", user.id);

    revalidatePath("/mail");
    revalidatePath("/calendar");
    return { success: true };
  } catch {
    return { success: false };
  }
}
