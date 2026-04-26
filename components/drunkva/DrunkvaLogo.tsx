"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface DrunkvaLogoProps {
  /** Height in px — defaults to 28 (nav size). Use 14–16 for overlays. */
  size?: number;
  showWordmark?: boolean;
  className?: string;
}

export function DrunkvaLogo({ size = 28, showWordmark = true, className }: DrunkvaLogoProps) {
  const [imgError, setImgError] = useState(false);
  const wordmarkSize = Math.round(size * 0.6);

  // Fix #9: use next/image instead of raw <img> for optimization + LCP
  if (!imgError) {
    return (
      <Image
        src="/drunkva-logo.png"
        alt="Drunkva"
        height={size}
        width={120}
        priority
        className={cn("object-contain block shrink-0", className)}
        style={{ height: size, width: "auto", maxHeight: size }}
        onError={() => setImgError(true)}
      />
    );
  }

  // SVG fallback — fix #4: use var(--primary) instead of #E8621A
  return (
    <div className={cn("flex items-center gap-1.5 shrink-0", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 22 22"
        fill="none"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <polygon points="11,14 2,18 11,6" fill="#C44D0E" opacity="0.85" />
        <polygon points="11,2 20,18 11,14 2,18" fill="var(--primary)" />
        <polygon points="11,8 16,16 11,14 6,16" fill="#C44D0E" opacity="0.5" />
      </svg>
      {showWordmark && (
        <span
          className="font-semibold tracking-wide text-primary leading-none"
          style={{ fontSize: wordmarkSize }}
        >
          DRUNKVA
        </span>
      )}
    </div>
  );
}
