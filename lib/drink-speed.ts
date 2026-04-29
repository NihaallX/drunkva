export const MAX_SPEED_SECONDS = 900;
export const MIN_REALISTIC_SECONDS = 10;

export type TimingMethod = "gap" | "stopwatch";

export interface SpeedDrink {
  type: string;
  duration_seconds?: number | null;
  timing_method?: TimingMethod | null;
}

export function normalizeDuration(durationSeconds: number | null | undefined): number | null {
  if (durationSeconds == null) return null;
  if (durationSeconds < MIN_REALISTIC_SECONDS) return null;
  if (durationSeconds > MAX_SPEED_SECONDS) return null;
  return Math.floor(durationSeconds);
}

export function getPreferredFastestDrink<T extends SpeedDrink>(
  drinks: T[],
  drinkType: string
): T | null {
  const candidates = drinks
    .filter((drink) => drink.type === drinkType)
    .filter((drink) => normalizeDuration(drink.duration_seconds) != null);

  if (candidates.length === 0) return null;

  return candidates.sort((a, b) => {
    const aStopwatch = a.timing_method === "stopwatch";
    const bStopwatch = b.timing_method === "stopwatch";
    if (aStopwatch && !bStopwatch) return -1;
    if (bStopwatch && !aStopwatch) return 1;
    return (normalizeDuration(a.duration_seconds) ?? MAX_SPEED_SECONDS) - (normalizeDuration(b.duration_seconds) ?? MAX_SPEED_SECONDS);
  })[0] ?? null;
}
