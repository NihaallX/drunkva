"use client";

import { useState } from "react";
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

  if (!imgError) {
    return (
      <img
        src="/drunkva-logo.png"
        alt="Drunkva"
        height={size}
        width="auto"
        className={cn("object-contain block shrink-0", className)}
        style={{ height: size, width: "auto", maxHeight: size }}
        onError={() => setImgError(true)}
      />
    );
  }

  // SVG fallback — always proportional to size
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
        <polygon points="11,2 20,18 11,14 2,18" fill="#E8621A" />
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
