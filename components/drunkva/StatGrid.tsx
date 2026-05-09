"use client";

import { useState } from "react";
import { Timer } from "lucide-react";
import { formatDuration } from "@/lib/confidence";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface StatGridProps {
  drinkCount: number;
  dominantDrink: string;
  fastestDrinkSeconds: number | null;
  fastestDrinkIsStopwatched: boolean;
  fastestBeerIsPR: boolean;
  liveDurationFormatted: string;
  showDurationUnits: boolean;
  washroomCount: number;
  isSpeedTiming?: boolean;
  activeSpeedTimer?: number;
  onToggleTimer?: () => void;
  onUpdateWashroom?: (count: number) => void;
}

interface StatCellProps {
  label: string;
  children: React.ReactNode;
}

function StatCell({ label, children }: StatCellProps) {
  return (
    <div className="dv-surface p-3 flex flex-col items-center justify-center">
      <div className="text-lg font-heading font-medium text-foreground flex flex-col items-center text-center">
        {children}
      </div>
      <div className="dv-stat-label mt-1 text-center">{label}</div>
    </div>
  );
}

export function StatGrid({
  drinkCount,
  dominantDrink,
  fastestDrinkSeconds,
  fastestDrinkIsStopwatched,
  fastestBeerIsPR,
  liveDurationFormatted,
  showDurationUnits,
  washroomCount,
  isSpeedTiming,
  activeSpeedTimer,
  onToggleTimer,
  onUpdateWashroom,
}: StatGridProps) {
  const [washroomOpen, setWashroomOpen] = useState(false);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleWashroomDecrement = () => {
    onUpdateWashroom?.(Math.max(0, washroomCount - 1));
  };

  const handleWashroomIncrement = () => {
    onUpdateWashroom?.(washroomCount + 1);
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      <StatCell label="Drinks">
        {drinkCount}
        <span className="text-[11px] text-muted-foreground font-normal capitalize">{dominantDrink}</span>
      </StatCell>

      <div
        className={cn(
          "dv-surface p-3 cursor-pointer transition-colors relative flex flex-col items-center justify-center",
          isSpeedTiming && "bg-primary/10 border-primary/30"
        )}
        onClick={onToggleTimer}
      >
        <div className={cn("text-lg font-heading font-medium flex items-center gap-1", isSpeedTiming ? "text-primary" : "text-foreground")}>
          {isSpeedTiming ? (
            formatTimer(activeSpeedTimer ?? 0)
          ) : (
            <>
              {fastestDrinkSeconds != null ? formatDuration(fastestDrinkSeconds) : "-"}
              {fastestDrinkIsStopwatched && <Timer className="size-3.5 text-muted-foreground" />}
              {fastestBeerIsPR && dominantDrink === "beer" && <span className="dv-pr-pill">PR</span>}
            </>
          )}
        </div>
        <div className="dv-stat-label flex items-center justify-center gap-1.5 mt-1">
          Fastest
          {isSpeedTiming ? (
            <div className="size-2.5 rounded-[2px] bg-red-500/90" />
          ) : (
            <Timer className="size-3.5 text-muted-foreground opacity-60" />
          )}
        </div>
      </div>

      <StatCell label="Duration">
        {liveDurationFormatted}
      </StatCell>

      <Popover open={washroomOpen} onOpenChange={setWashroomOpen}>
        <PopoverTrigger asChild>
          <div
            className={cn(
              "dv-surface p-3 cursor-pointer transition-colors relative flex flex-col items-center justify-center",
              washroomOpen && "bg-primary/10 border-primary/30"
            )}
          >
            <div className={cn("text-lg font-heading font-medium", washroomOpen ? "text-primary" : "text-foreground")}>
              {washroomCount}
              <span className="text-[11px] text-muted-foreground font-normal block">trips</span>
            </div>
            <div className="dv-stat-label mt-1">Washroom</div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-fit p-3" align="center">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              className="size-9 rounded-full border-border bg-card text-foreground text-lg"
              onClick={handleWashroomDecrement}
              aria-label="Decrease washroom trips"
            >
              −
            </Button>
            <span className="text-xl font-medium text-foreground min-w-8 text-center">
              {washroomCount}
            </span>
            <Button
              size="icon"
              className="size-9 rounded-full bg-primary text-primary-foreground text-lg"
              onClick={handleWashroomIncrement}
              aria-label="Increase washroom trips"
            >
              +
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
