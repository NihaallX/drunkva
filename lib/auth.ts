import sql from "@/lib/db";
import type { DbUser } from "@/lib/db";

const clerkEnabled = process.env.NEXT_PUBLIC_CLERK_ENABLED === "true";

// Fixed mock clerk_id used when Clerk is disabled
const MOCK_CLERK_ID = "test-clerk-local-dev";

/**
 * Returns the DB user for the current request.
 * - When NEXT_PUBLIC_CLERK_ENABLED=false: inserts a local mock user on first call,
 *   then fetches it as-is on every subsequent call — never overwrites real_name/alias.
 * - When true: uses real Clerk auth() to resolve the user.
 * Returns null if not authenticated.
 */
export async function getOrCreateUser(): Promise<DbUser | null> {
  if (!clerkEnabled) {
    // ON CONFLICT DO NOTHING — only insert once, never overwrite onboarding data
    await sql`
      INSERT INTO users (clerk_id, real_name, alias, avatar_url)
      VALUES (${MOCK_CLERK_ID}, 'Test User', 'testuser', null)
      ON CONFLICT (clerk_id) DO NOTHING
    `;
    const [user] = await sql`SELECT * FROM users WHERE clerk_id = ${MOCK_CLERK_ID}`;
    return user as DbUser;
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

  const [created] = await sql`
    INSERT INTO users (clerk_id, real_name, avatar_url)
    VALUES (${userId}, ${real_name}, ${avatar_url})
    ON CONFLICT (clerk_id) DO UPDATE SET
      avatar_url = EXCLUDED.avatar_url
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
