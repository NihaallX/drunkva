"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { cn, formatLiveDuration } from "@/lib/utils";
import { DrunkvaLogo } from "@/components/drunkva/DrunkvaLogo";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const ConfidenceChart = dynamic(
  () => import("@/components/drunkva/ConfidenceChart").then((m) => ({ default: m.ConfidenceChart })),
  {
    ssr: false,
    loading: () => <div className="h-[180px] animate-pulse rounded-lg bg-card" />,
  }
);
import { BottomNav } from "@/components/drunkva/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDuration } from "@/lib/confidence";
import { useUser } from "@/hooks/useUser";
import { Timer } from "lucide-react";
import { getPreferredFastestDrink } from "@/lib/drink-speed";

interface SessionDetail {
  id: string;
  venue_name: string | null;
  start_time: string;
  end_time: string | null;
  session_title: string | null;
  peak_confidence_pct: number;
  peak_stage: string;
  total_duration_seconds: number | null;
  active_duration_seconds: number | null;
  was_auto_closed: boolean;
  washroom_count: number;
  burp_count: number;
  chakna_level: string;
  real_name: string;
  avatar_url: string | null;
  is_verified: boolean;
  user_id: string;
}

interface DrinkRecord {
  id: string;
  type: string;
  logged_at: string;
  duration_seconds: number | null;
  timing_method: "gap" | "stopwatch";
}

interface WitnessRecord {
  id: string;
  user_id: string;
  confirmed: boolean;
  real_name: string;
  alias: string | null;
  avatar_url: string | null;
}

const DRINK_EMOJIS: Record<string, string> = {
  beer: "🍺",
  shot: "🥃",
  wine: "🍷",
  cocktail: "🍹",
  spirit: "🥂",
};

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

// Sub-components

interface StatCardProps { label: string; value: string; highlight?: boolean; subtitle?: string; }
function StatCard({ label, value, highlight, subtitle }: StatCardProps) {
  return (
    <Card className="bg-card border-border py-0 gap-0">
      <CardContent className="px-3 py-2.5">
        <div className="dv-stat-label">{label}</div>
        <div className={cn("text-base font-medium mt-0.5", highlight ? "text-primary" : "text-foreground")}>
          {value}
        </div>
        {subtitle && <div className="mt-1 text-[11px] text-muted-foreground">{subtitle}</div>}
      </CardContent>
    </Card>
  );
}

interface DrinkRowProps { drink: DrinkRecord; isLast: boolean; }
function DrinkRow({ drink, isLast }: DrinkRowProps) {
  return (
    <>
      <div className="flex items-center justify-between py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="text-xl dv-drink-icon">{DRINK_EMOJIS[drink.type] ?? "🍹"}</span>
          <div>
            <div className="text-[13px] font-medium text-foreground capitalize">{drink.type}</div>
            <div className="text-[11px] text-muted-foreground">
              {new Date(drink.logged_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        </div>
        {drink.duration_seconds != null && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            {formatDuration(drink.duration_seconds)}
            {drink.timing_method === "stopwatch" && <Timer className="size-3.5 text-muted-foreground" />}
          </div>
        )}
      </div>
      {!isLast && <Separator className="bg-border/50" />}
    </>
  );
}

// Witness Banner
interface WitnessBannerProps {
  sessionId: string;
  taggerName: string;
  peakStage: string;
  onRespond: (confirmed: boolean) => void;
}
function WitnessBanner({ sessionId, taggerName, peakStage, onRespond }: WitnessBannerProps) {
  const [responded, setResponded] = useState(false);
  const [choice, setChoice] = useState<boolean | null>(null);

  const respond = async (confirmed: boolean) => {
    setResponded(true);
    setChoice(confirmed);
    await fetch("/api/witnesses", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, confirmed }),
    });
    onRespond(confirmed);
  };

  if (responded) {
    return (
      <div className={cn(
        "mx-4 mb-3 px-4 py-3 rounded-[var(--radius-md)] text-[13px] font-medium text-center",
        choice ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted text-muted-foreground"
      )}>
        {choice ? "You confirmed this session" : "Declined"}
      </div>
    );
  }

  return (
    <div className="mx-4 mb-3 bg-card border border-border rounded-[var(--radius-md)] p-3.5">
      <p className="text-[13px] text-foreground font-medium mb-0.5">
        {taggerName} tagged you as a witness
      </p>
      <p className="text-[12px] text-muted-foreground mb-3">
        Were you there for their {peakStage} session?
      </p>
      <div className="flex gap-2">
        <Button
          id="witness-decline"
          variant="outline"
          size="sm"
          className="flex-1 border-border text-muted-foreground"
          onClick={() => respond(false)}
        >
          Decline
        </Button>
        <Button
          id="witness-confirm"
          size="sm"
          className="flex-1 bg-primary text-primary-foreground active:bg-primary/90"
          onClick={() => respond(true)}
        >
          Confirm {"\u2713"}
        </Button>
      </div>
    </div>
  );
}

// Page

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useUser();
  const router = useRouter();
  const [witnessResponded, setWitnessResponded] = useState(false);

  const fetcher = (url: string) => fetch(url).then((r) => r.json());
  const { data } = useSWR<{
    session: SessionDetail;
    drinks: DrinkRecord[];
    witnesses: WitnessRecord[];
    cheers_count: number;
  }>(`/api/sessions/${id}`, fetcher);

  if (!data) {
    return (
      <div className="dv-page flex flex-col gap-4 p-4">
        <Skeleton className="h-6 w-40" />
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-[var(--radius-md)]" />
          ))}
        </div>
        <Skeleton className="h-40" />
      </div>
    );
  }

  const { session, drinks, witnesses, cheers_count } = data;

  // Check if the current user is a pending witness (tagged but not yet confirmed)
  const currentDbUserId = (user as any)?.dbId ?? (user as any)?.id ?? null;
  const myWitnessRecord = currentDbUserId
    ? witnesses.find((w) => w.user_id === currentDbUserId && !w.confirmed)
    : null;
  const isWitnessTagged = !!myWitnessRecord && !witnessResponded;

  const confirmedCount = witnesses.filter((w) => w.confirmed).length;

  const activeDuration = session.active_duration_seconds != null
    ? formatLiveDuration(session.active_duration_seconds)
    : null;
  const totalDurationSeconds = session.total_duration_seconds ?? (
    session.end_time
      ? Math.max(0, Math.floor((new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / 1000))
      : null
  );
  const totalDuration = totalDurationSeconds != null ? formatLiveDuration(totalDurationSeconds) : null;
  const fastestBeer = getPreferredFastestDrink(drinks, "beer");

  const stats: StatCardProps[] = [
    { label: "Peak stage", value: session.peak_stage, highlight: true },
    { label: "Peak confidence", value: `${session.peak_confidence_pct}%` },
    { label: "Drinks", value: String(drinks.length) },
    {
      label: "Active drinking time",
      value: activeDuration ?? "\u2014",
      subtitle: `Total time out: ${totalDuration ?? "\u2014"}`,
    },
    {
      label: "Fastest beer",
      value: fastestBeer?.duration_seconds != null ? formatDuration(fastestBeer.duration_seconds) : "\u2014",
      subtitle: fastestBeer?.timing_method === "stopwatch" ? "Stopwatch timed" : undefined,
    },
    { label: "Cheers", value: String(cheers_count) },
    { label: "Washroom", value: `${session.washroom_count} trips` },
    { label: "Chakna", value: session.chakna_level ?? "none" },
  ];

  return (
    <div className="dv-page bg-background">
      {/* Nav */}
      <div className="dv-nav flex items-center gap-3 px-4 py-3">
        <Button variant="ghost" size="icon-sm" onClick={() => router.back()} aria-label="Back" className="text-muted-foreground">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Button>
        <DrunkvaLogo />
      </div>

      {/* Witness confirmation banner - only shown to tagged users */}
      {isWitnessTagged && (
        <WitnessBanner
          sessionId={session.id}
          taggerName={session.real_name}
          peakStage={session.peak_stage}
          onRespond={() => setWitnessResponded(true)}
        />
      )}

      <ScrollArea className="h-[calc(100dvh-124px)]">
        <div className="flex flex-col gap-4 p-4">
          {/* Session header */}
          <div>
            <div className="text-[13px] text-muted-foreground mb-1">
              {session.venue_name ?? "Session"} -{" "}
              {new Date(session.start_time).toLocaleDateString("en-IN", {
                weekday: "short", month: "short", day: "numeric",
              })}
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] text-muted-foreground">by {session.real_name}</span>
              {session.is_verified && (
                <span className="flex items-center gap-1 text-[10px] text-primary font-medium">
                  <span className="w-3.5 h-3.5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">{"\u2713"}</span>
                  Verified by {confirmedCount} witnesses
                </span>
              )}
            </div>
            {session.session_title && (
              <p className="dv-session-title text-sm mb-2">"{session.session_title}"</p>
            )}
            {session.was_auto_closed && (
              <div className="text-[12px] text-muted-foreground">
                Session auto-closed after inactivity
              </div>
            )}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2">
            {stats.map((s) => (
              <StatCard key={s.label} label={s.label} value={s.value} highlight={s.highlight} subtitle={s.subtitle} />
            ))}
          </div>

          {/* Witness list - shown if any confirmed */}
          {confirmedCount > 0 && (
            <Card className="bg-card border-border py-0 gap-0">
              <CardContent className="px-3 py-3.5">
                <div className="dv-stat-label mb-2.5">Witnesses ({confirmedCount})</div>
                <div className="flex gap-2 flex-wrap">
                  {witnesses.filter((w) => w.confirmed).map((w) => (
                    <div key={w.id} className="flex items-center gap-1.5">
                      <Avatar className="size-6">
                        {w.avatar_url && <AvatarImage src={w.avatar_url} alt={w.real_name} />}
                        <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
                          {getInitials(w.real_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[12px] text-foreground">{w.real_name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Confidence chart */}
          <Card className="bg-card border-border py-0 gap-0">
            <CardContent className="px-3 py-3.5">
              <div className="dv-stat-label mb-2.5">Confidence curve</div>
              <ConfidenceChart
                drinks={drinks.map((d) => ({ type: d.type, logged_at: d.logged_at }))}
                sessionStart={session.start_time}
                peakConfidence={session.peak_confidence_pct}
                peakStage={session.peak_stage}
              />
            </CardContent>
          </Card>

          {/* Drink timeline */}
          <Card className="bg-card border-border py-0 gap-0">
            <CardContent className="px-3 py-3.5">
              <div className="dv-stat-label mb-1">Drink timeline</div>
              {drinks.length === 0 ? (
                <div className="text-[13px] text-muted-foreground py-2">No drinks recorded</div>
              ) : (
                drinks.map((d, i) => <DrinkRow key={d.id} drink={d} isLast={i === drinks.length - 1} />)
              )}
            </CardContent>
          </Card>

          {/* Share button */}
          <Button
            id="share-session-btn"
            onClick={() => {
              if (session.id) {
                localStorage.setItem(`dv-allow-morning-card-${session.id}`, "1");
              }
              router.push(`/morning-card?sessionId=${session.id}`);
            }}
            className="bg-primary text-primary-foreground active:bg-primary/90 h-12 text-[15px] font-medium"
          >
            Share this session
          </Button>
        </div>
      </ScrollArea>

      <BottomNav />
    </div>
  );
}
