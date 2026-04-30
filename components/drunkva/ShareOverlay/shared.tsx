"use client";

import { formatDuration } from "@/lib/confidence";
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

export function formatOverlayDuration(seconds: number | null | undefined): string {
  if (seconds == null) return "-";

  const totalSeconds = Math.max(0, Math.floor(seconds));
  const totalMinutes = Math.floor(totalSeconds / 60);
  const remainderSeconds = totalSeconds % 60;

  if (totalMinutes >= 60) {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}:${m.toString().padStart(2, "0")}`;
  }

  return `${totalMinutes}:${remainderSeconds.toString().padStart(2, "0")}`;
}

export function getSessionDuration(session: ShareOverlaySession): string {
  if (session.active_duration_seconds == null) return "-";
  return formatOverlayDuration(session.active_duration_seconds);
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
  const types = Array.from(new Set(drinks.map((d) => d.type.toLowerCase())));
  if (types.length > 1) {
    return "MIXED";
  }
  return pluralizeDrinkType(getDominantDrinkType(drinks, session));
}

export function getFastestStat(drinks: ShareOverlayDrink[], session?: ShareOverlaySession): {
  value: string;
  isStopwatch: boolean;
} {
  void session;
  const fastest = getPreferredFastestDrink(drinks, "beer");

  if (!fastest || fastest.duration_seconds == null) {
    return { value: "-", isStopwatch: false };
  }

  return {
    value: formatDuration(fastest.duration_seconds),
    isStopwatch: fastest.timing_method === "stopwatch",
  };
}

// ---------------------------------------------------------------------------
// Shared UI primitive used by all share overlay templates
// ---------------------------------------------------------------------------

export function Stat({
  value,
  label,
  unit,
  showPR,
}: {
  value: string | number;
  label: string;
  unit?: string;
  showPR?: boolean;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      {/* Label sits ABOVE the number — Strava layout */}
      <div className="dv-overlay-label">{label}</div>
      <div className="flex items-end justify-center gap-1.5">
        <span className="dv-overlay-number">{value}</span>
        {unit && <span className="dv-overlay-unit pb-2">{unit}</span>}
        {showPR && (
          <span className="mb-3 rounded-full bg-primary px-2 py-1 text-[10px] font-medium leading-none text-white">
            PR
          </span>
        )}
      </div>
    </div>
  );
}
