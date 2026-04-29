"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";

const QUICK_TYPES = [
  { type: "shot", emoji: "🥃", label: "Shot" },
  { type: "wine", emoji: "🍷", label: "Wine" },
  { type: "beer", emoji: "🍺", label: "Beer" },
  { type: "cocktail", emoji: "🍹", label: "Cocktail" },
  { type: "spirit", emoji: "🥂", label: "Spirit" },
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

        <div className="flex flex-col items-center gap-1.5 hidden">
          <Button
            id="open-stopwatch"
            variant="outline"
            size="icon"
            onClick={openTimer}
            aria-label="Open speed timer"
            title="Open speed timer"
            disabled={disabled}
            className="w-11 h-11 rounded-full border-border bg-card text-muted-foreground shrink-0"
          >
            <Timer className="size-5" />
          </Button>
          <span className="dv-drink-label">Timer</span>
        </div>

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
                  <div className="text-lg leading-none dv-drink-icon">{drink.emoji}</div>
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
