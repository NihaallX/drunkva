"use client";

import { memo, useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface QuickLogBarProps {
  onLog: (type: string, options?: { manualDurationSeconds?: number }) => void;
  onOpenExtras: () => void;
  disabled?: boolean;
}



const DrinkButton = memo(function DrinkButton({
  id,
  emoji,
  label,
  onClick,
  disabled,
  main,
  title,
}: {
  id: string;
  emoji: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  main?: boolean;
  title: string;
}) {
  const [popped, setPopped] = useState(false);

  const handleClick = useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(50);
    }
    setPopped(true);
    setTimeout(() => setPopped(false), 200);
    onClick();
  }, [onClick]);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        id={id}
        onClick={handleClick}
        disabled={disabled}
        aria-label={`Log ${label}`}
        title={title}
        className={cn(
          "dv-drink-btn disabled:opacity-60",
          main ? "dv-drink-btn--main w-14 h-14 text-[28px]" : "w-11 h-11 text-[22px]",
          popped && "dv-pop"
        )}
      >
        <span className="dv-drink-icon leading-none">{emoji}</span>
      </button>
      <span className="dv-drink-label">{label}</span>
    </div>
  );
});

export function QuickLogBar({ onLog, onOpenExtras, disabled }: QuickLogBarProps) {
  return (
    <div className="flex items-center justify-between gap-1 px-1" role="group" aria-label="Quick drink log">
        <DrinkButton
          id="log-shot"
          emoji="🥃"
          label="Shot"
          onClick={() => onLog("shot")}
          disabled={disabled}
          title="Log a shot — long press to change type"
        />

        <DrinkButton
          id="log-wine"
          emoji="🍷"
          label="Wine"
          onClick={() => onLog("wine")}
          disabled={disabled}
          title="Log a wine — long press to change type"
        />

        <DrinkButton
          id="log-beer-main"
          emoji="🍺"
          label="Beer"
          onClick={() => onLog("beer")}
          disabled={disabled}
          title="Log a beer — long press to change type"
          main
        />

        <DrinkButton
          id="log-cocktail"
          emoji="🍹"
          label="Cocktail"
          onClick={() => onLog("cocktail")}
          disabled={disabled}
          title="Log a cocktail — long press to change type"
        />

        <DrinkButton
          id="log-spirit"
          emoji="🥂"
          label="Spirit"
          onClick={() => onLog("spirit")}
          disabled={disabled}
          title="Log a spirit — long press to change type"
        />



        <div className="flex flex-col items-center gap-1.5">
          <Button
            id="open-extras"
            variant="outline"
            size="icon"
            onClick={onOpenExtras}
            aria-label="Open extras"
            title="Burps, washroom trips, chakna"
            className="w-11 h-11 rounded-full border-border bg-card text-muted-foreground text-xl shrink-0"
          >
            ···
          </Button>
          <span className="dv-drink-label">More</span>
        </div>
    </div>
  );
}
