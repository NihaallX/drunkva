import { formatDuration, formatSessionDuration } from "@/lib/confidence";

export interface ShareOverlaySession {
  start_time: string;
  end_time?: string | null;
  peak_stage?: string | null;
  peak_confidence_pct?: number | null;
}

export interface ShareOverlayDrink {
  type: string;
  logged_at: string;
  duration_seconds?: number | null;
}

export function getFastestBeer(drinks: ShareOverlayDrink[]): number | null {
  return drinks
    .filter((drink) => drink.type === "beer" && drink.duration_seconds != null)
    .reduce<number | null>(
      (min, drink) =>
        drink.duration_seconds != null && (min == null || drink.duration_seconds < min)
          ? drink.duration_seconds
          : min,
      null
    );
}

export function getSessionDuration(session: ShareOverlaySession): string {
  if (!session.end_time) return "-";

  return formatSessionDuration(new Date(session.end_time).getTime() - new Date(session.start_time).getTime());
}

export function getDominantDrinkLabel(drinks: ShareOverlayDrink[]): string {
  if (drinks.length === 0) return "DRINKS";

  const counts = drinks.reduce<Record<string, number>>((acc, drink) => {
    acc[drink.type] = (acc[drink.type] ?? 0) + 1;
    return acc;
  }, {});
  const [type, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] ?? ["drink", 0];
  const normalized = type.toUpperCase();

  if (count === 1) return normalized;
  if (normalized.endsWith("S")) return normalized;
  return `${normalized}S`;
}

export function getFastestBeerLabel(drinks: ShareOverlayDrink[]): string {
  const fastestBeer = getFastestBeer(drinks);
  return fastestBeer != null ? formatDuration(fastestBeer) : "-";
}

export function DrunkvaMark({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" aria-hidden="true" className="shrink-0">
      <polygon points="11,14 2,18 11,6" fill="#C44D0E" opacity="0.85" />
      <polygon points="11,2 20,18 11,14 2,18" fill="var(--primary)" />
      <polygon points="11,8 16,16 11,14 6,16" fill="#C44D0E" opacity="0.5" />
    </svg>
  );
}
