"use client";

import { cn } from "@/lib/utils";

export function DrunkvaLogo({ className }: { className?: string }) {
  return (
    <img
      src="/drunkva-wordmark-white.png"
      alt="Drunkva"
      className={cn("h-6 w-auto object-contain", className)}
    />
  );
}
