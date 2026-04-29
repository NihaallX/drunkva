"use client";

import { Timer } from "lucide-react";
import { formatDuration } from "@/lib/confidence";

interface StatGridProps {
  drinkCount: number;
  dominantDrink: string;
  fastestDrinkSeconds: number | null;
  fastestDrinkIsStopwatched: boolean;
  fastestBeerIsPR: boolean;
  liveDurationFormatted: string;
  showDurationUnits: boolean;
  washroomCount: number;
}

interface StatCellProps {
  label: string;
  children: React.ReactNode;
}

function StatCell({ label, children }: StatCellProps) {
  return (
    <div className="dv-surface p-3">
      <div className="dv-stat-label">{label}</div>
      <div className="text-lg font-heading font-medium text-foreground mt-0.5 flex items-baseline gap-1">
        {children}
      </div>
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
}: StatGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <StatCell label="Drinks">
        {drinkCount}
        <span className="text-[11px] text-muted-foreground font-normal capitalize">{dominantDrink}</span>
      </StatCell>

      <StatCell label="Fastest">
        {fastestDrinkSeconds != null ? formatDuration(fastestDrinkSeconds) : "-"}
        {fastestDrinkIsStopwatched && <Timer className="size-3.5 text-muted-foreground" />}
        {fastestBeerIsPR && dominantDrink === "beer" && <span className="dv-pr-pill">PR</span>}
      </StatCell>

      <StatCell label="Duration">
        {liveDurationFormatted}
        {showDurationUnits && <span className="text-[11px] text-muted-foreground font-normal">hrs</span>}
      </StatCell>

      <StatCell label="Washroom">
        {washroomCount}
        <span className="text-[11px] text-muted-foreground font-normal">trips</span>
      </StatCell>
    </div>
  );
}
