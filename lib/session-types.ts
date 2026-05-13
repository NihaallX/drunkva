export type DrinkTimingMethod = "gap" | "stopwatch";

export interface DrinkLog {
  id?: string;
  type: string;
  logged_at: string;
  duration_seconds?: number | null;
  timing_method?: DrinkTimingMethod;
}

export interface SessionState {
  id: string | null;
  venueName: string;
  startTime: string | null;
  endTime: string | null;
  drinks: DrinkLog[];
  washroomCount: number;
  burpCount: number;
  chaknaLevel: "none" | "light" | "heavy";
  fastestBeerSeconds: number | null;
  fastestBeerIsPR: boolean;
}
