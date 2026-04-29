import { formatDuration } from "@/lib/confidence";
import { formatLiveDuration } from "@/lib/utils";
import { getPreferredFastestDrink, type TimingMethod } from "@/lib/drink-speed";

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
  timing_method?: TimingMethod;
}

export function getSessionDuration(session: ShareOverlaySession): string {
  if (session.active_duration_seconds == null) return "-";
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

export function getDominantDrinkType(drinks: ShareOverlayDrink[], session?: ShareOverlaySession): string {
  const sessionDominant = session?.dominantDrink ?? session?.dominant_drink_type;
  if (sessionDominant) return sessionDominant;
  if (drinks.length === 0) return "beer";

  const counts = drinks.reduce<Record<string, number>>((acc, drink) => {
    acc[drink.type] = (acc[drink.type] ?? 0) + 1;
    return acc;
  }, {});
  const [type] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] ?? ["beer", 0];
  return type;
}

export function getDominantDrinkLabel(drinks: ShareOverlayDrink[], session?: ShareOverlaySession): string {
  return pluralizeDrinkType(getDominantDrinkType(drinks, session));
}

export function getFastestStat(drinks: ShareOverlayDrink[], session?: ShareOverlaySession): {
  value: string;
  label: string;
  isStopwatch: boolean;
} {
  const dominantType = getDominantDrinkType(drinks, session);
  const fastest = getPreferredFastestDrink(drinks, dominantType);

  if (!fastest || fastest.duration_seconds == null) {
    return { value: "-", label: "FASTEST", isStopwatch: false };
  }

  return {
    value: formatDuration(fastest.duration_seconds),
    label: `FASTEST ${dominantType.toUpperCase()}`,
    isStopwatch: fastest.timing_method === "stopwatch",
  };
}
