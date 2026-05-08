"use client";

import { Timer } from "lucide-react";
import { formatDuration } from "@/lib/confidence";
import { cn } from "@/lib/utils";

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
}: StatGridProps) {
  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
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

      <StatCell label="Washroom">
        {washroomCount}
        <span className="text-[11px] text-muted-foreground font-normal">trips</span>
      </StatCell>
    </div>
  );
}
