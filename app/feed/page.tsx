"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useInView } from "react-intersection-observer";
import { cn } from "@/lib/utils";
import { DrunkvaLogo } from "@/components/drunkva/DrunkvaLogo";
import { FeedCard } from "@/components/drunkva/FeedCard";
import { BottomNav } from "@/components/drunkva/BottomNav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MOCK_USER, clerkEnabled } from "@/lib/mock-user";

let useUser: () => { user: typeof MOCK_USER | null };
if (clerkEnabled) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  useUser = require("@clerk/nextjs").useUser;
} else {
  useUser = () => ({ user: MOCK_USER });
}

interface FeedItem {
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
  real_name: string;
  alias: string | null;
  avatar_url: string | null;
  author_id: string;
  confirmed_witness_count: number;
  is_verified: boolean;
}

function FeedSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Skeleton className="size-[34px] rounded-full" />
            <div className="flex flex-col gap-1.5 flex-1">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Skeleton className="h-[100px] w-full rounded-[var(--radius-md)]" />
        </div>
      ))}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex justify-center py-6">
      <div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin" />
    </div>
  );
}

export default function FeedPage() {
  const { user } = useUser();
  const router = useRouter();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const fetchingRef = useRef(false);

  // Intersection observer — sentinel at bottom of list
  const { ref: sentinelRef, inView } = useInView({ threshold: 0 });

  const loadFeed = useCallback(async (pageNum: number, replace = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const res = await fetch(`/api/feed?page=${pageNum}`);
      if (!res.ok) return;
      const data = await res.json();
      setFeed((prev) => (replace ? data.feed : [...prev, ...data.feed]));
      setHasMore(data.has_more);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
      fetchingRef.current = false;
    }
  }, []);

  // Initial load
  useEffect(() => { loadFeed(0, true); }, [loadFeed]);

  // Infinite scroll — fire when sentinel enters viewport
  useEffect(() => {
    if (inView && hasMore && !loading && !loadingMore) {
      const next = page + 1;
      setPage(next);
      setLoadingMore(true);
      loadFeed(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  const refresh = () => {
    setRefreshing(true);
    setPage(0);
    setHasMore(true);
    loadFeed(0, true);
  };

  // Cheers polling — refetch cheers counts every 30s when tab is visible
  const refetchCheers = useCallback(async () => {
    if (document.visibilityState !== "visible" || feed.length === 0) return;
    try {
      const res = await fetch("/api/feed?page=0");
      if (!res.ok) return;
      const data = await res.json();
      // Merge only cheers_count + user_has_cheered from fresh data, preserve local state otherwise
      setFeed((prev) =>
        prev.map((item) => {
          const fresh = (data.feed as FeedItem[]).find((f) => f.id === item.id);
          if (!fresh) return item;
          return { ...item, cheers_count: fresh.cheers_count, user_has_cheered: item.user_has_cheered };
        })
      );
    } catch {}
  }, [feed.length]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") refetchCheers();
    }, 30000);
    const onVisible = () => refetchCheers();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refetchCheers]);

  return (
    <div className="dv-page bg-background">
      {/* Nav */}
      <div className="dv-nav flex items-center justify-between px-4 py-3">
        <span className="text-[14px] font-medium text-foreground">Friends</span>
        <div className="flex items-center gap-3">
          <Button
            id="feed-refresh"
            variant="ghost"
            size="icon-sm"
            onClick={refresh}
            aria-label="Refresh feed"
            className={cn("text-muted-foreground", refreshing && "opacity-50")}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M15 9A6 6 0 1 1 9 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M9 3l3-3-3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Button>
          <DrunkvaLogo showWordmark={false} size={20} />
        </div>
      </div>

      {/* Content */}
      <div className="overflow-y-auto h-[calc(100dvh-120px)]">
        {loading ? (
          <FeedSkeleton />
        ) : feed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="text-4xl">🍺</span>
            <div className="text-[15px] font-medium text-foreground">No sessions yet</div>
            <div className="text-[13px] text-muted-foreground text-center px-8">
              Follow friends to see their sessions here
            </div>
          </div>
        ) : (
          <>
            {feed.map((item) => (
              <FeedCard
                key={item.id}
                session={item}
                user={{
                  id: item.author_id,
                  real_name: item.real_name,
                  alias: item.alias,
                  avatar_url: item.avatar_url,
                }}
                currentUserId={user?.id ?? null}
                onSessionClick={(id) => router.push(`/session/${id}`)}
              />
            ))}
            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-1" />
            {loadingMore && <LoadingSpinner />}
            {!hasMore && feed.length > 0 && (
              <p className="text-center text-[12px] text-muted-foreground py-6">You're all caught up 🍺</p>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
