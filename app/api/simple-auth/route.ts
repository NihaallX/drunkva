import { NextResponse } from "next/server";
import sql from "@/lib/db";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
interface SimpleAuthDbUser {
  id: string;
  real_name: string;
  alias: string | null;
  clerk_id: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const emailRaw = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const realName = typeof body?.real_name === "string" ? body.real_name.trim() : "";
    const aliasRaw = typeof body?.alias === "string" ? body.alias.trim() : "";

    if (!EMAIL_RE.test(emailRaw)) {
      return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
    }
    if (!realName) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }
    if (realName.length > 60) {
      return NextResponse.json({ error: "Name is too long." }, { status: 400 });
    }
    if (aliasRaw.length > 30) {
      return NextResponse.json({ error: "Alias is too long." }, { status: 400 });
    }

    const alias = aliasRaw || null;

    let user: SimpleAuthDbUser | undefined;

    const existingRows = await sql`
      SELECT id, real_name, alias, clerk_id
      FROM users
      WHERE clerk_id = ${emailRaw}
      LIMIT 1
    `;
    user = existingRows[0] as SimpleAuthDbUser | undefined;

    if (!user) {
      const createdRows = await sql`
        INSERT INTO users (clerk_id, real_name, alias, is_onboarded)
        VALUES (${emailRaw}, ${realName}, ${alias}, TRUE)
        RETURNING id, real_name, alias, clerk_id
      `;
      user = createdRows[0] as SimpleAuthDbUser | undefined;
    }

    if (!user) {
      return NextResponse.json({ error: "Unable to sign in." }, { status: 500 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        real_name: user.real_name,
        alias: user.alias,
        email: user.clerk_id,
      },
    });
  } catch (err) {
    console.error("POST /api/simple-auth failed", err);
    return NextResponse.json({ error: "Failed to sign in. Please try again." }, { status: 500 });
  }
}
