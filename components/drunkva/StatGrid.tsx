"use client";

import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/confidence";

interface StatGridProps {
  drinkCount: number;
  dominantDrink: string;
  fastestBeerSeconds: number | null;
  fastestBeerIsPR: boolean;
  liveDurationFormatted: string;
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
  fastestBeerSeconds,
  fastestBeerIsPR,
  liveDurationFormatted,
  washroomCount,
}: StatGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <StatCell label="Drinks">
        {drinkCount}
        <span className="text-[11px] text-muted-foreground font-normal capitalize">
          {dominantDrink}
        </span>
      </StatCell>

      <StatCell label="Fastest">
        {fastestBeerSeconds != null ? formatDuration(fastestBeerSeconds) : "—"}
        {fastestBeerIsPR && <span className="dv-pr-pill">PR</span>}
      </StatCell>

      <StatCell label="Duration">
        {liveDurationFormatted}
        <span className="text-[11px] text-muted-foreground font-normal">hrs</span>
      </StatCell>

      <StatCell label="Washroom">
        {washroomCount}
        <span className="text-[11px] text-muted-foreground font-normal">trips</span>
      </StatCell>
    </div>
  );
}
