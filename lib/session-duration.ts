export const ACTIVE_GAP_CAP_SECONDS = 2 * 60 * 60;

export interface SessionDrinkTime {
  logged_at: string;
}

function toTimestampMs(value: string): number | null {
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function sortDrinkTimesMs(drinks: SessionDrinkTime[]): number[] {
  return drinks
    .map((drink) => toTimestampMs(drink.logged_at))
    .filter((ms): ms is number => ms != null)
    .sort((a, b) => a - b);
}

export function calculateTotalDurationSeconds(startTime: string, endTime: string): number {
  const startMs = toTimestampMs(startTime);
  const endMs = toTimestampMs(endTime);
  if (startMs == null || endMs == null) return 0;
  return Math.max(0, Math.floor((endMs - startMs) / 1000));
}

export function calculateActiveDurationSeconds(
  startTime: string,
  drinks: SessionDrinkTime[],
  endTime: string
): number | null {
  const startMs = toTimestampMs(startTime);
  const endMs = toTimestampMs(endTime);
  if (startMs == null || endMs == null) return null;

  const sortedDrinkTimes = sortDrinkTimesMs(drinks);
  let activeSeconds = 0;

  if (sortedDrinkTimes.length === 0) {
    const totalGap = Math.max(0, Math.floor((endMs - startMs) / 1000));
    return Math.min(totalGap, ACTIVE_GAP_CAP_SECONDS);
  }

  const firstGap = Math.max(0, Math.floor((sortedDrinkTimes[0] - startMs) / 1000));
  activeSeconds += Math.min(firstGap, ACTIVE_GAP_CAP_SECONDS);

  for (let i = 1; i < sortedDrinkTimes.length; i++) {
    const gapSeconds = Math.max(0, Math.floor((sortedDrinkTimes[i] - sortedDrinkTimes[i - 1]) / 1000));
    activeSeconds += Math.min(gapSeconds, ACTIVE_GAP_CAP_SECONDS);
  }

  const lastDrinkMs = sortedDrinkTimes[sortedDrinkTimes.length - 1];
  const tailSeconds = Math.max(0, Math.floor((endMs - lastDrinkMs) / 1000));
  activeSeconds += Math.min(tailSeconds, ACTIVE_GAP_CAP_SECONDS);

  return activeSeconds;
}

export function calculateLiveActiveDuration(
  startTime: string | null,
  drinks: SessionDrinkTime[],
  nowMs: number
): {
  activeDuration: number;
  isPaused: boolean;
} {
  if (!startTime) return { activeDuration: 0, isPaused: false };
  const startMs = toTimestampMs(startTime);
  if (startMs == null) return { activeDuration: 0, isPaused: false };

  const sortedDrinkTimes = sortDrinkTimesMs(drinks);
  let activeSeconds = 0;

  if (sortedDrinkTimes.length === 0) {
    const totalGap = Math.max(0, Math.floor((nowMs - startMs) / 1000));
    const paused = totalGap >= ACTIVE_GAP_CAP_SECONDS;
    return { activeDuration: Math.min(totalGap, ACTIVE_GAP_CAP_SECONDS), isPaused: paused };
  }

  const firstGap = Math.max(0, Math.floor((sortedDrinkTimes[0] - startMs) / 1000));
  activeSeconds += Math.min(firstGap, ACTIVE_GAP_CAP_SECONDS);

  for (let i = 1; i < sortedDrinkTimes.length; i++) {
    const gapSeconds = Math.max(0, Math.floor((sortedDrinkTimes[i] - sortedDrinkTimes[i - 1]) / 1000));
    activeSeconds += Math.min(gapSeconds, ACTIVE_GAP_CAP_SECONDS);
  }

  const lastDrinkMs = sortedDrinkTimes[sortedDrinkTimes.length - 1];
  const sinceLastDrinkSeconds = Math.max(0, Math.floor((nowMs - lastDrinkMs) / 1000));
  const paused = sinceLastDrinkSeconds >= ACTIVE_GAP_CAP_SECONDS;
  activeSeconds += Math.min(sinceLastDrinkSeconds, ACTIVE_GAP_CAP_SECONDS);

  return { activeDuration: activeSeconds, isPaused: paused };
}
