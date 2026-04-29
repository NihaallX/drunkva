"use client";

import Image from "next/image";
import { reconstructCurve } from "@/lib/confidence";
import {
  getDominantDrinkLabel,
  getFastestStat,
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
const ARC_WIDTH = 128;
const ARC_HEIGHT = 48;

function buildArc(session: ShareOverlaySession, drinks: ShareOverlayDrink[]) {
  const curve = reconstructCurve(drinks, session.start_time);
  const sessionStart = new Date(session.start_time).getTime();
  const fallbackEnd = curve[curve.length - 1]?.time ?? 1;
  const sessionEnd = session.end_time ? new Date(session.end_time).getTime() : sessionStart + fallbackEnd;
  const duration = Math.max(1, sessionEnd - sessionStart);

  if (drinks.length === 0 || curve.length === 0) {
    const y = ARC_HEIGHT - (10 / 99) * 40;
    const points = `0,${y} ${ARC_WIDTH},${y}`;
    return {
      points,
      areaPoints: `0,${ARC_HEIGHT} ${points} ${ARC_WIDTH},${ARC_HEIGHT}`,
      peakX: 0,
      peakY: y,
    };
  }

  if (drinks.length === 1) {
    const confidence = curve[curve.length - 1]?.confidence ?? session.peak_confidence_pct ?? 10;
    const y = ARC_HEIGHT - (confidence / 99) * 40;
    const points = `0,${y} ${ARC_WIDTH},${y}`;
    return {
      points,
      areaPoints: `0,${ARC_HEIGHT} ${points} ${ARC_WIDTH},${ARC_HEIGHT}`,
      peakX: ARC_WIDTH / 2,
      peakY: y,
    };
  }

  const graphPoints = curve.map((point) => {
    const x = Math.max(0, Math.min(ARC_WIDTH, (point.time / duration) * ARC_WIDTH));
    const y = ARC_HEIGHT - (point.confidence / 99) * 40;
    return { x, y, confidence: point.confidence };
  });
  const points = graphPoints.map((point) => `${point.x},${point.y}`).join(" ");
  const peakPoint = graphPoints.reduce((max, point) => (point.confidence > max.confidence ? point : max), graphPoints[0]);

  return {
    points,
    areaPoints: `0,${ARC_HEIGHT} ${points} ${ARC_WIDTH},${ARC_HEIGHT}`,
    peakX: peakPoint.x,
    peakY: peakPoint.y,
  };
}

function Stat({
  value,
  label,
  unit,
  showPR,
}: {
  value: string | number;
  label: string;
  unit?: string;
  showPR?: boolean;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex items-end justify-center gap-2">
        <span className="dv-overlay-number">{value}</span>
        {unit && <span className="dv-overlay-unit pb-1">{unit}</span>}
        {showPR && (
          <span className="mb-2 rounded-full bg-primary px-2 py-1 text-[10px] font-medium leading-none text-white">
            PR
          </span>
        )}
      </div>
      <div className="dv-overlay-label">{label}</div>
    </div>
  );
}

export function TemplateC({ session, drinks, fastestBeerIsPR }: TemplateCProps) {
  const graph = buildArc(session, drinks);
  const stage = session.peak_stage ?? "Baseline";
  const confidence = Math.round(session.peak_confidence_pct ?? 10);
  const fastestStat = getFastestStat(drinks, session);
  const dominantDrink = getDominantDrinkLabel(drinks, session).toLowerCase();

  return (
    <div className="absolute inset-0 text-white">
      <div
        className="pointer-events-none absolute top-0 left-0 right-0"
        style={{
          height: "55%",
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)",
        }}
      />

      <div className="absolute top-[18%] left-0 right-0 flex flex-col items-center gap-0 px-8 text-center">
        <Stat value={drinks.length} label="Drinks" unit={dominantDrink} />

        <div className="h-5" />

        <Stat value={fastestStat.value} label="Fastest" showPR={fastestBeerIsPR} />

        <div className="h-5" />

        <Stat value={getSessionDuration(session)} label="Active" />

        <div className="h-7" />

        <div className="text-[10px] uppercase tracking-[0.12em] text-white/40">
          {stage} &middot; {confidence}%
        </div>

        <div className="h-3" />

        <div className="w-[128px]">
          <svg width="128" height="48" viewBox="0 0 128 48" preserveAspectRatio="none" aria-hidden="true">
            <polygon points={graph.areaPoints} fill="var(--primary)" fillOpacity={0.2} />
            <polyline
              points={graph.points}
              fill="none"
              stroke="var(--primary)"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <circle cx={graph.peakX} cy={graph.peakY} r={3.5} fill="var(--primary)" />
          </svg>
        </div>

        <div className="h-3" />

        <Image
          src="/drunkva-wordmark-white.png"
          alt="Drunkva"
          width={80}
          height={16}
          className="h-4 w-auto object-contain opacity-100"
        />
      </div>
    </div>
  );
}
