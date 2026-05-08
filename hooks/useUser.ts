"use client";

import { useEffect, useState } from "react";
import { useUser as useClerkUser } from "@clerk/nextjs";
import { clerkEnabled, getLocalUser, type AppUser } from "@/lib/mock-user";

interface UseUserResult {
  user: AppUser | null;
  isLoaded: boolean;
  isSignedIn: boolean;
}

export function useUser(): UseUserResult {
  if (clerkEnabled) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const clerk = useClerkUser();
    return {
      user: (clerk.user as AppUser | null) ?? null,
      isLoaded: clerk.isLoaded,
      isSignedIn: Boolean(clerk.isSignedIn),
    };
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useSimpleUser();
}

function useSimpleUser(): UseUserResult {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setUser(getLocalUser());
    setIsLoaded(true);
  }, []);

  return {
    user,
    isLoaded,
    isSignedIn: Boolean(user),
  };
}
