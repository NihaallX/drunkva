/**
 * Client-side mock user shape returned by the useUser() hook shim.
 * Note: .id is the Clerk user ID string, not the DB UUID.
 * The actual DB UUID is resolved server-side by getOrCreateUser() via auth.ts.
 */
export const MOCK_USER = {
  id: "mock-clerk-user",
  real_name: "Test User",
  alias: "testuser",
  firstName: "Test",
  lastName: "User",
  fullName: "Test User",
  imageUrl: null as string | null,
  emailAddresses: [{ emailAddress: "test@drunkva.app" }],
  phoneNumbers: [] as { phoneNumber: string }[],
};

export const clerkEnabled =
  process.env.NEXT_PUBLIC_CLERK_ENABLED === "true";
