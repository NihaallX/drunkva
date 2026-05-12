import { Pool, neonConfig } from "@neondatabase/serverless";
import { validateEnv } from "@/lib/env";

validateEnv();

if (typeof WebSocket !== "undefined") {
  neonConfig.webSocketConstructor = WebSocket;
}

const globalForDb = globalThis as typeof globalThis & {
  __drunkvaNeonPool?: Pool;
};

const pool = globalForDb.__drunkvaNeonPool ?? new Pool({
  connectionString: process.env.DATABASE_URL!,
});

if (process.env.NODE_ENV !== "production") {
  globalForDb.__drunkvaNeonPool = pool;
}

function buildQuery(strings: TemplateStringsArray, values: unknown[]) {
  let text = "";
  const params: unknown[] = [];

  for (let index = 0; index < strings.length; index += 1) {
    text += strings[index];
    if (index < values.length) {
      params.push(values[index]);
      text += `$${params.length}`;
    }
  }

  return { text, params };
}

type SqlRunner = {
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<any[]>;
  query: (text: string, params?: unknown[]) => Promise<any[]>;
};

type TransactionalSql = SqlRunner & {
  transaction: <T>(callback: (tx: SqlRunner) => Promise<T>) => Promise<T>;
};

function createSqlRunner(queryFn: (text: string, params?: unknown[]) => Promise<{ rows: any[] }>): SqlRunner {
  const runner = async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const { text, params } = buildQuery(strings, values);
    const result = await queryFn(text, params);
    return result.rows;
  };

  return Object.assign(runner, {
    query: async (text: string, params: unknown[] = []) => {
      const result = await queryFn(text, params);
      return result.rows;
    },
  });
}

async function transaction<T>(callback: (tx: SqlRunner) => Promise<T>) {
  const client = await pool.connect();
  const tx = createSqlRunner((text, params) => client.query(text, params));

  try {
    await client.query("BEGIN");
    const result = await callback(tx);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Ignore rollback failures so the original error is preserved.
    }
    throw error;
  } finally {
    client.release();
  }
}

const sql = Object.assign(createSqlRunner((text, params) => pool.query(text, params)), {
  transaction,
}) as TransactionalSql;

export default sql;

// Type helpers

export interface DbUser {
  id: string;
  clerk_id: string;
  real_name: string;
  alias: string | null;
  avatar_url: string | null;
  is_onboarded: boolean;
  terms_accepted_at: string | null;
  privacy_accepted_at: string | null;
  legal_consent_version: string | null;
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
  peak_confidence_updated_at: string | null;
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
  timing_method: "gap" | "stopwatch";
}

export interface DbCheers {
  id: string;
  session_id: string;
  from_user_id: string;
  created_at: string;
}
