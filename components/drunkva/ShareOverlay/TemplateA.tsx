"use client";

import {
  getDominantDrinkLabel,
  getFastestStat,
  getSessionDuration,
  Stat,
  type ShareOverlayDrink,
  type ShareOverlaySession,
} from "./shared";

interface TemplateAProps {
  session: ShareOverlaySession;
  drinks: ShareOverlayDrink[];
  fastestBeerIsPR?: boolean;
}

export function TemplateA({ session, drinks, fastestBeerIsPR }: TemplateAProps) {
  const fastestStat = getFastestStat(drinks, session);
  const dominantDrink = getDominantDrinkLabel(drinks, session).toLowerCase();

  const duration = getSessionDuration(session);
  const showDuration = duration !== "-";

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

      <div className="absolute top-[18%] left-0 right-0 flex flex-col items-center gap-6 px-8 text-center">
        <Stat value={drinks.length} label="Drinks" unit={dominantDrink} />
        
        <Stat value={fastestStat.value} label="Fastest" showPR={fastestBeerIsPR} />

        {showDuration && (
          <Stat value={duration} label="Time" />
        )}
      </div>
    </div>
  );
}
