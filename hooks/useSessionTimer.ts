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
    if (!startTime) {
      setActiveDuration(0);
      setIsPaused(false);
      return;
    }

    const tick = () => {
      if (endTime) {
        setActiveDuration(calculateActiveDurationSeconds(startTime, drinks, endTime) ?? 0);
        setIsPaused(false);
        return;
      }

      const live = calculateLiveActiveDuration(startTime, drinks, Date.now());
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
