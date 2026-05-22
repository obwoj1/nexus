"use server";

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

type AssistMode = "rewrite" | "expand" | "summarize" | "fix";

const PROMPTS: Record<AssistMode, string> = {
  rewrite:   "Rewrite the following text to be clearer and more concise while preserving the meaning. Return only the rewritten text, no explanation.",
  expand:    "Expand the following text with more detail, context, and depth. Return only the expanded text, no explanation.",
  summarize: "Summarize the following text in 1-2 concise sentences. Return only the summary, no explanation.",
  fix:       "Fix any grammar, spelling, and punctuation errors in the following text. Keep the same voice and style. Return only the corrected text, no explanation.",
};

export async function aiAssistAction(
  text: string,
  mode: AssistMode
): Promise<{ result?: string; error?: string }> {
  if (!text.trim()) return { error: "No text provided" };

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: `${PROMPTS[mode]}\n\n---\n\n${text}`,
      }],
    });

    const content = response.content[0];
    if (content.type !== "text") return { error: "Unexpected response" };
    return { result: content.text };
  } catch (e) {
    console.error("[aiAssistAction] error:", e);
    return { error: "Request failed" };
  }
}
