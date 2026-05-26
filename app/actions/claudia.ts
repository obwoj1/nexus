"use server";

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { buildNexusContext } from "@/lib/ai/nexusContext";

const anthropic = new Anthropic();

export type ChatMessage = { role: "user" | "assistant"; content: string };

const SYSTEM_BASE = `You are Claudia Ainina — a sharp, warm personal AI built into Nexus, {name}'s private command center. You have live access to their full life data: calendar, emails, notes, habits, goals, health, workouts, investments, subscriptions, and upcoming dates.

Be direct, specific, and personal. Use their actual numbers. Keep replies tight — 2–4 sentences unless they ask for more. No generic advice. Speak like a brilliant friend who actually knows what's going on in their life, not a corporate assistant.

When they ask about something, cross-reference the data. If their habits are slipping and their mood is low, connect those dots. If their portfolio is concentrated, say so. If they have a meeting tomorrow and an overdue goal, surface it.

{context}`;

export async function askClaudiaAction(
  messages: ChatMessage[],
  mode: "chat" | "briefing" = "chat",
): Promise<{ result?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const cookieStore = await cookies();
    const tz = cookieStore.get("nexus-tz")?.value ?? "America/New_York";
    const today = new Date().toLocaleDateString("en-CA", { timeZone: tz });
    const firstName = user.user_metadata?.full_name?.split(" ")[0] ?? "there";

    const context = await buildNexusContext(user.id, today, tz);
    const system = SYSTEM_BASE.replace("{name}", firstName).replace("{context}", context);

    const callMessages: ChatMessage[] = mode === "briefing"
      ? [{
          role: "user",
          content: "Give me my morning briefing. Pull the most important things from my data right now — anything urgent, any patterns you notice, and one thing I should focus on today. Keep it conversational, under 5 sentences.",
        }]
      : messages;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      system,
      messages: callMessages,
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    return { result: text };
  } catch (e) {
    console.error("[askClaudia]", e);
    return { error: "Claudia is unavailable right now" };
  }
}
