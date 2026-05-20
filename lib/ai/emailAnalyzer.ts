import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface EmailInput {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
}

export interface FlaggedEmail {
  id: string;
  reason: string;
  priority: "high" | "medium";
}

export interface EmailAnalysis {
  flagged: FlaggedEmail[];
  summary: string;
}

const SYSTEM_PROMPT = `You are an intelligent email triage assistant for a personal command center app.

Your job is to analyze a list of emails and:
1. Flag the genuinely important ones that need attention
2. Write a short, smart inbox summary

What counts as IMPORTANT (flag these):
- Bills, invoices, payment due dates, account alerts
- Job opportunities, offers, interviews, recruiting messages
- Messages from real people (not marketing/newsletters)
- Deadlines, appointments, confirmations that require action
- Academic emails (professors, advisors, registrar)
- Legal or government correspondence
- Security alerts (password changes, unusual login)
- Anything marked urgent or requiring a response

What is NOT important (ignore these):
- Marketing emails, newsletters, promotions
- Social media notifications
- Automated receipts for past purchases (unless large amounts)
- Spam or bulk mail
- Subscription digests

Return ONLY valid JSON in this exact shape — no markdown, no explanation:
{
  "flagged": [
    { "id": "<message id>", "reason": "<one short sentence why this matters>", "priority": "high" | "medium" }
  ],
  "summary": "<2-3 sentence conversational summary of what actually needs attention. Be direct and specific. Mention names, amounts, deadlines.>"
}

If nothing is important, return flagged as an empty array and say so in the summary.`;

export async function analyzeEmails(emails: EmailInput[]): Promise<EmailAnalysis> {
  if (!emails.length) {
    return { flagged: [], summary: "No emails to analyze." };
  }

  const emailList = emails
    .map((e, i) => `[${i + 1}] ID: ${e.id}\nFrom: ${e.from}\nSubject: ${e.subject}\nDate: ${e.date}\nPreview: ${e.snippet}`)
    .join("\n\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Analyze these ${emails.length} emails:\n\n${emailList}`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";

  try {
    const parsed = JSON.parse(text) as EmailAnalysis;
    return {
      flagged: parsed.flagged ?? [],
      summary: parsed.summary ?? "",
    };
  } catch {
    return { flagged: [], summary: "Could not parse AI response." };
  }
}
