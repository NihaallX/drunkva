import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

interface TitleParams {
  drink_count: number;
  dominant_drink_type: string;
  peak_stage: string;
  venue_name: string;
  start_hour: number; // 0-23
}

export async function generateSessionTitle(params: TitleParams): Promise<string | null> {
  const hour = params.start_hour;
  const timeLabel = hour < 12 ? `${hour}am` : hour === 12 ? "noon" : hour < 18 ? `${hour - 12}pm` : hour < 24 ? `${hour - 12}pm` : "midnight";
  const prompt = `Generate a short 1-sentence caption for a night out. Sound like a real person texting their friend, not an AI. Use casual language, be slightly self-deprecating or chaotic. Under 12 words. No hashtags. No quotes. Stats: ${params.drink_count} ${params.dominant_drink_type}s, peak stage: ${params.peak_stage}, venue: ${params.venue_name}, started at ${timeLabel}. Return only the caption.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const completion = await groq.chat.completions.create(
      {
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 100,
        temperature: 0.9,
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
