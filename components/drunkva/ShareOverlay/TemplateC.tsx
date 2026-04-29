"use client";

import Image from "next/image";
import { reconstructCurve } from "@/lib/confidence";
import {
  getDominantDrinkLabel,
  getFastestBeerLabel,
  getSessionDuration,
  type ShareOverlayDrink,
  type ShareOverlaySession,
} from "./shared";

interface TemplateCProps {
  session: ShareOverlaySession;
  drinks: ShareOverlayDrink[];
  fastestBeerIsPR?: boolean;
}

const CARD_WIDTH = 390;
const GRAPH_HEIGHT = 36;

function buildGraph(session: ShareOverlaySession, drinks: ShareOverlayDrink[]) {
  const curve = reconstructCurve(drinks, session.start_time);
  const sessionStart = new Date(session.start_time).getTime();
  const fallbackEnd = curve[curve.length - 1]?.time ?? 1;
  const sessionEnd = session.end_time ? new Date(session.end_time).getTime() : sessionStart + fallbackEnd;
  const duration = Math.max(1, sessionEnd - sessionStart);

  if (drinks.length === 0 || curve.length === 0) {
    const y = GRAPH_HEIGHT - (10 / 99) * GRAPH_HEIGHT;
    const points = `0,${y} ${CARD_WIDTH},${y}`;
    return {
      points,
      areaPoints: `0,${GRAPH_HEIGHT} ${points} ${CARD_WIDTH},${GRAPH_HEIGHT}`,
      peakX: 0,
      peakY: y,
    };
  }

  if (drinks.length === 1) {
    const confidence = curve[curve.length - 1]?.confidence ?? session.peak_confidence_pct ?? 10;
    const y = GRAPH_HEIGHT - (confidence / 99) * GRAPH_HEIGHT;
    const points = `0,${y} ${CARD_WIDTH},${y}`;
    return {
      points,
      areaPoints: `0,${GRAPH_HEIGHT} ${points} ${CARD_WIDTH},${GRAPH_HEIGHT}`,
      peakX: CARD_WIDTH / 2,
      peakY: y,
    };
  }

  const graphPoints = curve.map((point) => {
    const x = Math.max(0, Math.min(CARD_WIDTH, (point.time / duration) * CARD_WIDTH));
    const y = GRAPH_HEIGHT - (point.confidence / 99) * GRAPH_HEIGHT;
    return { x, y, confidence: point.confidence };
  });
  const points = graphPoints.map((point) => `${point.x},${point.y}`).join(" ");
  const peakPoint = graphPoints.reduce((max, point) => (point.confidence > max.confidence ? point : max), graphPoints[0]);

  return {
    points,
    areaPoints: `0,${GRAPH_HEIGHT} ${points} ${CARD_WIDTH},${GRAPH_HEIGHT}`,
    peakX: peakPoint.x,
    peakY: peakPoint.y,
  };
}

function Stat({
  value,
  label,
  showPR,
}: {
  value: string | number;
  label: string;
  showPR?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-1 basis-0 flex-col items-center justify-center text-center">
      <div className="relative inline-flex min-w-[76px] items-end justify-center gap-1">
        <span className="dv-overlay-text font-heading text-[32px] font-medium leading-none tracking-[-0.02em] text-white">
          {value}
        </span>
        {showPR && (
          <span className="mb-1 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-medium leading-none text-white">
            PR
          </span>
        )}
      </div>
      <div className="dv-overlay-text mt-1 font-sans text-[10px] uppercase tracking-[0.08em] text-white/[0.45]">
        {label}
      </div>
    </div>
  );
}

export function TemplateC({ session, drinks, fastestBeerIsPR }: TemplateCProps) {
  const graph = buildGraph(session, drinks);
  const stage = session.peak_stage ?? "Baseline";
  const confidence = Math.round(session.peak_confidence_pct ?? 10);

  return (
    <>
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0"
        style={{
          height: "50%",
          background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)",
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-[120px] bg-transparent">
        <svg
          width="100%"
          height={GRAPH_HEIGHT}
          viewBox={`0 0 ${CARD_WIDTH} ${GRAPH_HEIGHT}`}
          preserveAspectRatio="none"
          className="block"
          aria-hidden="true"
        >
          <polygon points={graph.areaPoints} fill="var(--primary)" fillOpacity={0.15} />
          <polyline
            points={graph.points}
            fill="none"
            stroke="var(--primary)"
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="butt"
          />
          <circle cx={graph.peakX} cy={graph.peakY} r={3} fill="var(--primary)" />
        </svg>

        <div className="h-2.5" />

        <div className="flex h-12 w-full items-center">
          <Stat value={drinks.length} label={getDominantDrinkLabel(drinks, session)} />
          <div className="w-px self-stretch bg-white/[0.25]" />
          <Stat value={getFastestBeerLabel(drinks)} label="FASTEST" showPR={fastestBeerIsPR} />
          <div className="w-px self-stretch bg-white/[0.25]" />
          <Stat value={getSessionDuration(session)} label="ACTIVE" />
        </div>

        <div className="flex h-[26px] items-center justify-between border-t border-white/[0.08] px-3">
          <div className="dv-overlay-text font-sans text-[10px] leading-none text-white/50">
            {stage} &middot; {confidence}%
          </div>
          <div>
            <Image
              src="/drunkva-wordmark-white.png"
              alt="Drunkva"
              width={64}
              height={12}
              className="h-3 w-auto object-contain"
              style={{ opacity: 0.4 }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
