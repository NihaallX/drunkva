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
    <div className="w-full flex flex-col items-center gap-6 px-8 text-center text-white">
      <Stat value={drinks.length} label="Drinks" unit={dominantDrink} />
      
      <Stat value={fastestStat.value} label="Fastest" showPR={fastestBeerIsPR} />

      {showDuration && (
        <Stat value={duration} label="Time" />
      )}
    </div>
  );
}
