"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ImagePlus } from "lucide-react";
// html2canvas is dynamically imported in exportAndShare to keep it out of the initial bundle.
import { cn } from "@/lib/utils";
import { DrunkvaLogo } from "@/components/drunkva/DrunkvaLogo";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { WitnessSheet } from "@/components/drunkva/WitnessSheet";
import { TemplateA } from "@/components/drunkva/ShareOverlay/TemplateA";
import { TemplateC } from "@/components/drunkva/ShareOverlay/TemplateC";

const BG_PRESETS = [
  { id: "dark-blue", style: "linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)" },
  { id: "dark-green", style: "linear-gradient(160deg, #0a1628 0%, #0d2137 50%, #0f3425 100%)" },
  { id: "dark-purple", style: "linear-gradient(160deg, #1a0a2e 0%, #2a1050 50%, #1a0a3a 100%)" },
];

type Template = "full" | "minimal";

//  Step indicator 
function StepBar({ step }: { step: number }) {
  return (
    <div className="flex gap-1.5 mb-5">
      {[1, 2, 3].map((s) => (
        <div
          key={s}
          className={cn(
            "flex-1 h-[3px] rounded-full transition-colors duration-300",
            step >= s ? "bg-primary" : "bg-border"
          )}
        />
      ))}
    </div>
  );
}

//  Toast notification 
function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div
      className={cn(
        "fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-card border border-border px-4 py-2.5 rounded-full text-[13px] text-foreground shadow-lg transition-all duration-300",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
      )}
    >
      {message}
    </div>
  );
}

//  Share overlay 
interface OverlayProps {
  session: any;
  drinks: any[];
  bgStyle: React.CSSProperties;
  template: Template;
  overlayRef: React.RefObject<HTMLDivElement | null>;
  fastestBeerIsPR?: boolean;
}

function ShareOverlay({ session, drinks, bgStyle, template, overlayRef, fastestBeerIsPR }: OverlayProps) {
  return (
    <div
      ref={overlayRef}
      className="relative w-full overflow-hidden rounded-xl"
      style={{ aspectRatio: "9/16", ...bgStyle }}
    >
      {template === "full" ? (
        <TemplateC session={session} drinks={drinks} fastestBeerIsPR={fastestBeerIsPR} />
      ) : (
        <TemplateA session={session} drinks={drinks} fastestBeerIsPR={fastestBeerIsPR} />
      )}
    </div>
  );
}

//  Main component 
export function MorningCardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const titleInputRef = useRef<HTMLTextAreaElement | null>(null);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [session, setSession] = useState<any>(null);
  const [drinks, setDrinks] = useState<any[]>([]);
  const [venueName, setVenueName] = useState("");
  const [title, setTitle] = useState("");
  const [loadingTitle, setLoadingTitle] = useState(false);
  const [selectedBg, setSelectedBg] = useState<string>("dark-blue");
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [template, setTemplate] = useState<Template>("full");
  const [exporting, setExporting] = useState(false);
  const [fastestBeerIsPR, setFastestBeerIsPR] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "" });
  const [witnessSheetOpen, setWitnessSheetOpen] = useState(false);
  const [witnessShared, setWitnessShared] = useState(false);

  const showToast = (message: string) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: "" }), 3500);
  };

  useEffect(() => {
    if (!sessionId) return;
    fetch(`/api/sessions/${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        setSession(data.session);
        setDrinks(data.drinks ?? []);
        setVenueName(data.session.venue_name ?? "");
        // Check if this session set a PR
        const beerDrinks = (data.drinks ?? []).filter((d: any) => d.type === "beer" && d.duration_seconds != null);
        if (beerDrinks.length > 0) {
          // The API already stores is_pr per drink.
          // Use the fastest beer in the session vs profile lifetime min
          // For now, propagate from session flags via drinks
          const hasPR = beerDrinks.some((d: any) => d.is_pr === true);
          setFastestBeerIsPR(hasPR);
        }
      });
  }, [sessionId]);

  const generateTitle = async () => {
    if (!session) return;
    setLoadingTitle(true);
    const drinkCounts: Record<string, number> = {};
    drinks.forEach((d: any) => { drinkCounts[d.type] = (drinkCounts[d.type] ?? 0) + 1; });
    const dominant = Object.entries(drinkCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "beer";

    try {
      const res = await fetch("/api/title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drink_count: drinks.length,
          dominant_drink_type: dominant,
          peak_stage: session.peak_stage,
          venue_name: venueName || "the bar",
          start_hour: new Date(session.start_time).getHours(),
        }),
      });
      const data = await res.json();
      if (data.error === "generation_failed" || data.title === null) {
        setTitle("");
        showToast("Couldn't generate a title - write your own?");
        setTimeout(() => titleInputRef.current?.focus(), 100);
      } else {
        setTitle(data.title ?? "");
      }
    } catch {
      setTitle("");
      showToast("Couldn't generate a title - write your own?");
      setTimeout(() => titleInputRef.current?.focus(), 100);
    }

    setLoadingTitle(false);
  };

  const exportAndShare = async () => {
    if (!overlayRef.current || exporting) return;
    setExporting(true);
    try {
      // Fix #2: dynamic import keeps html2canvas out of the initial bundle.
      // It will only load when the user taps Share on step 3.
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(overlayRef.current, { scale: 3, useCORS: true, backgroundColor: null, logging: false });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], "drunkva-session.png", { type: "image/png" });
        try {
          if (navigator.share) {
            await navigator.share({ files: [file], title: "My Drunkva session" });
          } else {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = "drunkva-session.png"; a.click();
          }
        } catch (shareError) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url; a.download = "drunkva-session.png"; a.click();
        }
        if (!witnessShared) setWitnessSheetOpen(true);
      }, "image/png");
    } catch {}
    setExporting(false);
  };

  const bgStyle: React.CSSProperties = userPhoto
    ? { backgroundImage: `url(${userPhoto})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: BG_PRESETS.find((b) => b.id === selectedBg)?.style ?? BG_PRESETS[0].style };

  if (!session) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <Skeleton className="h-5 w-32" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background pb-8">
      <Toast message={toast.message} visible={toast.visible} />

      {/* Nav */}
      <div className="dv-nav flex items-center gap-3 px-4 py-3">
        <Button variant="ghost" size="icon-sm" onClick={() => router.back()} className="text-muted-foreground">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Button>
        <DrunkvaLogo />
      </div>

      <div className="px-4 pt-4">
        <StepBar step={step} />

        {/* STEP 1: Refine */}
        {step === 1 && (
          <div className="flex flex-col gap-5">
            <h1 className="text-lg font-semibold text-foreground">Refine your session</h1>
            <div className="flex flex-col gap-1.5">
              <div className="dv-stat-label">Venue</div>
              <input id="venue-refine" className="dv-input" value={venueName} onChange={(e) => setVenueName(e.target.value)} placeholder="Venue name" />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="dv-stat-label">Drinks ({drinks.length} total)</div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(
                  drinks.reduce((acc: Record<string, number>, d: any) => ({ ...acc, [d.type]: (acc[d.type] ?? 0) + 1 }), {})
                ).map(([type, count]) => (
                  <div key={type} className="dv-surface px-3 py-1.5 text-[13px] text-foreground">
                    {count as React.ReactNode}x {type}
                  </div>
                ))}
              </div>
            </div>
            <Button id="step1-next" onClick={() => { setStep(2); generateTitle(); }}
              className="bg-primary text-primary-foreground active:bg-primary/90 h-12 text-[15px] font-medium">
              Generate title -&gt;
            </Button>
          </div>
        )}

        {/* STEP 2: Title */}
        {step === 2 && (
          <div className="flex flex-col gap-5">
            <h1 className="text-lg font-semibold text-foreground">Session title</h1>
            {loadingTitle ? (
              <Skeleton className="h-14 w-full rounded-[var(--radius-md)]" />
            ) : title ? (
              <div className="dv-surface p-3.5">
                <p className="text-[15px] font-medium text-foreground leading-snug">"{title}"</p>
              </div>
            ) : null}
            <div className="flex gap-2">
              <Button id="regenerate-title" variant="outline" onClick={generateTitle} disabled={loadingTitle}
                className="flex-1 border-border text-muted-foreground text-[13px]">
                {title ? "Regenerate" : "Try again"}
              </Button>
            </div>
            <textarea
              id="title-edit"
              ref={titleInputRef}
              className="dv-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              rows={2}
              placeholder="Write your own title..."
            />
            {/* Title is not required; user can skip with empty title. */}
            <Button id="step2-next" onClick={() => setStep(3)}
              className="bg-primary text-primary-foreground active:bg-primary/90 h-12 text-[15px] font-medium">
              Choose photo -&gt;
            </Button>
          </div>
        )}

        {/* STEP 3: Overlay + Share */}
        {step === 3 && (
          <div className="flex flex-col gap-4">
            {/* Template toggle */}
            <ToggleGroup type="single" value={template} onValueChange={(v) => v && setTemplate(v as Template)}
              className="w-full border border-border rounded-[var(--radius-md)] p-0.5 gap-0">
              <ToggleGroupItem id="template-full" value="full"
                className="flex-1 h-8 text-xs rounded-[calc(var(--radius-md)-2px)] data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                Strava
              </ToggleGroupItem>
              <ToggleGroupItem id="template-minimal" value="minimal"
                className="flex-1 h-8 text-xs rounded-[calc(var(--radius-md)-2px)] data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                Clean
              </ToggleGroupItem>
            </ToggleGroup>
            {/* Background picker */}
            <div className="flex gap-2">
              {BG_PRESETS.map((bg) => (
                <button
                  key={bg.id}
                  id={`bg-${bg.id}`}
                  onClick={() => { setSelectedBg(bg.id); setUserPhoto(null); }}
                  className={cn(
                    "size-10 rounded-lg border cursor-pointer transition-all",
                    selectedBg === bg.id && !userPhoto ? "border-2 border-primary" : "border-border"
                  )}
                  style={{ background: bg.style }}
                />
              ))}
              <label className={cn(
                "size-10 rounded-lg border cursor-pointer flex items-center justify-center text-lg bg-card transition-all",
                userPhoto ? "border-2 border-primary" : "border-border"
              )}>
                <ImagePlus className="size-4 text-muted-foreground" aria-hidden="true" />
                <input type="file" accept="image/*" className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => setUserPhoto(ev.target?.result as string);
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
            </div>

            {/* Overlay preview */}
            <ShareOverlay
              session={session}
              drinks={drinks}
              bgStyle={bgStyle}
              template={template}
              overlayRef={overlayRef}
              fastestBeerIsPR={fastestBeerIsPR}
            />

            {/* Share button */}
            <Button id="export-share-btn" onClick={exportAndShare} disabled={exporting}
              className="bg-primary text-primary-foreground active:bg-primary/90 h-12 text-[15px] font-medium">
              {exporting ? "Exporting..." : "Share"}
            </Button>
          </div>
        )}
      </div>

      {/* Witness tagging sheet appears after share. */}
      {sessionId && (
        <WitnessSheet
          open={witnessSheetOpen}
          sessionId={sessionId}
          onClose={() => setWitnessSheetOpen(false)}
          onDone={(count) => {
            setWitnessSheetOpen(false);
            setWitnessShared(true);
            if (count > 0) showToast(`Tagged ${count} witness${count > 1 ? "es" : ""}`);
          }}
        />
      )}
    </div>
  );
}
