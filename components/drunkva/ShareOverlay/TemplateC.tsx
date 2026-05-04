"use client";

import { reconstructCurve } from "@/lib/confidence";
import {
  getDominantDrinkLabel,
  getFastestStat,
  getSessionDuration,
  Stat,
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
const ARC_HEIGHT = 32;

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

export function TemplateC({ session, drinks, fastestBeerIsPR }: TemplateCProps) {
  const graph = buildArc(session, drinks);
  const stage = session.peak_stage ?? "Baseline";
  const confidence = Math.round(session.peak_confidence_pct ?? 10);
  const fastestStat = getFastestStat(drinks, session);
  const dominantDrink = getDominantDrinkLabel(drinks, session).toLowerCase();

  const duration = getSessionDuration(session);
  const showDuration = duration !== "-";

  return (
    <div className="w-full flex flex-col items-center gap-4 px-8 text-center text-white">
      <Stat value={drinks.length} label="Drinks" unit={dominantDrink} />

      <Stat value={fastestStat.value} label="Fastest" showPR={fastestBeerIsPR} />

      {showDuration && (
        <Stat value={duration} label="Time" />
      )}

      <div className="flex flex-col items-center">
        <div className="text-[11px] uppercase tracking-[0.12em] text-white/70 font-medium">
          {stage} &middot; {confidence}%
        </div>

        <div className="h-2" />

        <div className="w-[128px]">
          <svg width="128" height="32" viewBox="0 0 128 32" preserveAspectRatio="none" aria-hidden="true">
            <polygon points={graph.areaPoints} fill="var(--primary)" fillOpacity={0.6} />
            <polyline
              points={graph.points}
              fill="none"
              stroke="var(--primary)"
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeOpacity={0.9}
            />
            <circle cx={graph.peakX} cy={graph.peakY} r={3} fill="var(--primary)" />
          </svg>
        </div>

        <div className="h-2" />

        {/* Plain <img> instead of Next.js <Image> — html2canvas captures
            native img elements reliably. next/image with width=0/height=0
            renders a 0×0 intrinsic box that html2canvas cannot measure. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/drunkva-wordmark-white.png"
          alt="Drunkva"
          style={{ height: "14px", width: "84px", opacity: 0.8, objectFit: "contain", display: "block" }}
        />
      </div>
    </div>
  );
}
