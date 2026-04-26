"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDuration, formatSessionDuration } from "@/lib/confidence";

interface FeedCardProps {
  session: {
    id: string;
    peak_stage: string;
    peak_confidence_pct: number;
    session_title: string | null;
    venue_name: string | null;
    start_time: string;
    end_time: string | null;
    drink_count: number;
    fastest_beer_seconds: number | null;
    cheers_count: number;
    user_has_cheered: boolean;
    confirmed_witness_count?: number;
    is_verified?: boolean;
  };
  user: {
    real_name: string;
    alias: string | null;
    avatar_url: string | null;
    id: string;
  };
  currentUserId: string | null;
  onSessionClick?: (id: string) => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export function FeedCard({ session, user, currentUserId, onSessionClick }: FeedCardProps) {
  const [cheered, setCheered] = useState(session.user_has_cheered);
  const [cheersCount, setCheersCount] = useState(Number(session.cheers_count));
  const [loading, setLoading] = useState(false);

  const duration = session.end_time
    ? formatSessionDuration(
        new Date(session.end_time).getTime() - new Date(session.start_time).getTime()
      )
    : null;

  const handleCheers = async () => {
    if (loading || !currentUserId) return;
    const next = !cheered;
    setCheered(next);
    setCheersCount((c) => c + (next ? 1 : -1));
    setLoading(true);
    try {
      await fetch("/api/cheers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: session.id }),
      });
    } catch {
      setCheered(!next);
      setCheersCount((c) => c + (next ? -1 : 1));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id={`feed-item-${session.id}`} className="dv-feed-item">
      {/* User row */}
      <div className="flex items-center gap-2.5 mb-2.5">
        <Avatar className="size-[34px]">
          {user.avatar_url ? (
            <AvatarImage src={user.avatar_url} alt={user.real_name} />
          ) : null}
          <AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium">
            {getInitials(user.real_name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="text-[13px] font-medium text-foreground">
            {user.real_name}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {timeAgo(session.start_time)}
            {session.venue_name ? ` · ${session.venue_name}` : ""}
          </div>
        </div>
      </div>

      {/* Session card */}
      <Card
        className={cn(
          "bg-card border-border rounded-[var(--radius-md)] py-3 gap-3",
          onSessionClick && "cursor-pointer"
        )}
        onClick={() => onSessionClick?.(session.id)}
      >
        <CardContent className="px-3 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <div className="dv-stage-xl leading-none">
                {session.peak_stage}
              </div>
              {session.is_verified && (
                <span
                  title="Verified by 2+ witnesses"
                  className="flex items-center justify-center w-4 h-4 rounded-full bg-primary text-white text-[9px] font-bold shrink-0 mb-0.5"
                >
                  ✓
                </span>
              )}
            </div>
            <div className="dv-conf-pct">
              {session.peak_confidence_pct}% peak
            </div>
          </div>
          <div className="flex gap-3.5">
            {[
              { val: String(session.drink_count), lbl: "drinks" },
              {
                val: session.fastest_beer_seconds != null
                  ? formatDuration(session.fastest_beer_seconds)
                  : "—",
                lbl: "fastest",
              },
              { val: duration ?? "—", lbl: "hrs" },
            ].map((s) => (
              <div key={s.lbl} className="text-center">
                <div className="text-[14px] font-medium text-foreground">{s.val}</div>
                <div className="text-[9px] text-muted-foreground">{s.lbl}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Session title */}
      {session.session_title && (
        <p className="dv-session-title mt-1.5">"{session.session_title}"</p>
      )}

      <Separator className="mt-2.5 mb-2.5 bg-border/50" />

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          id={`cheers-${session.id}`}
          className={cn("dv-cheers-btn", cheered && "dv-cheers-btn--active")}
          onClick={handleCheers}
          aria-label={`Cheers — ${cheersCount}`}
        >
          🍻 Cheers · {cheersCount}
        </button>
        <span className="text-xs text-muted-foreground">Comment</span>
      </div>
    </div>
  );
}
