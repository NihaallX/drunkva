import Groq from "groq-sdk";
import { readFileSync } from "fs";

// Manually read env
const env = readFileSync(".env.local", "utf8");
const apiKey = env.match(/GROQ_API_KEY=([^\r\n]+)/)?.[1];
const groq = new Groq({ apiKey });

const scenarios = [
  { drink_count: 2, dominant: "beer", stage: "Bullish", hour: 23, venue: "casual bar" },
  { drink_count: 8, dominant: "shot", stage: "Climax", hour: 1, venue: "house party" },
  { drink_count: 3, dominant: "wine", stage: "Ascend", hour: 20, venue: "rooftop" },
  { drink_count: 6, dominant: "beer", stage: "Half-life", hour: 2, venue: "nightclub" },
  { drink_count: 1, dominant: "beer", stage: "Baseline", hour: 19, venue: "pub" },
];

for (const s of scenarios) {
  const prompt = `Generate a short 1-sentence caption for a night out. Sound like a real person texting their friend, not an AI. Use casual language, be slightly self-deprecating or chaotic. Under 12 words. No hashtags. No quotes. Stats: ${s.drink_count} ${s.dominant}s, peak stage: ${s.stage}, venue: ${s.venue}, time: ${s.hour}. Return only the caption.`;
  
  const r = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 60,
    temperature: 0.95,
  });
  
  const title = r.choices[0]?.message?.content?.trim();
  console.log(`[${s.stage} · ${s.drink_count}x${s.dominant} · ${s.venue}]`);
  console.log(`  → "${title}"`);
  console.log("");
}
