"use client";

import { reconstructCurve } from "@/lib/confidence";
import { Stat, formatOverlayDuration } from "./shared";
import type { ShareOverlayDrink, ShareOverlaySession } from "./shared";

export interface FullInfoSelectedStats {
  duration: boolean;
  activeDuration: boolean;
  drinkBreakdown: boolean;
  personalBests: boolean;
  washroomCount: boolean;
  burpCount: boolean;
  chaknaLevel: boolean;
  witnesses: boolean;
  venue: boolean;
  sessionTitle: boolean;
  confidenceGraph: boolean;
}

type FullInfoSession = ShareOverlaySession & {
  washroom_count?: number | null;
  burp_count?: number | null;
  chakna_level?: string | null;
  venue_name?: string | null;
  session_title?: string | null;
};

type FullInfoDrink = ShareOverlayDrink & {
  is_pr?: boolean | null;
};

type FullInfoWitness = {
  confirmed?: boolean | null;
  alias?: string | null;
  real_name?: string | null;
};

interface ShareOverlayFullInfoProps {
  session: FullInfoSession;
  drinks: FullInfoDrink[];
  selectedStats: FullInfoSelectedStats;
  witnesses?: FullInfoWitness[];
  sessionTitle?: string | null;
  venueName?: string | null;
}

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

function chaknaLabel(level: string | null | undefined): string {
  if (!level || level === "none") return "None";
  if (level === "light") return `Light ${"\u{1F35F}"}`;
  if (level === "heavy") return `Heavy ${"\u{1F356}"}`;
  return "None";
}

function drinkEmoji(type: string): string {
  const normalized = type.toLowerCase();
  if (normalized === "beer") return "\u{1F37A}";
  if (normalized === "shot") return "\u{1F943}";
  if (normalized === "wine") return "\u{1F377}";
  if (normalized === "cocktail") return "\u{1F379}";
  if (normalized === "spirit") return "\u{1F942}";
  return "\u{1F37B}";
}

export function ShareOverlayFullInfo({
  session,
  drinks,
  selectedStats,
  witnesses = [],
  sessionTitle,
  venueName,
}: ShareOverlayFullInfoProps) {
  const confidence = Math.max(0, Math.min(99, Math.round(session.peak_confidence_pct ?? 10)));
  const stage = (session.peak_stage ?? "Baseline").toUpperCase();
  const confirmedWitnesses = witnesses
    .filter((w) => w.confirmed)
    .map((w) => w.alias || w.real_name)
    .filter(Boolean) as string[];
  const prCount = drinks.filter((d) => d.is_pr === true).length;
  const visibleTitle = (sessionTitle || session.session_title || "").trim();
  const visibleVenue = (venueName || session.venue_name || "").trim();

  const drinkCounts = drinks.reduce<Record<string, number>>((acc, drink) => {
    const key = drink.type.toLowerCase();
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const statItems: Array<{ key: string; label: string; value: string; unit?: string }> = [
    { key: "total-drinks", label: "TOTAL DRINKS", value: `${drinks.length}` },
  ];

  if (selectedStats.duration) {
    statItems.push({
      key: "duration",
      label: "DURATION",
      value: formatOverlayDuration(session.total_duration_seconds),
    });
  }
  if (selectedStats.activeDuration) {
    statItems.push({
      key: "active-duration",
      label: "ACTIVE TIME",
      value: formatOverlayDuration(session.active_duration_seconds),
    });
  }
  if (selectedStats.personalBests && prCount > 0) {
    statItems.push({
      key: "records",
      label: "RECORDS",
      value: `${prCount}`,
      unit: "PR",
    });
  }
  if (selectedStats.washroomCount) {
    statItems.push({
      key: "washroom",
      label: "WASHROOM",
      value: `${session.washroom_count ?? 0}`,
      unit: "\u{1F6BD}",
    });
  }
  if (selectedStats.burpCount) {
    statItems.push({
      key: "burps",
      label: "BURPS",
      value: `${session.burp_count ?? 0}`,
      unit: "\u{1F4A8}",
    });
  }
  if (selectedStats.chaknaLevel) {
    statItems.push({
      key: "chakna",
      label: "CHAKNA",
      value: chaknaLabel(session.chakna_level),
    });
  }
  if (selectedStats.witnesses) {
    statItems.push({
      key: "witnesses",
      label: "WITNESSES",
      value: `${confirmedWitnesses.length}`,
      unit: "\u{1F441}",
    });
  }

  const graph = buildArc(session, drinks);

  return (
    <div className="w-full flex flex-col items-center gap-6 px-4 text-center text-white">
      {/* Header section */}
      {(selectedStats.sessionTitle || selectedStats.venue) && (
        <div className="flex flex-col items-center gap-1 opacity-90 dv-overlay-text">
          {selectedStats.sessionTitle && visibleTitle && (
            <div className="text-[18px] font-bold italic leading-tight text-white px-2">
              &ldquo;{visibleTitle}&rdquo;
            </div>
          )}
          {selectedStats.venue && visibleVenue && (
            <div className="text-[12px] font-medium tracking-wider text-white/80 uppercase">
              {visibleVenue}
            </div>
          )}
        </div>
      )}

      {/* Grid section */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-6 w-full px-2">
        {statItems.map((stat) => (
          <Stat key={stat.key} value={stat.value} label={stat.label} unit={stat.unit} />
        ))}
      </div>

      {/* Drink Breakdown */}
      {selectedStats.drinkBreakdown && Object.keys(drinkCounts).length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 max-w-[280px]">
          {Object.entries(drinkCounts).map(([type, count]) => (
            <div key={type} className="dv-overlay-text text-[14px] font-medium text-white">
              {drinkEmoji(type)} <span className="font-bold">{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Witnesses List */}
      {selectedStats.witnesses && confirmedWitnesses.length > 0 && (
        <div className="flex flex-col items-center gap-1.5">
          <div className="dv-overlay-label opacity-70">WITNESSED BY</div>
          <div className="flex flex-wrap justify-center gap-2 max-w-[280px] dv-overlay-text text-[13px] font-medium text-white/90">
            {confirmedWitnesses.map((name, i) => (
              <span key={name}>
                {name}{i < confirmedWitnesses.length - 1 ? " ·" : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Graph Section */}
      {selectedStats.confidenceGraph && (
        <div className="flex flex-col items-center">
          <div className="text-[11px] uppercase tracking-[0.12em] text-white/70 font-medium dv-overlay-text">
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

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/drunkva-wordmark-white.png"
            alt="Drunkva"
            style={{ height: "14px", width: "84px", opacity: 0.8, objectFit: "contain", display: "block" }}
          />
        </div>
      )}
      
      {!selectedStats.confidenceGraph && (
        <div className="flex flex-col items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/drunkva-wordmark-white.png"
            alt="Drunkva"
            style={{ height: "14px", width: "84px", opacity: 0.8, objectFit: "contain", display: "block" }}
          />
        </div>
      )}
    </div>
  );
}

