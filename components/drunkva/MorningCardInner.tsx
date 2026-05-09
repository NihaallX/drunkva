"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ImagePlus, RotateCcw } from "lucide-react";
// html2canvas is dynamically imported in exportAndShare to keep it out of the initial bundle.
import { cn, formatLiveDuration } from "@/lib/utils";
import { DrunkvaLogo } from "@/components/drunkva/DrunkvaLogo";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const WitnessSheet = dynamic(
  () => import("@/components/drunkva/WitnessSheet").then((module) => module.WitnessSheet),
  { ssr: false }
);
const TemplateA = dynamic(
  () => import("@/components/drunkva/ShareOverlay/TemplateA").then((module) => module.TemplateA),
  { ssr: false }
);
const TemplateC = dynamic(
  () => import("@/components/drunkva/ShareOverlay/TemplateC").then((module) => module.TemplateC),
  { ssr: false }
);

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
      {[1, 2].map((s) => (
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
  const wrapperRef = useRef<HTMLDivElement | null>(null);     // the draggable wrapper
  const previewRef = useRef<HTMLDivElement | null>(null);     // the visible preview container
  const titleInputRef = useRef<HTMLTextAreaElement | null>(null);

  const isDragging = useRef(false);
  const dragStart = useRef({ pointerX: 0, pointerY: 0, posX: 0, posY: 0 });
  const lastPinchDistance = useRef<number | null>(null);
  const lastTapTime = useRef(0);
  const positionRef = useRef({ x: 0.5, y: 0.25 });
  const scaleRef = useRef(1.0);

  // State
  const [step, setStep] = useState<1 | 2>(1);
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

  // Gestures
  const [position, setPosition] = useState({ x: 0.5, y: 0.25 });
  const [scale, setScale] = useState(1.0);
  const [showHint, setShowHint] = useState(true);

  useEffect(() => { positionRef.current = position; }, [position]);
  useEffect(() => { scaleRef.current = scale; }, [scale]);

  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastPinchDistance.current = Math.sqrt(dx * dx + dy * dy);
        isDragging.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && lastPinchDistance.current !== null) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const newDistance = Math.sqrt(dx * dx + dy * dy);
        const ratio = newDistance / lastPinchDistance.current;
        lastPinchDistance.current = newDistance;

        const newScale = Math.max(0.5, Math.min(1.5, scaleRef.current * ratio));
        scaleRef.current = newScale;
        
        if (wrapperRef.current) {
          wrapperRef.current.style.transform = `translate(-50%, 0) scale(${newScale})`;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        lastPinchDistance.current = null;
        setScale(scaleRef.current);
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!e.isPrimary) return;
    setShowHint(false);
    isDragging.current = true;
    dragStart.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      posX: positionRef.current.x,
      posY: positionRef.current.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || !previewRef.current) return;
    const container = previewRef.current.getBoundingClientRect();
    const deltaX = (e.clientX - dragStart.current.pointerX) / (container.width * scaleRef.current);
    const deltaY = (e.clientY - dragStart.current.pointerY) / (container.height * scaleRef.current);
    
    const newX = Math.max(0.1, Math.min(0.9, dragStart.current.posX + deltaX));
    const newY = Math.max(0.05, Math.min(0.85, dragStart.current.posY + deltaY));

    positionRef.current = { x: newX, y: newY };
    if (wrapperRef.current) {
      wrapperRef.current.style.left = `${newX * 100}%`;
      wrapperRef.current.style.top = `${newY * 100}%`;
    }
  };

  const handlePointerUp = () => {
    isDragging.current = false;
    setPosition(positionRef.current);
    
    const now = Date.now();
    if (now - lastTapTime.current < 300) {
      setPosition({ x: 0.5, y: 0.25 });
      setScale(1.0);
    }
    lastTapTime.current = now;
  };

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
        // Calculate duration if not already set
        let sessionData = data.session;
        if (!sessionData.total_duration_seconds && sessionData.start_time && sessionData.end_time) {
          const startMs = new Date(sessionData.start_time).getTime();
          const endMs = new Date(sessionData.end_time).getTime();
          sessionData.total_duration_seconds = Math.floor((endMs - startMs) / 1000);
        }
        setSession(sessionData);
        setDrinks(data.drinks ?? []);
        setVenueName(sessionData.venue_name ?? "");
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

  const buildExportBlob = async (): Promise<Blob> => {
    const overlayEl = overlayRef.current;
    if (!overlayEl) throw new Error("overlay not mounted");
    const previewEl = previewRef.current;
    if (!previewEl) throw new Error("preview not mounted");

    if (!document.getElementById("export-fonts")) {
      const link = document.createElement("link");
      link.id = "export-fonts";
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap";
      document.head.appendChild(link);
      await new Promise((resolve) => setTimeout(resolve, 800)); // give browser time to parse and fetch font files
    }
    await document.fonts.ready;

    const captureWidth = previewEl.offsetWidth;
    const captureHeight = previewEl.offsetHeight;
    if (!Number.isFinite(captureWidth) || captureWidth <= 0 || !Number.isFinite(captureHeight) || captureHeight <= 0) {
      throw new Error("preview container has no measurable size");
    }
    const captureScale = EXPORT_W / captureWidth;

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

    const currentPos = positionRef.current;
    const currentScale = scaleRef.current;

    const savedFont = overlayEl.style.fontFamily;
    const savedW = overlayEl.style.width;
    overlayEl.style.fontFamily = getComputedStyle(overlayEl).fontFamily;
    overlayEl.style.width = `${captureWidth}px`;
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
                if (prop === 'font-family') {
                  let cleanVal = val;
                  if (cleanVal.includes('__Barlow_Condensed')) cleanVal = '"Barlow Condensed", sans-serif';
                  else if (cleanVal.includes('__Space_Grotesk')) cleanVal = '"Space Grotesk", sans-serif';
                  else if (cleanVal.includes('__Inter')) cleanVal = '"Inter", sans-serif';
                  c.style.setProperty(prop, cleanVal, "important");
                } else if (hasUnsupportedColor(val)) {
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
                  c.style.setProperty(prop, val);
                }
              }
            } catch { /* ignore per-node */ }
          }
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
    }

    const overlayCanvasWidth = EXPORT_W * currentScale;
    const overlayCanvasHeight = (overlayCanvas.height / overlayCanvas.width) * overlayCanvasWidth;

    const overlayX = (currentPos.x * EXPORT_W) - (overlayCanvasWidth / 2);
    const overlayYPx = currentPos.y * EXPORT_H;

    ctx.drawImage(
      overlayCanvas,
      overlayX,
      overlayYPx,
      overlayCanvasWidth,
      overlayCanvasHeight
    );

    return new Promise<Blob>((resolve, reject) => {
      exportCanvas.toBlob((blob) => {
        if (blob) resolve(blob); else reject(new Error("toBlob returned null"));
      }, "image/png");
    });
  };

  const handleShare = async () => {
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
      if (e?.name !== "AbortError") showToast(e?.message ?? "Share failed — try Download instead");
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
        showToast("Saved to Downloads ✓");
      } finally {
        URL.revokeObjectURL(url);
      }
      if (!witnessShared) setWitnessSheetOpen(true);
    } catch {
      setExporting(false);
      showToast("Export failed — please try again");
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

        {/* STEP 1: Unified (Refine + Title) */}
        {step === 1 && (
          <div className="flex flex-col gap-5">
            {/* Page title */}
            <div>
              <h1 className="text-xl font-semibold text-foreground">Wrap up the night</h1>
              <p className="text-[13px] text-muted-foreground mt-1">Review your session before sharing</p>
            </div>

            {/* Stats card */}
            <div className="dv-surface p-4 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="dv-stat-label">Duration</div>
                  <div className="text-base font-medium text-foreground mt-1">
                    {session.total_duration_seconds ? formatLiveDuration(session.total_duration_seconds) : "-"}
                  </div>
                </div>
                <div>
                  <div className="dv-stat-label">Peak</div>
                  <div className="text-base font-medium text-foreground mt-1">
                    {session.peak_confidence_pct}%
                  </div>
                  <div className="text-[11px] text-muted-foreground capitalize">{session.peak_stage}</div>
                </div>
                <div>
                  <div className="dv-stat-label">Drinks</div>
                  <div className="text-base font-medium text-foreground mt-1">{drinks.length}</div>
                </div>
                <div>
                  <div className="dv-stat-label">Washroom</div>
                  <div className="text-base font-medium text-foreground mt-1">{session.washroom_count || 0}</div>
                </div>
              </div>
              {/* Drink breakdown chips */}
              <div className="pt-2 border-t border-border">
                <div className="text-[11px] text-muted-foreground mb-2">Drink breakdown</div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(
                    drinks.reduce((acc: Record<string, number>, d: any) => ({ ...acc, [d.type]: (acc[d.type] ?? 0) + 1 }), {})
                  ).map(([type, count]: [string, unknown]) => (
                    <div key={type} className="bg-background px-2.5 py-1 text-[12px] text-foreground rounded-full border border-border">
                      {count as number}x {type}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Venue input */}
            <div className="flex flex-col gap-1.5">
              <div className="dv-stat-label">Where were you drinking?</div>
              <input
                id="venue-input"
                className="dv-input"
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                placeholder="Venue name (optional)"
              />
            </div>

            {/* Session title section */}
            <div className="flex flex-col gap-1.5">
              <div className="dv-stat-label">Session title</div>
              {loadingTitle ? (
                <Skeleton className="h-16 w-full rounded-[var(--radius-md)]" />
              ) : title ? (
                <div className="dv-surface p-4 relative">
                  <p className="text-[15px] italic text-foreground text-center leading-snug">{title}</p>
                  <button
                    id="regenerate-btn"
                    onClick={generateTitle}
                    disabled={loadingTitle}
                    className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors text-xs"
                  >
                    ↻
                  </button>
                </div>
              ) : (
                <div className="dv-surface p-4">
                  <p className="text-[14px] text-muted-foreground text-center italic">Your AI title will appear here</p>
                </div>
              )}
            </div>

            {/* Generate title button */}
            <Button
              id="generate-title-btn"
              onClick={generateTitle}
              disabled={loadingTitle}
              className="h-12 text-[15px] font-medium bg-card border border-border text-foreground hover:bg-card/80"
            >
              {loadingTitle ? "⏳ Generating..." : "✦ Generate title"}
            </Button>

            {/* Choose photo button - disabled until title generated */}
            <Button
              id="choose-photo-btn"
              onClick={() => setStep(2)}
              disabled={!title || loadingTitle}
              className={cn(
                "h-12 text-[15px] font-medium bg-primary text-primary-foreground active:bg-primary/90",
                (!title || loadingTitle) && "opacity-40 pointer-events-none"
              )}
            >
              Choose photo →
            </Button>
          </div>
        )}

        {/* STEP 2: Overlay + Share (previously step 3) */}
        {step === 2 && (
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
                ref={wrapperRef}
                className="absolute w-full cursor-grab active:cursor-grabbing select-none touch-none z-10"
                style={{
                  left: `${position.x * 100}%`,
                  top: `${position.y * 100}%`,
                  transform: `translate(-50%, 0) scale(${scale})`,
                  transformOrigin: "top center",
                  willChange: "transform",
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              >
                {/* Drag handle */}
                <div
                  data-html2canvas-ignore
                  className="flex justify-center mb-2 opacity-50 pointer-events-none"
                >
                  <div className="w-8 h-1 rounded-full bg-white shadow-sm" />
                </div>

                {/* Stats overlay */}
                <div ref={overlayRef} data-export-overlay="1" className="w-full">
                  {template === "full" ? (
                    <TemplateC session={session} drinks={drinks} fastestBeerIsPR={fastestBeerIsPR} />
                  ) : (
                    <TemplateA session={session} drinks={drinks} fastestBeerIsPR={fastestBeerIsPR} />
                  )}
                </div>
              </div>

              {/* Reset button fallback */}
              <button
                onClick={() => { setPosition({ x: 0.5, y: 0.25 }); setScale(1.0); }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 
                           flex items-center justify-center z-20 transition-transform active:scale-90"
                aria-label="Reset overlay position"
              >
                <RotateCcw className="w-3.5 h-3.5 text-white/70" />
              </button>

              {/* Gesture Hint */}
              {showHint && (
                <div
                  className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none z-20"
                  style={{ animation: 'fadeOut 2.5s forwards' }}
                >
                  <div className="bg-black/60 text-white/90 text-xs px-3 py-1.5 rounded-full shadow-lg backdrop-blur-sm">
                    Drag to move &middot; Pinch to resize
                  </div>
                </div>
              )}
            </div>

            {/* Share + Download buttons */}
            <div className="flex gap-2">
              <Button
                id="export-share-btn"
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
