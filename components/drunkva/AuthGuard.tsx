"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clerkEnabled } from "@/lib/mock-user";
import { getSimpleUser, isSimpleLoggedIn } from "@/lib/simple-auth";

const PUBLIC_ROUTES = new Set(["/simple-auth", "/privacy", "/terms", "/landing"]);

declare global {
  interface Window {
    __dvSimpleFetchPatched?: boolean;
    __dvOriginalFetch?: typeof fetch;
  }
}

function isPublicPath(pathname: string) {
  if (PUBLIC_ROUTES.has(pathname)) return true;
  return pathname.startsWith("/simple-auth/");
}

function patchApiFetchHeaders() {
  if (typeof window === "undefined") return;

  if (window.__dvSimpleFetchPatched) return;
  const original = window.fetch.bind(window);
  window.__dvOriginalFetch = original;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const inputUrl =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    const isApiCall =
      inputUrl.startsWith("/api/") ||
      inputUrl.startsWith(`${window.location.origin}/api/`);

    if (!isApiCall) {
      return original(input, init);
    }

    const simpleUser = getSimpleUser();
    if (!simpleUser) {
      return original(input, init);
    }

    const nextHeaders = new Headers(init?.headers);
    nextHeaders.set("x-simple-user-id", simpleUser.id);
    nextHeaders.set("x-simple-user-email", simpleUser.email);

    return original(input, { ...init, headers: nextHeaders });
  };

  window.__dvSimpleFetchPatched = true;
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(clerkEnabled);

  useEffect(() => {
    if (clerkEnabled) {
      setChecked(true);
      return;
    }

    if (isPublicPath(pathname)) {
      setChecked(true);
      return;
    }

    if (!isSimpleLoggedIn()) {
      router.replace("/simple-auth");
      return;
    }

    patchApiFetchHeaders();
    setChecked(true);
  }, [pathname, router]);

  if (!checked) return null;
  return <>{children}</>;
}
