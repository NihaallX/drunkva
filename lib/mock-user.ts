import { getSimpleUser, type SimpleAuthUser } from "@/lib/simple-auth";

/**
 * Client-side user shape used by UI components across Clerk and simple-auth modes.
 * `.id` is the DB UUID in simple-auth mode and Clerk user id in Clerk mode.
 */
export interface AppUser {
  id: string;
  dbId?: string;
  real_name: string;
  alias: string | null;
  firstName: string;
  lastName: string;
  fullName: string;
  imageUrl: string | null;
  emailAddresses: { emailAddress: string }[];
  phoneNumbers: { phoneNumber: string }[];
}

const DEFAULT_MOCK_USER: AppUser = {
  id: "mock-clerk-user",
  dbId: "mock-db-user",
  real_name: "Test User",
  alias: "testuser",
  firstName: "Test",
  lastName: "User",
  fullName: "Test User",
  imageUrl: null,
  emailAddresses: [{ emailAddress: "test@drunkva.app" }],
  phoneNumbers: [],
};

function splitName(fullName: string) {
  const trimmed = fullName.trim();
  if (!trimmed) return { firstName: "Drunkva", lastName: "User" };
  const parts = trimmed.split(/\s+/);
  const firstName = parts[0] ?? "Drunkva";
  const lastName = parts.slice(1).join(" ");
  return { firstName, lastName };
}

export function toAppUser(simpleUser: SimpleAuthUser): AppUser {
  const { firstName, lastName } = splitName(simpleUser.real_name);
  return {
    id: simpleUser.id,
    dbId: simpleUser.id,
    real_name: simpleUser.real_name,
    alias: simpleUser.alias,
    firstName,
    lastName,
    fullName: simpleUser.real_name,
    imageUrl: null,
    emailAddresses: [{ emailAddress: simpleUser.email }],
    phoneNumbers: [],
  };
}

export function getLocalUser(): AppUser | null {
  const simpleUser = getSimpleUser();
  if (!simpleUser) return null;
  return toAppUser(simpleUser);
}

// Backward compatibility export used by older code paths.
// In simple-auth mode this resolves to the current local user if present.
export const MOCK_USER: AppUser =
  (typeof window !== "undefined" && getLocalUser()) || DEFAULT_MOCK_USER;

export const clerkEnabled = process.env.NEXT_PUBLIC_CLERK_ENABLED === "true";
