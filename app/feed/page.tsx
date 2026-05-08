"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useInView } from "react-intersection-observer";
import { cn } from "@/lib/utils";
import { DrunkvaLogo } from "@/components/drunkva/DrunkvaLogo";
import { FeedCard } from "@/components/drunkva/FeedCard";
import { FundMeBanner } from "@/components/drunkva/FundMeBanner";
import { BottomNav } from "@/components/drunkva/BottomNav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useUser } from "@/hooks/useUser";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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
  const [pages, setPages] = useState<FeedItem[][]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const fetchingRef = useRef(false);

  // SWR manages page 0 — gives us free deduplication, revalidateOnFocus,
  // and stale-while-revalidate on the initial feed load.
  const { isLoading, mutate: mutatePage0 } = useSWR<{ feed: FeedItem[]; has_more: boolean }>(
    "/api/feed?page=0",
    fetcher,
    {
      // Re-poll cheers every 30s when tab is visible — SWR handles this
      // natively via refreshInterval. Only page 0 is polled; deeper pages
      // are fetched once and merged locally.
      refreshInterval: () => (document.visibilityState === "visible" ? 30_000 : 0),
      revalidateOnFocus: true,
      dedupingInterval: 10_000,
      onSuccess: (data) => {
        setPages((prev) => {
          const next = [...prev];
          next[0] = data.feed;
          return next;
        });
        setHasMore(data.has_more);
      },
    }
  );

  // Flatten all pages into a single ordered list
  const feed = pages.flat();

  const { ref: sentinelRef, inView } = useInView({ threshold: 0 });

  // Load next page when sentinel enters viewport
  const loadNextPage = useCallback(async () => {
    if (fetchingRef.current || !hasMore || loadingMore) return;
    fetchingRef.current = true;
    setLoadingMore(true);
    const next = pageIndex + 1;
    try {
      const res = await fetch(`/api/feed?page=${next}`);
      if (!res.ok) return;
      const data = await res.json();
      setPages((prev) => {
        const updated = [...prev];
        updated[next] = data.feed;
        return updated;
      });
      setPageIndex(next);
      setHasMore(data.has_more);
    } finally {
      setLoadingMore(false);
      fetchingRef.current = false;
    }
  }, [hasMore, loadingMore, pageIndex]);

  useEffect(() => {
    if (!inView || !hasMore || isLoading || loadingMore || feed.length === 0) return;
    void loadNextPage();
  }, [feed.length, hasMore, inView, isLoading, loadingMore, loadNextPage]);

  const refresh = () => {
    setPages([]);
    setPageIndex(0);
    setHasMore(true);
    mutatePage0();
  };

  const loading = isLoading && pages.length === 0;

  return (
    <div className="dv-page bg-background">
      <div className="dv-nav flex items-center justify-between px-4 py-3">
        <DrunkvaLogo />
        <div className="flex items-center gap-2">
          <Button
            id="feed-refresh"
            variant="ghost"
            size="icon-sm"
            onClick={refresh}
            aria-label="Refresh feed"
            className={cn("text-muted-foreground", isLoading && "opacity-50")}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M15 9A6 6 0 1 1 9 3"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              <path
                d="M9 3l3-3-3-3"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Button>
          <span className="text-[14px] font-medium text-foreground">Friends</span>
        </div>
      </div>

      <div className="overflow-y-auto h-[calc(100dvh-120px)]">
        {loading ? (
          <FeedSkeleton />
        ) : null}
        {!loading && <FundMeBanner />}
        {!loading && feed.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="text-4xl" aria-hidden="true">🍺</div>
            <div className="text-[15px] font-medium text-foreground">No sessions yet</div>
            <div className="text-[13px] text-muted-foreground text-center px-8">
              Follow friends to see their sessions here
            </div>
          </div>
        )}
        {!loading && feed.length > 0 && (
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
            <div ref={sentinelRef} className="h-1" />
            {loadingMore && <LoadingSpinner />}
            {!hasMore && feed.length > 0 && (
              <p className="text-center text-[12px] text-muted-foreground py-6">
                {"You're all caught up"}
              </p>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
