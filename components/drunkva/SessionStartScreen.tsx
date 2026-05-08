"use client";

import { DrunkvaLogo } from "@/components/drunkva/DrunkvaLogo";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/drunkva/BottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { useRouter } from "next/navigation";
import { FundMeBanner } from "@/components/drunkva/FundMeBanner";
import { formatSessionDuration } from "@/lib/confidence";

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

interface ProfileData {
  user: { id: string; real_name: string; alias: string | null; avatar_url: string | null };
  stats: {
    total_sessions: number;
    all_time_peak: number;
    favourite_drink: string | null;
    fastest_beer_seconds: number | null;
  };
}

interface RecentSession {
  id: string;
  session_title: string | null;
  venue_name: string | null;
  peak_stage: string;
  duration_seconds: number | null;
}

interface SessionStartScreenProps {
  greetingName: string;
  profile: ProfileData | null;
  recentSessions: RecentSession[];
  loading: boolean;
  venueInput: string;
  onVenueChange: (v: string) => void;
  onStart: () => void;
  starting: boolean;
  userName: string;
  userImageUrl: string | null;
}

export function SessionStartScreen({
  greetingName,
  profile,
  recentSessions,
  loading,
  venueInput,
  onVenueChange,
  onStart,
  starting,
  userName,
  userImageUrl,
}: SessionStartScreenProps) {
  const router = useRouter();
  const favouriteDrink = profile?.stats.favourite_drink?.replace(/_/g, " ") ?? "--";

  return (
    <div className="dv-page flex flex-col">
      <div className="dv-nav flex items-center justify-between px-4 py-3">
        <DrunkvaLogo />
        <Avatar
          className="size-7 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => router.push("/profile/edit")}
        >
          {userImageUrl && <AvatarImage src={userImageUrl} alt={userName} />}
          <AvatarFallback className="bg-muted text-muted-foreground text-[10px] font-medium">
            {getInitials(userName)}
          </AvatarFallback>
        </Avatar>
      </div>

      <div className="dv-scrollbar-hide flex-1 overflow-y-auto px-4 pb-40">
        <div className="flex flex-col gap-4 pt-2">
          <div className="pt-1">
            <p className="text-sm text-muted-foreground mb-1.5">
              Good evening, {greetingName}
            </p>
            <h1 className="text-2xl font-semibold text-foreground mb-1.5 max-w-[14ch] leading-tight">
              Ready to track tonight&apos;s <span className="text-primary">chaos?</span>
            </h1>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {loading || !profile ? (
              <>
                <Skeleton className="h-16 rounded-[var(--radius-md)]" />
                <Skeleton className="h-16 rounded-[var(--radius-md)]" />
                <Skeleton className="h-16 rounded-[var(--radius-md)]" />
              </>
            ) : (
              [
                { value: profile.stats.total_sessions, label: "sessions" },
                { value: `${profile.stats.all_time_peak}%`, label: "peak conf." },
                { value: favouriteDrink, label: "fav drink", capitalize: true },
              ].map((stat) => (
                <Card key={stat.label} className="bg-card border-border py-0 gap-0">
                  <CardContent className="px-3 py-2.5 text-center flex flex-col items-center justify-center min-h-[64px]">
                    <div className="w-full flex items-center justify-center">
                      <div
                        className={`text-lg font-heading font-medium text-foreground text-center${stat.capitalize ? " capitalize" : ""}`}
                      >
                        {stat.value}
                      </div>
                    </div>
                    <div className="dv-stat-label mt-1 text-center w-full">
                      {stat.label}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>


          

          

          <div className="fundme-banner-wrapper">
            <FundMeBanner />
          </div>

          <div className="pt-1">
            <div className="dv-stat-label mb-2">
              START A SESSION
            </div>
            <div className="flex flex-col gap-2.5">
              <input
                id="venue-input"
                className="dv-input"
                placeholder="Venue name (optional)"
                value={venueInput}
                onChange={(e) => onVenueChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onStart()}
              />

              <Button
                id="start-session-btn"
                onClick={onStart}
                disabled={starting}
                className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-[15px] font-medium"
              >
                {starting ? "Starting…" : "🍺 Start session"}
              </Button>
            </div>
          </div>

          <div className="pt-1">
            <div className="dv-stat-label mb-2">
              RECENT SESSIONS
            </div>
            <div className="flex flex-col gap-2.5">
              {loading ? (
                <>
                  <Skeleton className="h-[63px] rounded-[18px]" />
                  <Skeleton className="h-[63px] rounded-[18px]" />
                </>
              ) : recentSessions.length > 0 ? (
                recentSessions.map((session) => {
                  const title = session.session_title ?? session.venue_name ?? "Unnamed session";
                  const duration =
                    session.duration_seconds != null
                      ? formatSessionDuration(session.duration_seconds * 1000)
                      : "0:00";

                  return (
                    <Card
                      key={session.id}
                      className="bg-card border-border py-0 gap-0 cursor-pointer"
                      onClick={() => router.push(`/session/${session.id}`)}
                    >
                      <CardContent className="px-3 py-2.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="size-2.5 rounded-full bg-primary shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="text-[13px] font-medium text-foreground truncate">
                              {title}
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {duration} · {session.peak_stage}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <Card className="bg-card border-border py-0 gap-0">
                  <CardContent className="px-3 py-2.5 text-[12px] text-muted-foreground">
                    No recent sessions yet.
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
