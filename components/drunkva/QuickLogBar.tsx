"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";

const QUICK_TYPES = [
  { type: "shot", emoji: "\u{1F943}", label: "Shot" },
  { type: "wine", emoji: "\u{1F377}", label: "Wine" },
  { type: "beer", emoji: "\u{1F37A}", label: "Beer" },
  { type: "cocktail", emoji: "\u{1F379}", label: "Cocktail" },
  { type: "spirit", emoji: "\u{1F942}", label: "Spirit" },
] as const;

const MIN_REALISTIC_SECONDS = 10;

interface QuickLogBarProps {
  onLog: (type: string, options?: { manualDurationSeconds?: number }) => void;
  onOpenExtras: () => void;
  disabled?: boolean;
}

function formatTimer(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
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
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(50);
    }
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
        main ? "dv-drink-btn--main w-16 h-16 text-[28px]" : "w-12 h-12 text-[22px]",
        popped && "dv-pop"
      )}
    >
      {emoji}
    </button>
  );
}

export function QuickLogBar({ onLog, onOpenExtras, disabled }: QuickLogBarProps) {
  const [timerOpen, setTimerOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("beer");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!timerOpen) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerOpen]);

  const canSubmitTimedDrink = useMemo(
    () => elapsedSeconds >= MIN_REALISTIC_SECONDS,
    [elapsedSeconds]
  );

  const openTimer = () => {
    setSelectedType("beer");
    setElapsedSeconds(0);
    setTimerOpen(true);
  };

  const closeTimer = () => {
    setTimerOpen(false);
    setElapsedSeconds(0);
  };

  const submitTimedDrink = () => {
    if (!canSubmitTimedDrink) return;
    onLog(selectedType, { manualDurationSeconds: elapsedSeconds });
    closeTimer();
  };

  return (
    <>
      <div className="flex items-center justify-between gap-2 px-1" role="group" aria-label="Quick drink log">
        <DrinkButton
          id="log-shot"
          emoji="\u{1F943}"
          label="Shot"
          onClick={() => onLog("shot")}
          disabled={disabled}
        />

        <DrinkButton
          id="log-wine"
          emoji="\u{1F377}"
          label="Wine"
          onClick={() => onLog("wine")}
          disabled={disabled}
        />

        <DrinkButton
          id="log-beer-main"
          emoji="\u{1F37A}"
          label="Beer"
          onClick={() => onLog("beer")}
          disabled={disabled}
          main
        />

        <DrinkButton
          id="log-cocktail"
          emoji="\u{1F379}"
          label="Cocktail"
          onClick={() => onLog("cocktail")}
          disabled={disabled}
        />

        <Button
          id="open-stopwatch"
          variant="outline"
          size="icon"
          onClick={openTimer}
          aria-label="Open speed timer"
          disabled={disabled}
          className="w-12 h-12 rounded-full border-border bg-card text-muted-foreground shrink-0"
        >
          <Timer className="size-5" />
        </Button>

        <Button
          id="open-extras"
          variant="outline"
          size="icon"
          onClick={onOpenExtras}
          aria-label="Open extras"
          className="w-12 h-12 rounded-full border-border bg-card text-muted-foreground text-xl shrink-0"
        >
          \u22ef
        </Button>
      </div>

      <Drawer open={timerOpen} onOpenChange={setTimerOpen} direction="bottom">
        <DrawerContent className="bg-card border-border max-w-[390px] mx-auto pb-4">
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-foreground">Speed timer</DrawerTitle>
            <DrawerDescription className="text-muted-foreground">
              Time the drink, then tap done to log an official speed measurement.
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-4 space-y-4">
            <div className="rounded-xl border border-border bg-background/40 p-5 text-center">
              <div className="text-[44px] font-heading leading-none text-foreground">{formatTimer(elapsedSeconds)}</div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Elapsed</div>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {QUICK_TYPES.map((drink) => (
                <button
                  key={drink.type}
                  type="button"
                  onClick={() => setSelectedType(drink.type)}
                  className={cn(
                    "rounded-lg border px-2 py-2.5 text-center",
                    selectedType === drink.type
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-transparent text-muted-foreground"
                  )}
                >
                  <div className="text-lg leading-none">{drink.emoji}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-wide">{drink.label}</div>
                </button>
              ))}
            </div>

            <Button
              id="stopwatch-done"
              onClick={submitTimedDrink}
              disabled={!canSubmitTimedDrink}
              className="w-full bg-primary text-primary-foreground h-11"
            >
              Done - log drink
            </Button>
            {!canSubmitTimedDrink && (
              <p className="text-[11px] text-muted-foreground text-center">
                Timer must be at least {MIN_REALISTIC_SECONDS} seconds.
              </p>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
