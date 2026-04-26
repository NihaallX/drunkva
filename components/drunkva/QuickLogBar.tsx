"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Exact order: Shot · Wine · [Beer — center] · Cocktail · ···
const SECONDARY_LEFT = [
  { type: "shot", emoji: "🥃", label: "Shot" },
  { type: "wine", emoji: "🍷", label: "Wine" },
];

const SECONDARY_RIGHT = [
  { type: "cocktail", emoji: "🍹", label: "Cocktail" },
];

interface QuickLogBarProps {
  onLog: (type: string) => void;
  onOpenExtras: () => void;
  disabled?: boolean;
}

function DrinkButton({
  id,
  emoji,
  label,
  onClick,
  disabled,
  main,
}: {
  id: string;
  emoji: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  main?: boolean;
}) {
  const [popped, setPopped] = useState(false);

  const handleClick = useCallback(() => {
    // Haptic feedback
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(50);
    }
    // Bounce animation
    setPopped(true);
    setTimeout(() => setPopped(false), 200);
    onClick();
  }, [onClick]);

  return (
    <button
      id={id}
      onClick={handleClick}
      disabled={disabled}
      aria-label={`Log ${label}`}
      className={cn(
        "dv-drink-btn disabled:opacity-60",
        main
          ? "dv-drink-btn--main w-16 h-16 text-[28px]"
          : "w-12 h-12 text-[22px]",
        popped && "dv-pop"
      )}
    >
      {emoji}
    </button>
  );
}

export function QuickLogBar({ onLog, onOpenExtras, disabled }: QuickLogBarProps) {
  return (
    <div
      className="flex items-center justify-between gap-2 px-1"
      role="group"
      aria-label="Quick drink log"
    >
      {/* Left: Shot, Wine */}
      {SECONDARY_LEFT.map((d) => (
        <DrinkButton
          key={d.type}
          id={`log-${d.type}`}
          emoji={d.emoji}
          label={d.label}
          onClick={() => onLog(d.type)}
          disabled={disabled}
        />
      ))}

      {/* Center: Beer — larger, orange, glowing */}
      <DrinkButton
        id="log-beer-main"
        emoji="🍺"
        label="Beer"
        onClick={() => onLog("beer")}
        disabled={disabled}
        main
      />

      {/* Right: Cocktail */}
      {SECONDARY_RIGHT.map((d) => (
        <DrinkButton
          key={d.type}
          id={`log-${d.type}`}
          emoji={d.emoji}
          label={d.label}
          onClick={() => onLog(d.type)}
          disabled={disabled}
        />
      ))}

      {/* Extras ··· */}
      <Button
        id="open-extras"
        variant="outline"
        size="icon"
        onClick={onOpenExtras}
        aria-label="Open extras"
        className="w-12 h-12 rounded-full border-border bg-card text-muted-foreground text-xl shrink-0"
      >
        ⋯
      </Button>
    </div>
  );
}
