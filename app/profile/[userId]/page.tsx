"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
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

interface OtherProfile {
  user: { id: string; real_name: string; alias: string | null; avatar_url: string | null };
  stats: {
    total_sessions: number;
    all_time_peak: number;
    favourite_drink: string | null;
    fastest_beer_seconds: number | null;
  };
  follows: number;
  followers: number;
  is_following: boolean;
}

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function OtherProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useUser();
  const router = useRouter();
  const [profile, setProfile] = useState<OtherProfile | null>(null);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/profile?userId=${userId}`)
      .then((r) => r.json())
      .then((data) => {
        setProfile(data);
        setFollowing(data.is_following);
      });
  }, [userId]);

  const handleFollow = async () => {
    if (followLoading || !currentUser?.id) return;
    const next = !following;
    setFollowing(next); // optimistic
    setFollowLoading(true);
    try {
      await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followee_id: userId }),
      });
    } catch {
      setFollowing(!next); // revert
    } finally {
      setFollowLoading(false);
    }
  };

  const isOwnProfile = currentUser?.id === userId;

  if (!profile) {
    return (
      <div className="dv-page bg-background">
        <div className="dv-nav h-12" />
        <div className="flex flex-col gap-4 p-4">
          <div className="flex items-center gap-4">
            <Skeleton className="size-14 rounded-full" />
            <div className="flex flex-col gap-2 flex-1">
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
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="dv-page bg-background">
      {/* Nav */}
      <div className="dv-nav flex items-center gap-3 px-4 py-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => router.back()}
          aria-label="Back"
          className="text-muted-foreground"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Button>
        <span className="text-[15px] font-medium text-foreground flex-1">Profile</span>
      </div>

      <div className="flex flex-col gap-5 p-4">
        {/* Avatar + name + follow */}
        <div className="flex items-center gap-3.5">
          <Avatar className="size-14 text-xl">
            {profile.user.avatar_url && (
              <AvatarImage src={profile.user.avatar_url} alt={profile.user.real_name} />
            )}
            <AvatarFallback className="bg-muted text-muted-foreground font-medium text-lg">
              {getInitials(profile.user.real_name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
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

          {!isOwnProfile && (
            <Button
              id="follow-btn"
              variant={following ? "outline" : "default"}
              size="sm"
              onClick={handleFollow}
              disabled={followLoading}
              className={cn(
                "rounded-full text-xs font-medium h-8 px-4",
                following
                  ? "border-border text-muted-foreground"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/90"
              )}
            >
              {following ? "Following" : "Follow"}
            </Button>
          )}
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
      </div>

      <BottomNav />
    </div>
  );
}
