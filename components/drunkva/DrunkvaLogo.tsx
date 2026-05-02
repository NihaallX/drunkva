"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

export function DrunkvaLogo({ className }: { className?: string }) {
  return (
    <Image
      src="/drunkva-wordmark-white.png"
      alt="Drunkva"
      height={24}
      width={120}
      className={cn("h-6 w-auto object-contain", className)}
    />
  );
}
