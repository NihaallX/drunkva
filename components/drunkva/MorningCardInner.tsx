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

const EXPORT_W = 1080;
const EXPORT_H = 1920;

const BG_PRESETS = [
  { id: "dark-blue", style: "linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)" },
  { id: "dark-green", style: "linear-gradient(160deg, #0a1628 0%, #0d2137 50%, #0f3425 100%)" },
  { id: "dark-purple", style: "linear-gradient(160deg, #1a0a2e 0%, #2a1050 50%, #1a0a3a 100%)" },
];

type Template = "full" | "minimal";

// Step indicator
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

// Toast notification
function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div
      className={cn(
        "fixed bottom-20 left-1/2 -translate-x-1/2 z-[var(--z-overlay)] bg-card border border-border px-4 py-2.5 rounded-full text-[13px] text-foreground shadow-lg transition-all duration-300",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
      )}
    >
      {message}
    </div>
  );
}

// Main component
export function MorningCardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");

  // Refs
  const overlayRef = useRef<HTMLDivElement | null>(null);     // stats overlay only (transparent bg)
  const previewRef = useRef<HTMLDivElement | null>(null);     // the visible preview container
  const titleInputRef = useRef<HTMLTextAreaElement | null>(null);
  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartOverlayY = useRef(0);

  // State
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

  // Drag to reposition: 0.0 = top, 0.75 = max bottom (to keep overlay visible)
  const [overlayY, setOverlayY] = useState(0.2);
  // Scale slider: 0.6 to 1.2, applied to the overlay card
  const [overlayScale, setOverlayScale] = useState(1.0);

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
        const beerDrinks = (data.drinks ?? []).filter((d: any) => d.type === "beer" && d.duration_seconds != null);
        if (beerDrinks.length > 0) {
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

  // Builds the export canvas and returns the blob.
  // Step 1: draw photo / gradient background onto a 1080x1920 canvas.
  // Step 2: draw a gradient scrim for text legibility.
  // Step 3: capture the stats overlay div with html2canvas at a scale that maps
  //         the element's natural (un-scaled) width to EXPORT_W.
  //         We read the element's natural dimensions via a temporary reset of the
  //         CSS transform — this avoids the broken `offsetWidth` when scale != 1.
  // Step 4: composite overlay at the dragged y-position.
  const buildExportBlob = async (): Promise<Blob> => {
    const overlayEl = overlayRef.current;
    if (!overlayEl) throw new Error("overlay not mounted");
    const previewEl = previewRef.current;
    const captureWidth = previewEl?.offsetWidth ?? overlayEl.offsetWidth ?? overlayEl.scrollWidth ?? 390;
    const captureHeight = previewEl?.offsetHeight ?? overlayEl.offsetHeight ?? overlayEl.scrollHeight ?? 693;

    if (!Number.isFinite(captureWidth) || captureWidth <= 0 || !Number.isFinite(captureHeight) || captureHeight <= 0) {
      throw new Error("overlay has no measurable size");
    }

    const canvas = document.createElement("canvas");
    canvas.width = EXPORT_W;
    canvas.height = EXPORT_H;
    const ctx = canvas.getContext("2d")!;

    // Step 1 — background
    if (userPhoto) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = userPhoto;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Photo failed to load"));
      });
      const imgAspect = img.naturalWidth / img.naturalHeight;
      const canvasAspect = EXPORT_W / EXPORT_H;
      let drawW: number, drawH: number, drawX: number, drawY: number;
      if (imgAspect > canvasAspect) {
        drawH = EXPORT_H; drawW = drawH * imgAspect;
        drawX = (EXPORT_W - drawW) / 2; drawY = 0;
      } else {
        drawW = EXPORT_W; drawH = drawW / imgAspect;
        drawX = 0; drawY = (EXPORT_H - drawH) / 2;
      }
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
    } else {
      const gradColors: Record<string, [string, string, string]> = {
        "dark-blue":   ["#1a1a2e", "#16213e", "#0f3460"],
        "dark-green":  ["#0a1628", "#0d2137", "#0f3425"],
        "dark-purple": ["#1a0a2e", "#2a1050", "#1a0a3a"],
      };
      const [c0, c1, c2] = gradColors[selectedBg] ?? gradColors["dark-blue"];
      const grad = ctx.createLinearGradient(0, 0, EXPORT_W * 0.6, EXPORT_H);
      grad.addColorStop(0, c0);
      grad.addColorStop(0.5, c1);
      grad.addColorStop(1, c2);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, EXPORT_W, EXPORT_H);
    }

    // Step 2 — gradient scrim
    const scrim = ctx.createLinearGradient(0, EXPORT_H * 0.25, 0, EXPORT_H * 0.7);
    scrim.addColorStop(0, "rgba(0,0,0,0)");
    scrim.addColorStop(0.5, "rgba(0,0,0,0.3)");
    scrim.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = scrim;
    ctx.fillRect(0, 0, EXPORT_W, EXPORT_H);

    // Step 3 — capture stats overlay
    // Temporarily reset the CSS transform so getBoundingClientRect returns the
    // natural (un-scaled) dimensions, giving html2canvas the correct scale factor.
    const parent = overlayEl.parentElement as HTMLElement | null;
    const savedTransform = parent?.style.transform ?? "";
    const savedWidth = overlayEl.style.width;
    const savedHeight = overlayEl.style.height;
    const savedMinHeight = overlayEl.style.minHeight;
    overlayEl.style.width = `${captureWidth}px`;
    overlayEl.style.height = `${captureHeight}px`;
    overlayEl.style.minHeight = `${captureHeight}px`;

    try {
      if (parent) parent.style.transform = "none";

      const captureScale = EXPORT_W / captureWidth;
      const html2canvas = (await import("html2canvas")).default;
      const overlayCanvas = await html2canvas(overlayEl, {
        scale: captureScale,
        width: captureWidth,
        height: captureHeight,
        backgroundColor: null,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });

      // Step 4 — composite at drag position
      const exportedOverlayH = captureHeight * captureScale * overlayScale;
      const overlayYPx = overlayY * EXPORT_H;
      const overlayXOffset = ((1 - overlayScale) / 2) * EXPORT_W;
      ctx.drawImage(overlayCanvas, overlayXOffset, overlayYPx, EXPORT_W * overlayScale, exportedOverlayH);
    } finally {
      if (parent) parent.style.transform = savedTransform;
      overlayEl.style.width = savedWidth;
      overlayEl.style.height = savedHeight;
      overlayEl.style.minHeight = savedMinHeight;
    }

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("toBlob returned null"));
      }, "image/png");
    });
  };

  const handleShare = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const blob = await buildExportBlob();
      const file = new File([blob], "drunkva-session.png", { type: "image/png" });
      const canShareFiles = typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });
      if (typeof navigator.share === "function" && canShareFiles) {
        await navigator.share({ files: [file], title: "My Drunkva session" });
        if (!witnessShared) setWitnessSheetOpen(true);
      } else {
        // Fallback: treat as download if Web Share not available
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "drunkva-session.png"; a.click();
        URL.revokeObjectURL(url);
        if (!witnessShared) setWitnessSheetOpen(true);
      }
    } catch (err: unknown) {
      // navigator.share throws AbortError if user cancels — don't show error toast
      const name = (err as Error)?.name;
      if (name !== "AbortError") showToast("Share failed — try Download instead");
    }
    setExporting(false);
  };

  const handleDownload = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const blob = await buildExportBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "drunkva-session.png"; a.click();
      URL.revokeObjectURL(url);
      showToast("Saved to Downloads");
      if (!witnessShared) setWitnessSheetOpen(true);
    } catch {
      showToast("Export failed — please try again");
    }
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
              Generate title &rarr;
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
                <p className="text-[15px] font-medium text-foreground leading-snug">&ldquo;{title}&rdquo;</p>
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
            <Button id="step2-next" onClick={() => setStep(3)}
              className="bg-primary text-primary-foreground active:bg-primary/90 h-12 text-[15px] font-medium">
              Choose photo &rarr;
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
                "size-10 rounded-lg border cursor-pointer flex items-center justify-center bg-card transition-all",
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

            {/* Preview — 9:16 container with draggable overlay */}
            <div
              ref={previewRef}
              className="relative w-full overflow-hidden rounded-xl bg-black"
              style={{ aspectRatio: "9/16", ...bgStyle }}
            >
              {userPhoto && (
                <img
                  src={userPhoto}
                  alt="Background"
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                />
              )}

              {/* Draggable stats overlay */}
              <div
                className="absolute left-0 right-0 cursor-grab active:cursor-grabbing select-none"
                style={{
                  top: `${overlayY * 100}%`,
                  transform: `scale(${overlayScale})`,
                  transformOrigin: "top center",
                }}
                onPointerDown={(e) => {
                  isDragging.current = true;
                  dragStartY.current = e.clientY;
                  dragStartOverlayY.current = overlayY;
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => {
                  if (!isDragging.current || !previewRef.current) return;
                  const containerH = previewRef.current.offsetHeight;
                  const deltaFraction = (e.clientY - dragStartY.current) / containerH;
                  const newY = Math.max(0, Math.min(0.75, dragStartOverlayY.current + deltaFraction));
                  setOverlayY(newY);
                }}
                onPointerUp={() => { isDragging.current = false; }}
              >
                {/* Drag handle indicator */}
                <div className="flex justify-center mb-2 opacity-50 pointer-events-none">
                  <div className="w-8 h-1 rounded-full bg-white" />
                </div>

                {/* Stats overlay — transparent bg so canvas compositing works */}
                <div ref={overlayRef}>
                  {template === "full" ? (
                    <TemplateC session={session} drinks={drinks} fastestBeerIsPR={fastestBeerIsPR} />
                  ) : (
                    <TemplateA session={session} drinks={drinks} fastestBeerIsPR={fastestBeerIsPR} />
                  )}
                </div>
              </div>
            </div>

            {/* Scale slider */}
            <div className="flex items-center gap-3 px-1">
              <span className="text-xs text-muted-foreground" aria-hidden="true">A</span>
              <input
                type="range"
                min={0.6}
                max={1.2}
                step={0.05}
                value={overlayScale}
                onChange={(e) => setOverlayScale(parseFloat(e.target.value))}
                className="flex-1 accent-primary"
                aria-label="Overlay size"
              />
              <span className="text-base text-muted-foreground" aria-hidden="true">A</span>
            </div>

            {/* Share + Download buttons */}
            <div className="flex gap-2">
              <Button
                id="export-share-btn"
                onClick={handleShare}
                disabled={exporting}
                className="flex-1 bg-primary text-primary-foreground active:bg-primary/90 h-12 text-[15px] font-medium"
              >
                {exporting ? "Exporting..." : "Share"}
              </Button>
              <Button
                id="export-download-btn"
                onClick={handleDownload}
                disabled={exporting}
                variant="outline"
                className="flex-1 border-border text-foreground h-12 text-[15px] font-medium"
              >
                Download
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Witness tagging sheet appears after share */}
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
