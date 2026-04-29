import { formatDuration } from "@/lib/confidence";
import { formatLiveDuration } from "@/lib/utils";

export interface ShareOverlaySession {
  start_time: string;
  end_time?: string | null;
  active_duration_seconds?: number | null;
  total_duration_seconds?: number | null;
  peak_stage?: string | null;
  peak_confidence_pct?: number | null;
  dominantDrink?: string | null;
  dominant_drink_type?: string | null;
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
  if (session.active_duration_seconds == null) return "â€”";
  return formatLiveDuration(session.active_duration_seconds);
}

function pluralizeDrinkType(type: string): string {
  const normalized = type.toUpperCase();
  const labels: Record<string, string> = {
    BEER: "BEERS",
    SHOT: "SHOTS",
    WINE: "WINES",
    COCKTAIL: "COCKTAILS",
    SPIRIT: "SPIRITS",
  };

  return labels[normalized] ?? (normalized.endsWith("S") ? normalized : `${normalized}S`);
}

export function getDominantDrinkLabel(drinks: ShareOverlayDrink[], session?: ShareOverlaySession): string {
  const sessionDominant = session?.dominantDrink ?? session?.dominant_drink_type;
  if (sessionDominant) return pluralizeDrinkType(sessionDominant);
  if (drinks.length === 0) return "DRINKS";

  const counts = drinks.reduce<Record<string, number>>((acc, drink) => {
    acc[drink.type] = (acc[drink.type] ?? 0) + 1;
    return acc;
  }, {});
  const [type] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] ?? ["drink", 0];
  return pluralizeDrinkType(type);
}

export function getFastestBeerLabel(drinks: ShareOverlayDrink[]): string {
  const fastestBeer = getFastestBeer(drinks);
  return fastestBeer != null ? formatDuration(fastestBeer) : "â€”";
}
