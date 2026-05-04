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

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE_MB = 25;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      showToast("Photo is too large. Please choose a photo under 25MB.");
      e.currentTarget.value = "";
      return;
    }

    const url = URL.createObjectURL(file);
    setUserPhoto(url);
  };

  useEffect(() => {
    if (!userPhoto) return;
    return () => {
      URL.revokeObjectURL(userPhoto);
    };
  }, [userPhoto]);

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

  // Export strategy:
  // Step 1 — draw background (photo or gradient) manually onto the export canvas.
  //           html2canvas cannot render blob: URL photo backgrounds, which caused
  //           the blank white output when we tried to capture previewRef directly.
  // Step 2 — capture only the stats overlay div (overlayRef) with html2canvas,
  //           forcing explicit dimensions because templates use absolute inset-0.
  //           Stylesheets are KEPT in the clone so Tailwind + SVG var() work.
  //           All computed styles are also inlined so html2canvas sees explicit values.
  // Step 3 — composite overlay at the user-dragged y-position.
  const buildExportBlob = async (): Promise<Blob> => {
    const overlayEl = overlayRef.current;
    if (!overlayEl) throw new Error("overlay not mounted");
    const previewEl = previewRef.current;
    if (!previewEl) throw new Error("preview not mounted");

    await document.fonts.ready;

    const captureWidth = previewEl.offsetWidth;
    const captureHeight = previewEl.offsetHeight;
    if (!Number.isFinite(captureWidth) || captureWidth <= 0 || !Number.isFinite(captureHeight) || captureHeight <= 0) {
      throw new Error("preview container has no measurable size");
    }
    const captureScale = EXPORT_W / captureWidth;

    // Step 1: draw background manually
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = EXPORT_W;
    exportCanvas.height = EXPORT_H;
    const ctx = exportCanvas.getContext("2d")!;

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
      grad.addColorStop(0, c0); grad.addColorStop(0.5, c1); grad.addColorStop(1, c2);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, EXPORT_W, EXPORT_H);
    }
    const scrim = ctx.createLinearGradient(0, EXPORT_H * 0.25, 0, EXPORT_H * 0.7);
    scrim.addColorStop(0, "rgba(0,0,0,0)");
    scrim.addColorStop(0.5, "rgba(0,0,0,0.3)");
    scrim.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = scrim;
    ctx.fillRect(0, 0, EXPORT_W, EXPORT_H);

    // Step 2: capture the stats overlay
    const savedFont = overlayEl.style.fontFamily;
    const savedW = overlayEl.style.width;
    const savedH = overlayEl.style.height;
    const savedMinH = overlayEl.style.minHeight;
    overlayEl.style.fontFamily = getComputedStyle(overlayEl).fontFamily;
    overlayEl.style.width = `${captureWidth}px`;
    overlayEl.style.height = `${captureHeight}px`;
    overlayEl.style.minHeight = `${captureHeight}px`;
    overlayEl.setAttribute("data-export-root", "1");

    const html2canvas = (await import("html2canvas")).default;

    const colorCanvas = document.createElement("canvas");
    const colorCtx = colorCanvas.getContext("2d");
    const normalizeColor = (value: string) => {
      if (!colorCtx) return value;
      const prev = colorCtx.fillStyle;
      colorCtx.fillStyle = "#000"; colorCtx.fillStyle = value;
      const out = colorCtx.fillStyle as string;
      colorCtx.fillStyle = prev;
      const m = /^oklab\((.+)\)$/i.exec(out);
      if (!m) return out;
      const parts = m[1].split("/");
      const lab = parts[0].trim().split(/\s+/);
      if (lab.length < 3) return out;
      const toNum = (s: string) => s.trim().endsWith("%") ? parseFloat(s) / 100 : parseFloat(s);
      const L = toNum(lab[0]), a = toNum(lab[1]), b = toNum(lab[2]);
      if ([L, a, b].some(Number.isNaN)) return out;
      let alpha = 1; if (parts[1]) { alpha = toNum(parts[1]); if (Number.isNaN(alpha)) alpha = 1; }
      const l_ = L+0.3963377774*a+0.2158037573*b, m_ = L-0.1055613458*a-0.0638541728*b, s_ = L-0.0894841775*a-1.291485548*b;
      const lc=l_*l_*l_, mc=m_*m_*m_, sc=s_*s_*s_;
      const linR=4.0767416621*lc-3.3077115913*mc+0.2309699292*sc;
      const linG=-1.2684380046*lc+2.6097574011*mc-0.3413193965*sc;
      const linB=-0.0041960863*lc-0.7034186147*mc+1.707614701*sc;
      const ts = (v: number) => v<=0.0031308?12.92*v:1.055*Math.pow(v,1/2.4)-0.055;
      const cl = (v: number) => Math.min(1,Math.max(0,v));
      const rr=Math.round(cl(ts(linR))*255), gg=Math.round(cl(ts(linG))*255), bb=Math.round(cl(ts(linB))*255), aa=cl(alpha);
      return aa<1?`rgba(${rr},${gg},${bb},${Math.round(aa*1000)/1000})`:`rgb(${rr},${gg},${bb})`;
    };
    const hasUnsupportedColor = (v: string) => /oklab|color-mix/i.test(v);
    const isColorLike = (p: string) => p.includes("color") || p === "fill" || p === "stroke";

    const renderOptions = {
      scale: captureScale,
      width: captureWidth,
      height: captureHeight,
      backgroundColor: null,
      useCORS: true,
      allowTaint: true,
      logging: false,
      onclone: (doc: Document, referenceEl?: HTMLElement) => {
        try {
          const clonedRoot = (referenceEl ?? doc.querySelector('[data-export-root="1"]')) as Element | null;
          if (!clonedRoot) return;
          const origs: Element[] = [], clones: Element[] = [];
          (function walk(o: Element, c: Element) {
            origs.push(o); clones.push(c);
            const oc = Array.from(o.children) as Element[];
            const cc = Array.from(c.children) as Element[];
            for (let i = 0; i < oc.length; i++) { if (!cc[i]) break; walk(oc[i], cc[i]); }
          })(overlayEl, clonedRoot as Element);
          for (let i = 0; i < origs.length; i++) {
            const o = origs[i], c = clones[i] as HTMLElement;
            try {
              const cs = getComputedStyle(o);
              for (const prop of Array.from(cs)) {
                const val = cs.getPropertyValue(prop);
                if (!val) continue;
                if (hasUnsupportedColor(val)) {
                  if (prop === "background-image" || prop === "background") {
                    c.style.setProperty(prop, "none");
                    const bg = cs.getPropertyValue("background-color");
                    if (bg) c.style.setProperty("background-color", normalizeColor(bg));
                  } else if (prop.includes("shadow") || prop === "filter" || prop === "backdrop-filter") {
                    c.style.setProperty(prop, "none");
                  } else if (isColorLike(prop)) {
                    c.style.setProperty(prop, normalizeColor(val));
                  }
                } else {
                  // Inline all resolved values AND keep stylesheets so
                  // CSS var() in SVG fill/stroke attributes still resolve.
                  c.style.setProperty(prop, val);
                }
              }
            } catch { /* ignore per-node */ }
          }
          // Stylesheets intentionally kept — removing them killed Tailwind
          // and SVG CSS variable resolution in previous iterations.
        } catch (e) { console.warn("html2canvas onclone failed", e); }
      },
    };

    let overlayCanvas: HTMLCanvasElement;
    try {
      overlayCanvas = await html2canvas(overlayEl, renderOptions);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/oklab|color-mix/i.test(msg)) {
        overlayCanvas = await html2canvas(overlayEl, { ...renderOptions, foreignObjectRendering: true });
      } else { throw err; }
    } finally {
      overlayEl.removeAttribute("data-export-root");
      overlayEl.style.fontFamily = savedFont;
      overlayEl.style.width = savedW;
      overlayEl.style.height = savedH;
      overlayEl.style.minHeight = savedMinH;
    }

    // Step 3: composite overlay at drag position
    const exportedOverlayH = captureHeight * captureScale * overlayScale;
    const overlayYPx = overlayY * EXPORT_H;
    const overlayXOffset = ((1 - overlayScale) / 2) * EXPORT_W;
    ctx.drawImage(overlayCanvas, overlayXOffset, overlayYPx, EXPORT_W * overlayScale, exportedOverlayH);

    return new Promise<Blob>((resolve, reject) => {
      exportCanvas.toBlob((blob) => {
        if (blob) resolve(blob); else reject(new Error("toBlob returned null"));
      }, "image/png");
    });
  };const handleShare = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const blob = await buildExportBlob();
      const file = new File([blob], "drunkva-session.png", { type: "image/png" });
      let canShareFiles = false;
      try {
        canShareFiles = typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });
      } catch {
        canShareFiles = false;
      }

      // Clear exporting BEFORE opening the share sheet / witness sheet so the
      // app unblurs and the popup is fully visible to the user.
      setExporting(false);

      if (typeof navigator.share === "function" && canShareFiles) {
        await navigator.share({ files: [file], title: "My Drunkva session" });
        if (!witnessShared) setWitnessSheetOpen(true);
      } else {
        const url = URL.createObjectURL(blob);
        try {
          const a = document.createElement("a");
          a.href = url; a.download = "drunkva-session.png"; a.click();
        } finally {
          URL.revokeObjectURL(url);
        }
        if (!witnessShared) setWitnessSheetOpen(true);
      }
    } catch (err: unknown) {
      setExporting(false);
      const e = err as Error | undefined;
      if (e?.name !== "AbortError") showToast(e?.message ?? "Share failed â€” try Download instead");
      console.error("Share error:", err);
    }
  };

  const handleDownload = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const blob = await buildExportBlob();
      // Unblur the app before triggering download & opening witness sheet
      setExporting(false);
      const url = URL.createObjectURL(blob);
      try {
        const a = document.createElement("a");
        a.href = url; a.download = "drunkva-session.png"; a.click();
        showToast("Saved to Downloads âœ“");
      } finally {
        URL.revokeObjectURL(url);
      }
      if (!witnessShared) setWitnessSheetOpen(true);
    } catch {
      setExporting(false);
      showToast("Export failed â€” please try again");
    }
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
    // Outer fragment so WitnessSheet can be a sibling of the page div.
    // This is critical: fixed+backdrop-blur sheets must not be children of a
    // stacking-context parent (transform, will-change, etc.) or they clip.
    <>
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
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoSelect}
                />
              </label>
            </div>

            {/* Preview â€” 9:16 container with draggable overlay */}
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
                {/* Drag handle â€” hidden from the html2canvas capture via
                    data-html2canvas-ignore so it never appears in exports. */}
                <div
                  data-html2canvas-ignore
                  className="flex justify-center mb-2 opacity-50 pointer-events-none"
                >
                  <div className="w-8 h-1 rounded-full bg-white" />
                </div>

                {/* Stats overlay â€” transparent bg so canvas compositing works */}
                <div ref={overlayRef} data-export-overlay="1">
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
    </div>

    {/* WitnessSheet rendered OUTSIDE the page div so its fixed backdrop is
        never clipped by the page's stacking context. This is the fix for the
        sheet being obscured/unclickable due to z-index + backdrop-filter issues. */}
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
    </>
  );
}
