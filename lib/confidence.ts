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

    if (gapMinutes > 90) {
      const decayPeriods = Math.floor((gapMinutes - 90) / 30);
      const decay = decayPeriods * 5;
      confidence = Math.max(10, confidence - decay);
    }
  }

  confidence = Math.max(10, Math.min(99, confidence));

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
  let confidence = 10;

  for (let i = 0; i < sorted.length; i++) {
    const drinkTime = new Date(sorted[i].logged_at).getTime();
    const weight = DRINK_WEIGHTS[sorted[i].type] ?? 12;

    // Apply decay since previous point
    if (i > 0) {
      const prevTime = new Date(sorted[i - 1].logged_at).getTime();
      const gapMinutes = (drinkTime - prevTime) / 60000;
      if (gapMinutes > 90) {
        const decayPeriods = Math.floor((gapMinutes - 90) / 30);
        confidence = Math.max(10, confidence - decayPeriods * 5);
      }
    }

    confidence = Math.min(99, confidence + weight);

    points.push({
      time: drinkTime - startMs,
      confidence: Math.round(confidence),
      drinkType: sorted[i].type,
      label: sorted[i].type.charAt(0).toUpperCase() + sorted[i].type.slice(1),
    });
  }

  return points;
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
