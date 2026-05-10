import { NextResponse } from "next/server";
import sql from "@/lib/db";

export const revalidate = 300;

export async function GET() {
  try {
    const [sessionsRow] = await sql`SELECT COUNT(*)::int AS count FROM sessions`;
    const [drinksRow] = await sql`SELECT COUNT(*)::int AS count FROM drinks`;

    return NextResponse.json(
      {
        nightsTracked: sessionsRow?.count ?? 0,
        drinksLogged: drinksRow?.count ?? 0,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (err) {
    console.error("GET /api/landing-stats failed", err);
    return NextResponse.json(
      {
        nightsTracked: 0,
        drinksLogged: 0,
      },
      { status: 500 }
    );
  }
}
