"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

export function DrunkvaLogo({ className }: { className?: string }) {
  return (
    <Image
      src="/drunkva-logo.png"
      alt="Drunkva"
      height={24}
      width={120}
      priority
      className={cn("h-6 w-auto object-contain", className)}
      style={{ filter: "brightness(0) invert(1)" }}
    />
  );
}
