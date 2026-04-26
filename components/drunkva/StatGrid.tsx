"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { formatDuration, formatSessionDuration } from "@/lib/confidence";

interface StatGridProps {
  drinkCount: number;
  dominantDrink: string;
  fastestBeerSeconds: number | null;
  fastestBeerIsPR: boolean;
  sessionStartMs: number;
  washroomCount: number;
}

function useElapsed(startMs: number) {
  const [elapsed, setElapsed] = useState(Date.now() - startMs);
  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - startMs), 1000);
    return () => clearInterval(id);
  }, [startMs]);
  return elapsed;
}

interface StatCellProps {
  label: string;
  children: React.ReactNode;
}

function StatCell({ label, children }: StatCellProps) {
  return (
    <div className="dv-surface p-3">
      <div className="dv-stat-label">{label}</div>
      <div className="text-lg font-medium text-foreground mt-0.5 flex items-baseline gap-1">
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
  sessionStartMs,
  washroomCount,
}: StatGridProps) {
  const elapsed = useElapsed(sessionStartMs);

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
        {formatSessionDuration(elapsed)}
        <span className="text-[11px] text-muted-foreground font-normal">hrs</span>
      </StatCell>

      <StatCell label="Washroom">
        {washroomCount}
        <span className="text-[11px] text-muted-foreground font-normal">trips</span>
      </StatCell>
    </div>
  );
}
