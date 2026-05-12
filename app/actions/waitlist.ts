"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(100).trim(),
  email: z.string().email("Invalid email address").toLowerCase().trim(),
});

type WaitlistResult =
  | { success: true }
  | { success: false; error: string };

export async function joinWaitlist(formData: FormData): Promise<WaitlistResult> {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("waitlist")
    .insert({ name: parsed.data.name, email: parsed.data.email });

  if (error) {
    // Unique constraint = already on the list
    if (error.code === "23505") {
      return { success: false, error: "This email is already on the waitlist." };
    }
    return { success: false, error: "Something went wrong. Please try again." };
  }

  return { success: true };
}
