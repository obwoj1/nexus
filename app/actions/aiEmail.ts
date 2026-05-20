"use server";

import { createClient } from "@/lib/supabase/server";
import { getInboxMessages, getOldUnreadMessages } from "@/lib/google/gmail";
import { analyzeEmails, type EmailAnalysis } from "@/lib/ai/emailAnalyzer";

async function getUserId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

export async function analyzeInboxAction(): Promise<EmailAnalysis & { error?: string }> {
  try {
    const userId = await getUserId();
    const messages = await getInboxMessages(userId, 25);
    const inputs = messages.map((m) => ({
      id: m.id,
      from: m.from,
      subject: m.subject,
      snippet: m.snippet,
      date: m.date,
    }));
    return await analyzeEmails(inputs);
  } catch {
    return { flagged: [], summary: "", error: "Could not analyze inbox. Try again." };
  }
}

export async function analyzeOldUnreadAction(): Promise<EmailAnalysis & { error?: string }> {
  try {
    const userId = await getUserId();
    const messages = await getOldUnreadMessages(userId, 30, 25);
    const inputs = messages.map((m) => ({
      id: m.id,
      from: m.from,
      subject: m.subject,
      snippet: m.snippet,
      date: m.date,
    }));
    return await analyzeEmails(inputs);
  } catch {
    return { flagged: [], summary: "", error: "Could not analyze old emails. Try again." };
  }
}
