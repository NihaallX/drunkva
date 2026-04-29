"use client";

import Image from "next/image";
import {
  getDominantDrinkLabel,
  getFastestStat,
  getSessionDuration,
  type ShareOverlayDrink,
  type ShareOverlaySession,
} from "./shared";

interface TemplateAProps {
  session: ShareOverlaySession;
  drinks: ShareOverlayDrink[];
  fastestBeerIsPR?: boolean;
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

export function TemplateA({ session, drinks, fastestBeerIsPR }: TemplateAProps) {
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

        <Stat value={getSessionDuration(session)} label="Time" />
      </div>
    </div>
  );
}
