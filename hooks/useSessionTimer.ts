import { useEffect, useState } from "react";
import { calculateActiveDurationSeconds, calculateLiveActiveDuration, type SessionDrinkTime } from "@/lib/session-duration";

export function useSessionTimer(
  startTime: string | null,
  drinks: SessionDrinkTime[],
  endTime: string | null = null
) {
  const [activeDuration, setActiveDuration] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!startTime || drinks.length === 0) {
      setActiveDuration(0);
      setIsPaused(false);
      return;
    }

    const tick = () => {
      if (endTime) {
        setActiveDuration(calculateActiveDurationSeconds(drinks, endTime) ?? 0);
        setIsPaused(false);
        return;
      }

      const live = calculateLiveActiveDuration(drinks, Date.now());
      setActiveDuration(live.activeDuration);
      setIsPaused(live.isPaused);
    };

    tick();
    if (endTime) return;

    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startTime, drinks, endTime]);

  return {
    activeDuration,
    isPaused,
    hasLoggedDrink: drinks.length > 0,
  };
}
