// ─── Drink weights ────────────────────────────────────────────────────────────
export const DRINK_WEIGHTS: Record<string, number> = {
  beer: 12,
  wine: 10,
  cocktail: 13,
  spirit: 15,
  shot: 18,
};

// ─── Stage thresholds ─────────────────────────────────────────────────────────
export const STAGES = [
  { name: "Baseline", min: 10, max: 15 },
  { name: "Bullish", min: 16, max: 35 },
  { name: "Ascend", min: 36, max: 58 },
  { name: "Climax", min: 59, max: 82 },
  { name: "Half-life", min: 83, max: 92 },
  { name: "Credits", min: 93, max: 99 },
];

const MIN_CONFIDENCE = 10;
const MAX_CONFIDENCE = 99;
const DECAY_GRACE_MINUTES = 90;
const DECAY_WINDOW_MINUTES = 30;
const DECAY_PER_WINDOW = 5;

export function getStage(pct: number): string {
  for (const s of STAGES) {
    if (pct >= s.min && pct <= s.max) return s.name;
  }
  return pct < 10 ? "Baseline" : "Credits";
}

export function getStageProgress(pct: number): number {
  // Returns 0-1 within the full 10-99 range for the progress bar
  return Math.max(0, Math.min(1, (pct - 10) / 89));
}

// ─── Core confidence calculation ─────────────────────────────────────────────
export interface DrinkLog {
  type: string;
  logged_at: string; // ISO string
}

export interface ConfidenceResult {
  current: number;   // after decay
  peak: number;      // highest reached
  peakStage: string;
  stage: string;     // current stage
  progressPct: number; // 0-100 for progress bar
}

export function calculateConfidence(drinks: DrinkLog[]): ConfidenceResult {
  if (drinks.length === 0) {
    return { current: 10, peak: 10, peakStage: "Baseline", stage: "Baseline", progressPct: 0 };
  }

  const sorted = [...drinks].sort(
    (a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime()
  );

  let confidence = 10;
  let peak = 10;
  const now = Date.now();

  for (let i = 0; i < sorted.length; i++) {
    const weight = DRINK_WEIGHTS[sorted[i].type] ?? 12;
    confidence = Math.min(99, confidence + weight);
    if (confidence > peak) peak = confidence;

    // Time decay between consecutive drinks (or last drink to now)
    const nextTime =
      i < sorted.length - 1
        ? new Date(sorted[i + 1].logged_at).getTime()
        : now;
    const currentTime = new Date(sorted[i].logged_at).getTime();
    const gapMinutes = (nextTime - currentTime) / 60000;

    if (gapMinutes > DECAY_GRACE_MINUTES) {
      const decayPeriods = Math.floor((gapMinutes - DECAY_GRACE_MINUTES) / DECAY_WINDOW_MINUTES);
      const decay = decayPeriods * DECAY_PER_WINDOW;
      confidence = Math.max(MIN_CONFIDENCE, confidence - decay);
    }
  }

  confidence = Math.max(MIN_CONFIDENCE, Math.min(MAX_CONFIDENCE, confidence));

  return {
    current: Math.round(confidence),
    peak: Math.round(peak),
    peakStage: getStage(peak),
    stage: getStage(confidence),
    progressPct: Math.round(getStageProgress(confidence) * 100),
  };
}

// ─── Reconstruct curve for Recharts ──────────────────────────────────────────
export interface CurvePoint {
  time: number;       // ms since session start
  confidence: number; // 0-99
  drinkType?: string;
  label?: string;
}

export function reconstructCurve(
  drinks: DrinkLog[],
  sessionStart: string
): CurvePoint[] {
  if (drinks.length === 0) return [];

  const startMs = new Date(sessionStart).getTime();
  const sorted = [...drinks].sort(
    (a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime()
  );

  const points: CurvePoint[] = [{ time: 0, confidence: 10 }];
  let confidence = MIN_CONFIDENCE;

  for (let i = 0; i < sorted.length; i++) {
    const drinkTime = new Date(sorted[i].logged_at).getTime();
    const weight = DRINK_WEIGHTS[sorted[i].type] ?? 12;

    // Apply decay since previous point
    if (i > 0) {
      const prevTime = new Date(sorted[i - 1].logged_at).getTime();
      const gapMinutes = (drinkTime - prevTime) / 60000;
      if (gapMinutes > DECAY_GRACE_MINUTES) {
        const decayPeriods = Math.floor((gapMinutes - DECAY_GRACE_MINUTES) / DECAY_WINDOW_MINUTES);
        confidence = Math.max(MIN_CONFIDENCE, confidence - decayPeriods * DECAY_PER_WINDOW);
      }
    }

    confidence = Math.min(MAX_CONFIDENCE, confidence + weight);

    points.push({
      time: drinkTime - startMs,
      confidence: Math.round(confidence),
      drinkType: sorted[i].type,
      label: sorted[i].type.charAt(0).toUpperCase() + sorted[i].type.slice(1),
    });
  }

  return points;
}

export function getDecayedPeakConfidence(
  storedPeakPct: number,
  lastUpdatedAt: string | Date | null | undefined,
  nowMs = Date.now()
): { confidence: number; stage: string } {
  const boundedPeak = Math.max(MIN_CONFIDENCE, Math.min(MAX_CONFIDENCE, Math.round(storedPeakPct)));
  if (!lastUpdatedAt) {
    return { confidence: boundedPeak, stage: getStage(boundedPeak) };
  }

  const updatedMs = new Date(lastUpdatedAt).getTime();
  if (!Number.isFinite(updatedMs) || nowMs <= updatedMs) {
    return { confidence: boundedPeak, stage: getStage(boundedPeak) };
  }

  const elapsedMinutes = (nowMs - updatedMs) / 60000;
  if (elapsedMinutes <= DECAY_GRACE_MINUTES) {
    return { confidence: boundedPeak, stage: getStage(boundedPeak) };
  }

  const decayPeriods = Math.floor((elapsedMinutes - DECAY_GRACE_MINUTES) / DECAY_WINDOW_MINUTES);
  const decayed = Math.max(MIN_CONFIDENCE, boundedPeak - decayPeriods * DECAY_PER_WINDOW);

  return { confidence: decayed, stage: getStage(decayed) };
}

// ─── Format helpers ───────────────────────────────────────────────────────────
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatSessionDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}:${m.toString().padStart(2, "0")}`;
}
