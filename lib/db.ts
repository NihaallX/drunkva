import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);
export default sql;

// ─── Type helpers ────────────────────────────────────────────────────────────

export interface DbUser {
  id: string;
  clerk_id: string;
  real_name: string;
  alias: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface DbSession {
  id: string;
  user_id: string;
  venue_name: string | null;
  location_lat: number | null;
  location_lng: number | null;
  start_time: string;
  end_time: string | null;
  total_duration_seconds: number | null;
  active_duration_seconds: number | null;
  session_title: string | null;
  peak_confidence_pct: number;
  peak_stage: string;
  washroom_count: number;
  burp_count: number;
  chakna_level: "none" | "light" | "heavy";
  is_verified: boolean;
  created_at: string;
}

export interface DbDrink {
  id: string;
  session_id: string;
  type: "beer" | "shot" | "spirit" | "wine" | "cocktail";
  logged_at: string;
  duration_seconds: number | null;
}

export interface DbCheers {
  id: string;
  session_id: string;
  from_user_id: string;
  created_at: string;
}
