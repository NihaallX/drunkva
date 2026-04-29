"use client";

import Image from "next/image";
import { Timer } from "lucide-react";
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
  showPR,
  showStopwatch,
}: {
  value: string | number;
  label: string;
  showPR?: boolean;
  showStopwatch?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-1 basis-0 flex-col items-center justify-center text-center">
      <div className="relative inline-flex min-w-[76px] items-end justify-center gap-1">
        <span className="dv-overlay-text font-heading text-[32px] font-medium leading-none tracking-[-0.02em] text-white">
          {value}
        </span>
        {showStopwatch && <Timer className="mb-1 size-3 text-white/60" />}
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

export function TemplateA({ session, drinks, fastestBeerIsPR }: TemplateAProps) {
  const fastestStat = getFastestStat(drinks, session);

  return (
    <>
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0"
        style={{
          height: "50%",
          background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)",
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-[96px] bg-transparent">
        <div className="flex h-full w-full items-center pb-5">
          <Stat value={drinks.length} label={getDominantDrinkLabel(drinks, session)} />
          <div className="w-px self-stretch bg-white/[0.25]" />
          <Stat
            value={fastestStat.value}
            label={fastestStat.label}
            showPR={fastestBeerIsPR && fastestStat.label.includes("BEER")}
            showStopwatch={fastestStat.isStopwatch}
          />
          <div className="w-px self-stretch bg-white/[0.25]" />
          <Stat value={getSessionDuration(session)} label="ACTIVE" />
        </div>
        <div className="absolute bottom-2 right-4">
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
    </>
  );
}
