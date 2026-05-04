import Groq from "groq-sdk";

interface TitleParams {
  drink_count: number;
  dominant_drink_type: string;
  peak_stage: string;
  venue_name: string;
  start_hour: number; // 0-23
}

export async function generateSessionTitle(params: TitleParams): Promise<string | null> {
  // Guard: if the API key isn't set, return null gracefully rather than
  // crashing the Groq constructor and producing an unhandled 500.
  if (!process.env.GROQ_API_KEY) return null;

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const hour = params.start_hour;
  const timeLabel =
    hour < 6 ? "way too late" :
    hour < 12 ? `${hour}am` :
    hour === 12 ? "noon" :
    hour < 18 ? `${hour - 12}pm` :
    `${hour - 12}pm`;

  const systemPrompt = `You are a sarcastic, self-aware friend who writes brutally honest captions about nights out.
Your captions are:
- Under 12 words, no hashtags, no quotes around the caption
- Dripping in dry wit, dark humour, or mild regret
- Written like a real person texting at 2am, not a marketing bot
- Slightly judgmental but still affectionate
- Occasionally reference the chaos, the bad decisions, or the "I swear I'm going home after this one"
- Never start with "I" — mix up the sentence structure
Return ONLY the caption text. No explanation.`;

  const userPrompt = `Night out stats: ${params.drink_count} ${params.dominant_drink_type}(s), peak stage: ${params.peak_stage}, venue: ${params.venue_name || "some bar"}, kicked off at ${timeLabel}. Write the caption.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const completion = await groq.chat.completions.create(
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 80,
        temperature: 1.0,
      },
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    return completion.choices[0]?.message?.content?.trim() ?? null;
  } catch {
    clearTimeout(timeout);
    return null;
  }
}
