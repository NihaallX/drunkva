import { headers } from "next/headers";
import sql from "@/lib/db";
import type { DbUser } from "@/lib/db";

const clerkEnabled = process.env.NEXT_PUBLIC_CLERK_ENABLED === "true";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Returns the DB user for the current request.
 * - When NEXT_PUBLIC_CLERK_ENABLED=false: resolves from simple-auth headers
 *   injected into same-origin API fetch calls by AuthGuard.
 * - When true: uses Clerk auth() to resolve/create the user.
 */
export async function getOrCreateUser(): Promise<DbUser | null> {
  if (!clerkEnabled) {
    const h = await headers();
    const simpleUserId = h.get("x-simple-user-id")?.trim() ?? "";
    const simpleEmail = h.get("x-simple-user-email")?.trim().toLowerCase() ?? "";

    if (simpleUserId && UUID_RE.test(simpleUserId)) {
      const [byId] = await sql`SELECT * FROM users WHERE id = ${simpleUserId} LIMIT 1`;
      if (byId) return byId as DbUser;
    }

    if (simpleEmail) {
      const [byEmail] = await sql`SELECT * FROM users WHERE clerk_id = ${simpleEmail} LIMIT 1`;
      if (byEmail) return byEmail as DbUser;
    }

    return null;
  }

  const { auth, currentUser } = await import("@clerk/nextjs/server");
  const { userId } = await auth();
  if (!userId) return null;

  const existing = await sql`SELECT * FROM users WHERE clerk_id = ${userId}`;
  if (existing.length > 0) return existing[0] as DbUser;

  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const real_name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim() ||
    clerkUser.emailAddresses?.[0]?.emailAddress?.split("@")[0] ||
    clerkUser.phoneNumbers?.[0]?.phoneNumber ||
    "Drunkva User";

  const avatar_url = clerkUser.imageUrl ?? null;
  const email = clerkUser.emailAddresses?.[0]?.emailAddress?.toLowerCase() ?? null;

  const [created] = await sql`
    INSERT INTO users (clerk_id, email, real_name, avatar_url)
    VALUES (${userId}, ${email}, ${real_name}, ${avatar_url})
    ON CONFLICT (clerk_id) DO UPDATE SET
      avatar_url = EXCLUDED.avatar_url,
      email = COALESCE(users.email, EXCLUDED.email)
    RETURNING *
  `;

  return created as DbUser;
}

export async function requireAuth(): Promise<DbUser> {
  const user = await getOrCreateUser();
  if (!user) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}

export async function requireOnboarding(): Promise<DbUser> {
  const { redirect } = await import("next/navigation");

  if (!clerkEnabled) {
    redirect("/session");
    throw new Error("Simple auth mode");
  }

  const user = await getOrCreateUser();
  if (!user) {
    redirect("/sign-in");
    throw new Error("Unauthorized");
  }

  if (!user.is_onboarded) {
    redirect("/onboarding");
    throw new Error("Onboarding required");
  }

  return user;
}
