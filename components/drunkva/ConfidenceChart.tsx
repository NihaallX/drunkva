"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ReferenceLine,
  ReferenceDot,
  Tooltip,
} from "recharts";
import { STAGES, reconstructCurve } from "@/lib/confidence";
import type { DrinkLog } from "@/lib/confidence";

interface ConfidenceChartProps {
  drinks: DrinkLog[];
  sessionStart: string;
  peakConfidence: number;
  peakStage: string;
}

interface TooltipPayloadEntry {
  payload: { confidence: number; label?: string };
}

// Tooltip must use inline styles — Recharts renders it outside the DOM tree,
// so Tailwind classes cannot reach it.
const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: TooltipPayloadEntry[] }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      className="dv-surface px-2.5 py-1.5 text-[11px] text-foreground"
      style={{ pointerEvents: "none" }}
    >
      <div className="font-medium">{d.label ?? "Start"}</div>
      <div className="text-primary">{d.confidence}%</div>
    </div>
  );
};

export function ConfidenceChart({ drinks, sessionStart, peakConfidence, peakStage }: ConfidenceChartProps) {
  const data = reconstructCurve(drinks, sessionStart);

  if (data.length === 0) {
    return (
      <div className="h-[180px] flex items-center justify-center">
        <span className="text-xs text-muted-foreground/60">No drinks logged yet</span>
      </div>
    );
  }

  const peakPoint = data.reduce((max, p) => (p.confidence >= max.confidence ? p : max), data[0]);

  return (
    <div className="h-[180px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 50, bottom: 0, left: 0 }}>
          {/* Stage reference lines */}
          {STAGES.map((s) => (
            <ReferenceLine
              key={s.name}
              y={s.min}
              stroke="rgba(255,255,255,0.06)"
              strokeDasharray="3 3"
              label={{
                value: s.name,
                position: "right",
                fontSize: 8,
                fill: "rgba(255,255,255,0.2)",
                fontFamily: "Inter, sans-serif",
              }}
            />
          ))}

          <XAxis dataKey="time" hide />
          <YAxis domain={[0, 99]} hide />

          <Tooltip content={<CustomTooltip />} />

          <Area
            type="monotone"
            dataKey="confidence"
            stroke="#E8621A"
            strokeWidth={2}
            fill="#E8621A"
            fillOpacity={0.08}
            dot={false}
            activeDot={{ r: 4, fill: "#E8621A", stroke: "var(--bg-card)", strokeWidth: 2 }}
          />

          {/* Peak dot — orange, with card-colored border */}
          <ReferenceDot
            x={peakPoint.time}
            y={peakPoint.confidence}
            r={5}
            fill="#E8621A"
            stroke="var(--bg-card)"
            strokeWidth={2}
            label={{
              value: `${peakStage} · ${peakConfidence}%`,
              position: "top",
              fontSize: 9,
              fill: "#E8621A",
              fontFamily: "Inter, sans-serif",
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
