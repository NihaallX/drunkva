"use client";

import {
  DrunkvaMark,
  getDominantDrinkLabel,
  getFastestBeerLabel,
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
}: {
  value: string | number;
  label: string;
  showPR?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center justify-center px-2 text-center">
      <div className="flex items-baseline justify-center gap-1">
        <span className="font-heading text-[28px] font-medium leading-none text-white">{value}</span>
        {showPR && (
          <span className="rounded-full bg-primary px-1.5 py-[1px] text-[8px] font-medium leading-none text-white">
            PR
          </span>
        )}
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.08em] text-white/50">{label}</div>
    </div>
  );
}

export function TemplateA({ session, drinks, fastestBeerIsPR }: TemplateAProps) {
  return (
    <div className="absolute inset-x-0 bottom-0 h-[96px] bg-[rgba(0,0,0,0.45)]">
      <div className="grid h-full grid-cols-3 pb-5">
        <Stat value={drinks.length} label={getDominantDrinkLabel(drinks)} />
        <div className="border-x border-white/[0.15]">
          <Stat value={getFastestBeerLabel(drinks)} label="FASTEST" showPR={fastestBeerIsPR} />
        </div>
        <Stat value={getSessionDuration(session)} label="DURATION" />
      </div>
      <div className="absolute bottom-2 right-4 flex items-center gap-1.5 text-[9px] font-medium leading-none tracking-[0.08em] text-white/40">
        <DrunkvaMark size={14} />
        <span>DRUNKVA</span>
      </div>
    </div>
  );
}
