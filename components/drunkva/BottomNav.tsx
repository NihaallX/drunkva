"use client";

import { memo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// Fix #4: use CSS variables instead of hardcoded hex values in SVG props
const ACTIVE_COLOR = "var(--primary)";
const INACTIVE_COLOR = "rgba(255,255,255,0.35)";

const tabs = [
  {
    id: "session",
    label: "Session",
    href: "/session",
    icon: (active: boolean) => (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <circle
          cx="9" cy="9" r="7"
          stroke={active ? ACTIVE_COLOR : INACTIVE_COLOR}
          strokeWidth="1.2"
        />
        <circle
          cx="9" cy="9" r="2.5"
          fill={active ? ACTIVE_COLOR : INACTIVE_COLOR}
        />
      </svg>
    ),
  },
  {
    id: "feed",
    label: "Feed",
    href: "/feed",
    icon: (active: boolean) => (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <path
          d="M3 14 L7 8 L10 11 L13 5 L16 9"
          stroke={active ? ACTIVE_COLOR : INACTIVE_COLOR}
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: "profile",
    label: "Profile",
    href: "/profile",
    icon: (active: boolean) => (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <circle
          cx="9" cy="7" r="3.5"
          stroke={active ? ACTIVE_COLOR : INACTIVE_COLOR}
          strokeWidth="1.2"
        />
        <path
          d="M2 16 C2 12 16 12 16 16"
          stroke={active ? ACTIVE_COLOR : INACTIVE_COLOR}
          strokeWidth="1.2"
        />
      </svg>
    ),
  },
];

function BottomNavInner() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <nav className="dv-bottom-nav" role="navigation" aria-label="Main navigation">
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <button
            key={tab.id}
            id={`nav-${tab.id}`}
            onClick={() => router.push(tab.href)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 flex-1 py-2.5 border-0 bg-transparent cursor-pointer",
              "text-[10px] tracking-wide",
              // Fix #5: use active: not hover: for touch-friendly states
              "active:opacity-70 transition-opacity",
              active ? "text-primary" : "text-muted-foreground"
            )}
            aria-current={active ? "page" : undefined}
          >
            {tab.icon(active)}
            <span className={cn("font-normal", active && "font-medium")}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

// BottomNav only depends on pathname — memoizing it prevents re-renders
// triggered by parent state changes (e.g. drink logs on the session page).
export const BottomNav = memo(BottomNavInner);
