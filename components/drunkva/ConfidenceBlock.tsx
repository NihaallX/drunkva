"use client";

import { cn } from "@/lib/utils";
import { STAGES } from "@/lib/confidence";

interface ConfidenceBlockProps {
  stage: string;
  confidence: number;
  progressPct: number; // 0-100
}

export function ConfidenceBlock({ stage, confidence, progressPct }: ConfidenceBlockProps) {
  return (
    <div className="dv-surface p-3.5">
      {/* Stage name — 32px brand color */}
      <div className="dv-stage">{stage}</div>

      {/* Confidence % sub-label */}
      <div className="dv-conf-pct">{confidence}% confidence</div>

      {/* Progress bar */}
      <div className="dv-bar-track mt-2.5 mb-1.5">
        <div
          className="dv-bar-fill"
          style={{ width: `${Math.min(100, progressPct)}%` }}
        >
          <div className="dv-bar-dot" />
        </div>
      </div>

      {/* Stage labels */}
      <div className="flex justify-between mt-1">
        {STAGES.map((s) => (
          <span
            key={s.name}
            className={cn(
              "text-[10px] transition-colors duration-300",
              s.name === stage
                ? "text-primary font-medium"
                : "text-muted-foreground font-normal"
            )}
          >
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}
