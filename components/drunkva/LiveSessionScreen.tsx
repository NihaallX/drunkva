"use client";

import { useMemo } from "react";
import { DrunkvaLogo } from "@/components/drunkva/DrunkvaLogo";
import { ConfidenceBlock } from "@/components/drunkva/ConfidenceBlock";
import { StatGrid } from "@/components/drunkva/StatGrid";
import { QuickLogBar } from "@/components/drunkva/QuickLogBar";
import { BottomNav } from "@/components/drunkva/BottomNav";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { calculateConfidence, getStageProgress } from "@/lib/confidence";
import { useSessionTimer } from "@/hooks/useSessionTimer";
import { formatLiveDuration } from "@/lib/utils";
import { getPreferredFastestDrink } from "@/lib/drink-speed";

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

interface DrinkLog {
  id?: string;
  type: string;
  logged_at: string;
  duration_seconds?: number | null;
  timing_method?: "gap" | "stopwatch";
}

interface SessionState {
  id: string | null;
  venueName: string;
  startTime: string | null;
  endTime: string | null;
  drinks: DrinkLog[];
  washroomCount: number;
  burpCount: number;
  chaknaLevel: "none" | "light" | "heavy";
  fastestBeerSeconds: number | null;
  fastestBeerIsPR: boolean;
}

interface LiveSessionScreenProps {
  session: SessionState;
  onEnd: () => void;
  onLogDrink: (type: string, options?: { manualDurationSeconds?: number }) => void;
  onOpenExtras: () => void;
  logging: boolean;
  userName: string;
  userImageUrl: string | null;
  queueCount: number;
  justSynced: boolean;
}

export function LiveSessionScreen({
  session,
  onEnd,
  onLogDrink,
  onOpenExtras,
  logging,
  userName,
  userImageUrl,
  queueCount,
  justSynced,
}: LiveSessionScreenProps) {
  const { activeDuration, isPaused, hasLoggedDrink } = useSessionTimer(
    session.startTime,
    session.drinks,
    session.endTime
  );

  const conf = useMemo(() => calculateConfidence(session.drinks), [session.drinks]);

  const progressPct = useMemo(
    () => Math.round(getStageProgress(conf.current) * 100),
    [conf.current]
  );

  const dominantDrink = useMemo(() => {
    const drinkCounts: Record<string, number> = {};
    session.drinks.forEach((d) => {
      drinkCounts[d.type] = (drinkCounts[d.type] ?? 0) + 1;
    });
    return Object.entries(drinkCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "beer";
  }, [session.drinks]);

  const fastestDrink = useMemo(
    () => getPreferredFastestDrink(session.drinks, dominantDrink),
    [session.drinks, dominantDrink]
  );

  return (
    <div className="dv-page bg-background">
      <div className="dv-nav flex items-center justify-between px-4 py-3">
        <DrunkvaLogo />
        <div className="flex items-center gap-2">
          <Badge className="dv-live-badge">LIVE</Badge>
          <Avatar className="size-7">
            {userImageUrl && <AvatarImage src={userImageUrl} alt={userName} />}
            <AvatarFallback className="bg-muted text-muted-foreground text-[10px] font-medium">
              {getInitials(userName)}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      <div className="flex flex-col gap-3.5 p-4">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-[15px] font-medium text-foreground">{session.venueName || "Your session"}</div>
            <div className="text-[12px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
              {session.drinks.length} drinks logged
              {queueCount > 0 && (
                <span className="flex items-center gap-1 text-amber-400">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                    <path d="M5 1a4 4 0 100 8A4 4 0 005 1zm0 1.5a.5.5 0 01.5.5v2a.5.5 0 01-.5.5.5.5 0 01-.5-.5V3a.5.5 0 01.5-.5zm0 4.75a.625.625 0 110-1.25.625.625 0 010 1.25z" />
                  </svg>
                  - Syncing {queueCount} drink{queueCount !== 1 ? "s" : ""}...
                </span>
              )}
              {justSynced && queueCount === 0 && (
                <span className="flex items-center gap-1 text-green-400">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M2 5l2.5 2.5L8 3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  - Synced
                </span>
              )}
              {typeof navigator !== "undefined" && !navigator.onLine && queueCount === 0 && (
                <span className="text-primary ml-0">- Offline</span>
              )}
            </div>
          </div>
          <Button
            id="end-session-btn"
            variant="outline"
            size="sm"
            onClick={onEnd}
            className="rounded-full border-border text-muted-foreground h-7 px-3 text-xs"
          >
            End
          </Button>
        </div>

        <ConfidenceBlock stage={conf.stage} confidence={conf.current} progressPct={progressPct} />

        <StatGrid
          drinkCount={session.drinks.length}
          dominantDrink={dominantDrink}
          fastestDrinkSeconds={fastestDrink?.duration_seconds ?? null}
          fastestDrinkIsStopwatched={fastestDrink?.timing_method === "stopwatch"}
          fastestBeerIsPR={session.fastestBeerIsPR}
          liveDurationFormatted={hasLoggedDrink ? formatLiveDuration(activeDuration) : "-"}
          showDurationUnits={hasLoggedDrink}
          washroomCount={session.washroomCount}
        />

        {isPaused && (
          <div className="inline-flex w-fit items-center rounded-full border border-amber-400/25 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-300">
            Paused - log a drink to resume
          </div>
        )}

        <Separator className="bg-border" />

        <QuickLogBar onLog={onLogDrink} onOpenExtras={onOpenExtras} disabled={logging} />
      </div>

      <BottomNav />
    </div>
  );
}
