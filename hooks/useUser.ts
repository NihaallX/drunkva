"use client";

/**
 * Shared useUser hook — single source of truth for the Clerk / mock-user
 * decision. Import this everywhere instead of copy-pasting the conditional
 * shim into every page.
 *
 * Returns the same shape as Clerk's useUser() so consumers are compatible
 * regardless of whether Clerk is enabled.
 */

import { MOCK_USER, clerkEnabled } from "@/lib/mock-user";
import { useUser as useClerkUser } from "@clerk/nextjs";

type MockUser = typeof MOCK_USER;

// The hook returns the minimal intersection that all consumers need.
// `user` is null while Clerk is loading (Clerk behaviour) or always
// present when using the mock (dev behaviour).
export function useUser(): { user: MockUser | null } {
  // Rules of hooks: we cannot call hooks conditionally, so we always
  // call the Clerk hook but only use its result when Clerk is enabled.
  // When Clerk is disabled the Clerk provider is not mounted, so the
  // hook would throw — we use a safe fallback hook instead.
  if (!clerkEnabled) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useMockUser();
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useClerkUser() as { user: MockUser | null };
}

// Stable reference — never re-creates the object so memo comparisons hold.
const MOCK_RESULT = { user: MOCK_USER } as const;
function useMockUser() {
  return MOCK_RESULT;
}
