"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { DrunkvaLogo } from "@/components/drunkva/DrunkvaLogo";
import { BottomNav } from "@/components/drunkva/BottomNav";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration } from "@/lib/confidence";
import { MOCK_USER, clerkEnabled } from "@/lib/mock-user";
import { useUser as useClerkUser } from "@clerk/nextjs";

let useUser: () => { user: typeof MOCK_USER | null | any };
if (clerkEnabled) {
  useUser = useClerkUser;
} else {
  useUser = () => ({ user: MOCK_USER });
}

interface ProfileData {
  user: { id: string; real_name: string; alias: string | null; avatar_url: string | null };
  stats: {
    total_sessions: number;
    all_time_peak: number;
    favourite_drink: string | null;
    fastest_beer_seconds: number | null;
  };
  follows: number;
  followers: number;
}

interface SessionSummary {
  id: string;
  peak_stage: string;
  peak_confidence_pct: number;
  venue_name: string | null;
  start_time: string;
  drink_count: number;
}

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

// ─── Session mini card ────────────────────────────────────────────────────────
function SessionMiniCard({ session, onClick }: { session: SessionSummary; onClick: () => void }) {
  return (
    <Card
      id={`session-card-${session.id}`}
      className="bg-card border-border py-0 gap-0 cursor-pointer active:opacity-80 transition-opacity"
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="text-base font-medium text-primary mb-0.5">{session.peak_stage}</div>
        <div className="text-[11px] text-muted-foreground mb-1.5">{session.peak_confidence_pct}% peak</div>
        <div className="text-[11px] text-muted-foreground/60">{session.venue_name ?? "No venue"}</div>
        <div className="text-[10px] text-muted-foreground/50 mt-0.5">
          {new Date(session.start_time).toLocaleDateString("en-IN", { month: "short", day: "numeric" })} · {session.drink_count} drinks
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Profile skeleton ─────────────────────────────────────────────────────────
function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-4">
        <Skeleton className="size-14 rounded-full" />
        <div className="flex flex-col gap-1.5 flex-1">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3.5 w-20" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-[var(--radius-md)]" />
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user: clerkUser } = useUser();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);

  useEffect(() => {
    fetch("/api/profile").then((r) => r.json()).then(setProfile);
    fetch("/api/sessions").then((r) => r.json()).then((d) => setSessions(d.sessions ?? []));
  }, []);

  return (
    <div className="dv-page bg-background">
      {/* Nav */}
      <div className="dv-nav flex items-center justify-between px-4 py-3">
        <DrunkvaLogo />
        <Button
          id="settings-btn"
          variant="ghost"
          size="icon-sm"
          onClick={() => router.push("/onboarding")}
          aria-label="Settings"
          className="text-muted-foreground"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
          </svg>
        </Button>
      </div>

      {!profile ? (
        <ProfileSkeleton />
      ) : (
        <div className="flex flex-col gap-5 p-4">
          {/* Avatar + name */}
          <div className="flex items-center gap-3.5">
            <Avatar className="size-14 text-xl">
              {profile.user.avatar_url && (
                <AvatarImage src={profile.user.avatar_url} alt={profile.user.real_name} />
              )}
              <AvatarFallback className="bg-muted text-muted-foreground font-medium text-lg">
                {getInitials(profile.user.real_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="text-[17px] font-semibold text-foreground">{profile.user.real_name}</div>
              {profile.user.alias && (
                <div className="text-[13px] text-muted-foreground">@{profile.user.alias}</div>
              )}
              <div className="flex gap-3.5 mt-1">
                <span className="text-[12px] text-muted-foreground">
                  <b className="text-foreground font-medium">{profile.follows}</b> following
                </span>
                <span className="text-[12px] text-muted-foreground">
                  <b className="text-foreground font-medium">{profile.followers}</b> followers
                </span>
              </div>
            </div>
          </div>

          {/* Lifetime stats */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Sessions", value: String(profile.stats.total_sessions) },
              { label: "All-time peak", value: `${profile.stats.all_time_peak}%` },
              { label: "Fav drink", value: profile.stats.favourite_drink ?? "—", capitalize: true },
              {
                label: "Fastest beer",
                value: profile.stats.fastest_beer_seconds != null
                  ? formatDuration(profile.stats.fastest_beer_seconds)
                  : "—",
              },
            ].map((s) => (
              <Card key={s.label} className="bg-card border-border py-0 gap-0">
                <CardContent className="px-3 py-2.5">
                  <div className="dv-stat-label">{s.label}</div>
                  <div className={cn("text-lg font-heading font-medium text-foreground mt-0.5", s.capitalize && "capitalize")}>
                    {s.value}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Past sessions */}
          <div>
            <div className="dv-stat-label mb-2">Past sessions</div>
            <div className="grid grid-cols-2 gap-2">
              {sessions.map((s) => (
                <SessionMiniCard
                  key={s.id}
                  session={s}
                  onClick={() => router.push(`/session/${s.id}`)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
