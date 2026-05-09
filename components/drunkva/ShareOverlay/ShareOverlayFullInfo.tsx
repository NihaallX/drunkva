"use client";

export interface FullInfoSelectedStats {
  duration: boolean;
  activeDuration: boolean;
  drinkBreakdown: boolean;
  personalBests: boolean;
  washroomCount: boolean;
  burpCount: boolean;
  chaknaLevel: boolean;
  witnesses: boolean;
  venue: boolean;
  sessionTitle: boolean;
}

interface ShareOverlayFullInfoSession {
  start_time: string;
  total_duration_seconds?: number | null;
  active_duration_seconds?: number | null;
  peak_stage?: string | null;
  peak_confidence_pct?: number | null;
  washroom_count?: number | null;
  burp_count?: number | null;
  chakna_level?: string | null;
  venue_name?: string | null;
  session_title?: string | null;
}

interface ShareOverlayFullInfoDrink {
  type: string;
  is_pr?: boolean | null;
}

interface ShareOverlayFullInfoWitness {
  confirmed?: boolean | null;
  alias?: string | null;
  real_name?: string | null;
}

interface ShareOverlayFullInfoProps {
  session: ShareOverlayFullInfoSession;
  drinks: ShareOverlayFullInfoDrink[];
  selectedStats: FullInfoSelectedStats;
  witnesses?: ShareOverlayFullInfoWitness[];
  sessionTitle?: string | null;
  venueName?: string | null;
}

function formatDurationCompact(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return "-";
  const totalMinutes = Math.max(0, Math.floor(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function formatDateLabel(isoDate: string): string {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function chaknaLabel(level: string | null | undefined): string {
  if (!level || level === "none") return "None";
  if (level === "light") return `Light ${"\u{1F35F}"}`;
  if (level === "heavy") return `Heavy ${"\u{1F356}"}`;
  return "None";
}

function drinkEmoji(type: string): string {
  const normalized = type.toLowerCase();
  if (normalized === "beer") return "\u{1F37A}";
  if (normalized === "shot") return "\u{1F943}";
  if (normalized === "wine") return "\u{1F377}";
  if (normalized === "cocktail") return "\u{1F379}";
  if (normalized === "spirit") return "\u{1F942}";
  return "\u{1F37B}";
}

export function ShareOverlayFullInfo({
  session,
  drinks,
  selectedStats,
  witnesses = [],
  sessionTitle,
  venueName,
}: ShareOverlayFullInfoProps) {
  const confidence = Math.max(0, Math.min(99, Math.round(session.peak_confidence_pct ?? 10)));
  const stage = (session.peak_stage ?? "Baseline").toUpperCase();
  const totalDrinks = drinks.length;
  const totalDuration = formatDurationCompact(session.total_duration_seconds);
  const activeDuration = formatDurationCompact(session.active_duration_seconds);
  const prCount = drinks.filter((drink) => drink.is_pr === true).length;
  const confirmedWitnesses = witnesses.filter((w) => w.confirmed).map((w) => w.alias || w.real_name).filter(Boolean) as string[];
  const witnessCount = confirmedWitnesses.length;
  const visibleTitle = (sessionTitle || session.session_title || "").trim();
  const visibleVenue = (venueName || session.venue_name || "").trim();
  const sessionDateLabel = formatDateLabel(session.start_time);

  const drinkCounts = drinks.reduce<Record<string, number>>((acc, drink) => {
    const key = drink.type.toLowerCase();
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const gridStats: Array<{ key: string; value: string; label: string; accent?: boolean }> = [
    { key: "total-drinks", value: `${totalDrinks}`, label: "TOTAL DRINKS" },
  ];

  if (selectedStats.duration) {
    gridStats.push({ key: "duration", value: totalDuration, label: "DURATION" });
  }
  if (selectedStats.activeDuration) {
    gridStats.push({ key: "active-duration", value: activeDuration, label: "ACTIVE TIME" });
  }
  if (selectedStats.personalBests && prCount > 0) {
    gridStats.push({
      key: "personal-bests",
      value: `${"\u{1F3C6}"} ${prCount} PR${prCount > 1 ? "s" : ""}`,
      label: "RECORDS BROKEN",
      accent: true,
    });
  }
  if (selectedStats.washroomCount) {
    gridStats.push({
      key: "washroom",
      value: `${session.washroom_count ?? 0} ${"\u{1F6BD}"}`,
      label: "WASHROOM",
    });
  }
  if (selectedStats.burpCount) {
    gridStats.push({
      key: "burps",
      value: `${session.burp_count ?? 0} ${"\u{1F4A8}"}`,
      label: "BURPS",
    });
  }
  if (selectedStats.chaknaLevel) {
    gridStats.push({
      key: "chakna",
      value: chaknaLabel(session.chakna_level),
      label: "CHAKNA",
    });
  }
  if (selectedStats.witnesses) {
    gridStats.push({
      key: "witnesses",
      value: `${witnessCount} ${"\u{1F441}"}`,
      label: "WITNESSES",
    });
  }

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-[18px] text-white"
      style={{
        backgroundColor: "#0a0a0a",
        backgroundImage:
          "radial-gradient(ellipse at 10% 10%, #1a0f00 0%, transparent 55%), radial-gradient(ellipse at 90% 90%, #0f0800 0%, transparent 55%)",
      }}
    >
      <div className="relative z-10 flex h-full flex-col px-6 py-6">
        <div className="min-h-[12%]">
          <div className="flex items-start justify-between gap-3">
            <div className="text-[18px] font-extrabold tracking-[0.12em] text-white">DRUNKVA</div>
            <div className="rounded-full border-[0.5px] border-[#f97316] px-[7px] py-[2px] text-[10px] font-semibold uppercase tracking-[0.15em] text-[#f97316]">
              FULL INFO
            </div>
          </div>
          {selectedStats.sessionTitle && visibleTitle && (
            <p
              className="mt-2 text-[15px] italic leading-[1.35] text-white"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {visibleTitle}
            </p>
          )}
          {selectedStats.venue && visibleVenue && (
            <p className="mt-1 text-[12px] text-[#555]">{visibleVenue}</p>
          )}
        </div>

        <div className="mt-4 min-h-[18%] text-center">
          <div className="text-[72px] font-black leading-none text-[#f97316]">{confidence}%</div>
          <div className="mt-1 text-[16px] font-bold uppercase tracking-[0.125em] text-white">{stage}</div>
          <div className="mt-3 h-[3px] w-full overflow-hidden rounded-full bg-[#1a1a1a]">
            <div className="h-full rounded-full bg-[#f97316]" style={{ width: `${confidence}%` }} />
          </div>
        </div>

        <div className="mt-4 h-px bg-[#1a1a1a]" />

        <div className="mt-4 min-h-[35%]">
          <div className="grid grid-cols-2 gap-x-4 gap-y-4">
            {gridStats.map((stat) => (
              <div key={stat.key}>
                <div className={`text-[20px] font-extrabold leading-tight ${stat.accent ? "text-[#f97316]" : "text-white"}`}>
                  {stat.value}
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.08em] text-[#444]">{stat.label}</div>
              </div>
            ))}
          </div>

          {selectedStats.drinkBreakdown && Object.keys(drinkCounts).length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {Object.entries(drinkCounts).map(([type, count]) => (
                <div
                  key={type}
                  className="rounded-md bg-[#1a1a1a] px-2.5 py-1 text-[10px] text-[#777]"
                >
                  {drinkEmoji(type)} {count}
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedStats.witnesses && confirmedWitnesses.length > 0 && (
          <>
            <div className="mt-4 h-px bg-[#1a1a1a]" />
            <div className="mt-4 min-h-[15%]">
              <div className="text-[10px] uppercase tracking-[0.1em] text-[#444]">WITNESSED BY</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {confirmedWitnesses.map((name) => (
                  <div
                    key={name}
                    className="rounded-full bg-[#1a1a1a] px-2.5 py-1 text-[12px] text-white"
                  >
                    {name}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="mt-auto flex items-end justify-between pt-4 text-[11px] text-[#333]">
          <div>drunkva.in</div>
          <div>{sessionDateLabel}</div>
        </div>
      </div>
    </div>
  );
}
