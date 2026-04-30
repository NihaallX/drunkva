"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SessionStartScreen } from "@/components/drunkva/SessionStartScreen";
import { LiveSessionScreen } from "@/components/drunkva/LiveSessionScreen";
import { ExtrasSheet } from "@/components/drunkva/ExtrasSheet";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { useUser } from "@/hooks/useUser";

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

const EMPTY_SESSION: SessionState = {
  id: null,
  venueName: "",
  startTime: null,
  endTime: null,
  drinks: [],
  washroomCount: 0,
  burpCount: 0,
  chaknaLevel: "none",
  fastestBeerSeconds: null,
  fastestBeerIsPR: false,
};

export default function SessionPage() {
  const { user } = useUser();
  const router = useRouter();
  const { enqueue, queueCount, justSynced } = useOfflineQueue();

  const [session, setSession] = useState<SessionState>(EMPTY_SESSION);
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [logging, setLogging] = useState(false);
  const [venueInput, setVenueInput] = useState("");
  const [showStart, setShowStart] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("dv-active-session");
    if (saved) {
      try {
        setSession(JSON.parse(saved));
        setShowStart(false);
      } catch {
        // ignore corrupted local session payload
      }
    }
  }, []);

  useEffect(() => {
    if (session.id) localStorage.setItem("dv-active-session", JSON.stringify(session));
  }, [session]);

  const startSession = async () => {
    if (starting) return;
    setStarting(true);
    let lat: number | null = null;
    let lng: number | null = null;
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
      );
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch {
      // location optional
    }

    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        venue_name: venueInput || null,
        location_lat: lat,
        location_lng: lng,
      }),
    });

    if (res.ok) {
      const { session: s } = await res.json();
      setSession((p) => ({ ...p, id: s.id, venueName: venueInput, startTime: s.start_time }));
      setShowStart(false);
    }
    setStarting(false);
  };

  const logDrink = useCallback(
    async (type: string, options?: { manualDurationSeconds?: number }) => {
      if (!session.id || logging) return;
      setLogging(true);

      const logged_at = new Date().toISOString();
      const tempId = `temp-${Date.now()}`;
      const manualDurationSeconds = options?.manualDurationSeconds;

      setSession((s) => ({
        ...s,
        drinks: [
          ...s.drinks,
          {
            id: tempId,
            type,
            logged_at,
            duration_seconds: manualDurationSeconds ?? null,
            timing_method: manualDurationSeconds != null ? "stopwatch" : "gap",
          },
        ],
      }));

      const payload: Record<string, unknown> = { session_id: session.id, type, logged_at };
      if (typeof manualDurationSeconds === "number") {
        payload.manual_duration_seconds = manualDurationSeconds;
      }

      if (!navigator.onLine) {
        await enqueue({ type: "LOG_DRINK", payload, endpoint: "/api/drinks", method: "POST" });
        setLogging(false);
        return;
      }

      try {
        const res = await fetch("/api/drinks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const { is_pr, drink } = await res.json();
          setSession((s) => {
            const nextDrinks = s.drinks.map((d) => (d.id === tempId ? drink : d));
            if (type === "beer") {
              // Recalculate fastest beer from all beers
              const beers = nextDrinks.filter((d) => d.type === "beer");
              let fastest: typeof drink | null = null;
              let fastestSeconds: number | null = null;
              
              for (const b of beers) {
                if (b.duration_seconds != null && (b.duration_seconds >= 10 && b.duration_seconds <= 900)) {
                  if (fastest === null || b.duration_seconds < (fastestSeconds ?? Infinity)) {
                    fastest = b;
                    fastestSeconds = b.duration_seconds;
                  }
                }
              }
              
              return {
                ...s,
                drinks: nextDrinks,
                fastestBeerIsPR: fastest?.id === drink.id ? Boolean(is_pr) : s.fastestBeerIsPR,
                fastestBeerSeconds: fastestSeconds,
              };
            }
            return { ...s, drinks: nextDrinks };
          });
        }
      } catch {
        await enqueue({ type: "LOG_DRINK", payload, endpoint: "/api/drinks", method: "POST" });
      }

      setLogging(false);
    },
    [session.id, logging, enqueue]
  );

  const handleExtrasUpdate = async (data: {
    burpCount?: number;
    washroomCount?: number;
    chaknaLevel?: "none" | "light" | "heavy";
  }) => {
    const updated = {
      burpCount: data.burpCount ?? session.burpCount,
      washroomCount: data.washroomCount ?? session.washroomCount,
      chaknaLevel: data.chaknaLevel ?? session.chaknaLevel,
    };

    setSession((s) => ({ ...s, ...updated }));

    if (session.id) {
      await fetch(`/api/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          washroom_count: updated.washroomCount,
          burp_count: updated.burpCount,
          chakna_level: updated.chaknaLevel,
        }),
      });
    }
  };

  const endSession = async () => {
    if (!session.id) return;
    await fetch(`/api/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ end_time: new Date().toISOString() }),
    });
    localStorage.removeItem("dv-active-session");
    router.push(`/morning-card?sessionId=${session.id}`);
  };

  const userName = user?.fullName ?? "User";
  const userImageUrl = user?.imageUrl ?? null;

  if (showStart) {
    return (
      <SessionStartScreen
        venueInput={venueInput}
        onVenueChange={setVenueInput}
        onStart={startSession}
        starting={starting}
        userName={userName}
        userImageUrl={userImageUrl}
      />
    );
  }

  return (
    <>
      <LiveSessionScreen
        session={session}
        onEnd={endSession}
        onLogDrink={logDrink}
        onOpenExtras={() => setExtrasOpen(true)}
        logging={logging}
        userName={userName}
        userImageUrl={userImageUrl}
        queueCount={queueCount}
        justSynced={justSynced}
      />
      <ExtrasSheet
        open={extrasOpen}
        onClose={() => setExtrasOpen(false)}
        burpCount={session.burpCount}
        washroomCount={session.washroomCount}
        chaknaLevel={session.chaknaLevel}
        onUpdate={handleExtrasUpdate}
      />
    </>
  );
}
