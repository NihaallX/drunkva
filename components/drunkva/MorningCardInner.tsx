"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ImagePlus, RotateCcw } from "lucide-react";
// html2canvas is dynamically imported in exportAndShare to keep it out of the initial bundle.
import { cn, formatLiveDuration } from "@/lib/utils";
import { logError, logWarn } from "@/lib/logger";
import { ShareExportErrorBoundary } from "@/components/drunkva/ShareExportErrorBoundary";
import { DrunkvaLogo } from "@/components/drunkva/DrunkvaLogo";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { FullInfoSelectedStats } from "@/components/drunkva/ShareOverlay/ShareOverlayFullInfo";
import { ShareCardCanvas } from "@/components/drunkva/ShareOverlay/ShareCardCanvas";

const WitnessSheet = dynamic(
  () => import("@/components/drunkva/WitnessSheet").then((module) => module.WitnessSheet),
  { ssr: false }
);
const StravaStyledTemplate = dynamic(
  () => import("@/components/drunkva/ShareOverlay/TemplateC").then((module) => module.StravaStyledTemplate),
  { ssr: false }
);
const FullInfoStatPicker = dynamic(
  () => import("@/components/drunkva/FullInfoStatPicker").then((module) => module.FullInfoStatPicker),
  { ssr: false }
);
const ShareOverlayFullInfo = dynamic(
  () => import("@/components/drunkva/ShareOverlay/ShareOverlayFullInfo").then((module) => module.ShareOverlayFullInfo),
  { ssr: false }
);

const EXPORT_W = 1080;
const EXPORT_H = 1920;

const BG_PRESETS = [
  { id: "dark-blue", style: "linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)" },
  { id: "dark-green", style: "linear-gradient(160deg, #0a1628 0%, #0d2137 50%, #0f3425 100%)" },
  { id: "dark-purple", style: "linear-gradient(160deg, #1a0a2e 0%, #2a1050 50%, #1a0a3a 100%)" },
];

let exportFontsPromise: Promise<void> | null = null;

type ShareTemplate = "strava" | "full-info";
type ShareStage = "template" | "picker" | "export";

const DEFAULT_FULL_INFO_STATS: FullInfoSelectedStats = {
  duration: true,
  activeDuration: true,
  drinkBreakdown: true,
  personalBests: true,
  washroomCount: true,
  burpCount: true,
  chaknaLevel: true,
  witnesses: true,
  venue: true,
  sessionTitle: true,
  confidenceGraph: true,
};

const ACTIVE_SESSION_STORAGE_KEY = "dv-active-session";
const allowMorningCardKey = (sessionId: string) => `dv-allow-morning-card-${sessionId}`;

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
  const previewRef = useRef<HTMLDivElement | null>(null);     // the visible preview container
  const titleInputRef = useRef<HTMLTextAreaElement | null>(null);

  const positionRef = useRef({ x: 0.5, y: 0.25 });
  const scaleRef = useRef(1.0);
  const shareCompleteTimerRef = useRef<number | null>(null);
  const endScreenMountTimerRef = useRef<number | null>(null);
  const endScreenUnderlineTimerRef = useRef<number | null>(null);

  // State
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [session, setSession] = useState<any>(null);
  const [drinks, setDrinks] = useState<any[]>([]);
  const [witnesses, setWitnesses] = useState<any[]>([]);
  const [venueName, setVenueName] = useState("");
  const [title, setTitle] = useState("");
  const [loadingTitle, setLoadingTitle] = useState(false);
  const [selectedBg, setSelectedBg] = useState<string>("dark-blue");
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ShareTemplate>("strava");
  const [shareStage, setShareStage] = useState<ShareStage>("template");
  const [selectedStats, setSelectedStats] = useState<FullInfoSelectedStats>(DEFAULT_FULL_INFO_STATS);
  const [exporting, setExporting] = useState(false);
  const [fastestBeerIsPR, setFastestBeerIsPR] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "" });
  const [witnessSheetOpen, setWitnessSheetOpen] = useState(false);
  const [witnessShared, setWitnessShared] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [shareCompleteAction, setShareCompleteAction] = useState<"saved" | "shared" | null>(null);
  const [shareExitVisible, setShareExitVisible] = useState(false);
  const [endScreenMounted, setEndScreenMounted] = useState(false);
  const [endScreenUnderlineVisible, setEndScreenUnderlineVisible] = useState(false);

  const showToast = (message: string) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: "" }), 3500);
  };

  const ensureExportFontsLoaded = () => {
    if (typeof document === "undefined") return Promise.resolve();

    if (document.getElementById("export-fonts") && document.fonts.check('16px "Barlow Condensed"') && document.fonts.check('16px "Inter"')) {
      return Promise.resolve();
    }

    if (!exportFontsPromise) {
      exportFontsPromise = (async () => {
        if (!document.getElementById("export-fonts")) {
          const link = document.createElement("link");
          link.id = "export-fonts";
          link.rel = "stylesheet";
          link.href = "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap";
          document.head.appendChild(link);
        }

        await Promise.all([
          document.fonts.load('400 16px "Barlow Condensed"'),
          document.fonts.load('400 16px "Inter"'),
        ]);
        await document.fonts.ready;
      })().finally(() => {
        exportFontsPromise = null;
      });
    }

    return exportFontsPromise;
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
    const allowMorningCard = window.localStorage.getItem(allowMorningCardKey(sessionId)) === "1";
    fetch(`/api/sessions/${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        // Calculate duration if not already set
        let sessionData = data.session;
        if (sessionData?.end_time && !allowMorningCard) {
          window.localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
          showToast("That night's already been logged 🌅");
          router.replace("/session");
          return;
        }
        if (allowMorningCard) {
          window.localStorage.removeItem(allowMorningCardKey(sessionId));
        }
        if (!sessionData.total_duration_seconds && sessionData.start_time && sessionData.end_time) {
          const startMs = new Date(sessionData.start_time).getTime();
          const endMs = new Date(sessionData.end_time).getTime();
          sessionData.total_duration_seconds = Math.floor((endMs - startMs) / 1000);
        }
        setSession(sessionData);
        setDrinks(data.drinks ?? []);
        setWitnesses(data.witnesses ?? []);
        setVenueName(sessionData.venue_name ?? "");
        const beerDrinks = (data.drinks ?? []).filter((d: any) => d.type === "beer" && d.duration_seconds != null);
        if (beerDrinks.length > 0) {
          const hasPR = beerDrinks.some((d: any) => d.is_pr === true);
          setFastestBeerIsPR(hasPR);
        }
      });
  }, [router, sessionId]);

  useEffect(() => {
    if (step !== 3) {
      setEndScreenMounted(false);
      setEndScreenUnderlineVisible(false);
      return;
    }

    window.localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
    setEndScreenMounted(false);
    setEndScreenUnderlineVisible(false);

    endScreenMountTimerRef.current = window.setTimeout(() => {
      setEndScreenMounted(true);
    }, 20);

    endScreenUnderlineTimerRef.current = window.setTimeout(() => {
      setEndScreenUnderlineVisible(true);
    }, 300);

    return () => {
      if (endScreenMountTimerRef.current != null) {
        window.clearTimeout(endScreenMountTimerRef.current);
        endScreenMountTimerRef.current = null;
      }
      if (endScreenUnderlineTimerRef.current != null) {
        window.clearTimeout(endScreenUnderlineTimerRef.current);
        endScreenUnderlineTimerRef.current = null;
      }
    };
  }, [step]);

  useEffect(() => {
    return () => {
      if (shareCompleteTimerRef.current != null) {
        window.clearTimeout(shareCompleteTimerRef.current);
      }
      if (endScreenMountTimerRef.current != null) {
        window.clearTimeout(endScreenMountTimerRef.current);
      }
      if (endScreenUnderlineTimerRef.current != null) {
        window.clearTimeout(endScreenUnderlineTimerRef.current);
      }
    };
  }, []);

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
    } catch (err) {
      logError({ context: 'MorningCardInner', message: 'Title generation failed', data: err instanceof Error ? err.message : String(err) });
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

    await ensureExportFontsLoaded();

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
    const isFullInfoTemplate = selectedTemplate === "full-info";

    if (!isFullInfoTemplate) {
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
    }

    const currentPos = positionRef.current;
    const currentScale = scaleRef.current;

    const savedFont = overlayEl.style.fontFamily;
    const savedW = overlayEl.style.width;
    overlayEl.style.fontFamily = getComputedStyle(overlayEl).fontFamily;
    overlayEl.style.width = `${captureWidth}px`;
    overlayEl.setAttribute("data-export-root", "1");

    const wrapperEl = document.getElementById("share-card-wrapper");
    const savedTransform = wrapperEl?.style.transform;
    if (wrapperEl) {
      wrapperEl.style.transform = "translate(-50%, 0) scale(1)";
    }

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
      windowHeight: captureHeight,
      windowWidth: captureWidth,
      // willReadFrequently reduces canvas repaint overhead on low-end devices
      canvasUsesDefaultCanvasContextSettings: false,
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
            } catch (e) {
              logWarn({ context: 'MorningCardInner', message: 'Style clone error', data: e instanceof Error ? e.message : String(e) });
              /* skip problematic styles on cloned element */
            }
          }
        } catch (e) {
          logError({ context: 'MorningCardInner', message: 'html2canvas onclone error', data: e instanceof Error ? e.message : String(e) });
        }
      },
    };

    let overlayCanvas: HTMLCanvasElement;
    try {
      overlayCanvas = await html2canvas(overlayEl, renderOptions);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logError({ context: 'MorningCardInner', message: 'html2canvas render error', data: msg });
      if (/oklab|color-mix/i.test(msg)) {
        try {
          logWarn({ context: 'MorningCardInner', message: 'Retrying html2canvas with foreignObjectRendering' });
          overlayCanvas = await html2canvas(overlayEl, { ...renderOptions, foreignObjectRendering: true });
        } catch (retryErr) {
          logError({ context: 'MorningCardInner', message: 'html2canvas retry failed', data: retryErr instanceof Error ? retryErr.message : String(retryErr) });
          throw err;
        }
      } else { throw err; }
    } finally {
      if (wrapperEl && savedTransform) wrapperEl.style.transform = savedTransform;
      overlayEl.removeAttribute("data-export-root");
      overlayEl.style.fontFamily = savedFont;
      overlayEl.style.width = savedW;
    }

    const overlayCanvasWidth = isFullInfoTemplate ? EXPORT_W : EXPORT_W * currentScale;
    const overlayCanvasHeight = isFullInfoTemplate
      ? EXPORT_H
      : (overlayCanvas.height / overlayCanvas.width) * overlayCanvasWidth;

    const overlayX = isFullInfoTemplate ? 0 : (currentPos.x * EXPORT_W) - (overlayCanvasWidth / 2);
    const overlayYPx = isFullInfoTemplate ? 0 : currentPos.y * EXPORT_H;

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
      } catch (err) {
        logWarn({ context: 'MorningCardInner', message: 'Share detection error', data: err instanceof Error ? err.message : String(err) });
        canShareFiles = false;
      }

      // Clear exporting BEFORE opening the share sheet / witness sheet so the
      // app unblurs and the popup is fully visible to the user.
      setExporting(false);

      if (typeof navigator.share === "function" && canShareFiles) {
        await navigator.share({ files: [file], title: "My Drunkva session" });
        handleShareComplete("shared");
      } else {
        const url = URL.createObjectURL(blob);
        try {
          const a = document.createElement("a");
          a.href = url; a.download = "drunkva-session.png"; a.click();
        } finally {
          URL.revokeObjectURL(url);
        }
        handleShareComplete("saved");
      }
    } catch (err: unknown) {
      setExporting(false);
      const e = err as Error | undefined;
      if (e?.name !== "AbortError") {
        showToast(e?.message ?? "Share failed — try Download instead");
        logError({ context: 'MorningCardInner', message: 'Share handler error', data: e?.message ?? String(err) });
      }
    }
  };

  const handleDownload = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const blob = await buildExportBlob();
      // Unblur the app before triggering download.
      setExporting(false);
      const url = URL.createObjectURL(blob);
      try {
        const a = document.createElement("a");
        a.href = url; a.download = "drunkva-session.png"; a.click();
      } finally {
        URL.revokeObjectURL(url);
      }
      handleShareComplete("saved");
    } catch (err) {
      setExporting(false);
      showToast("Export failed — please try again");
      logError({ context: 'MorningCardInner', message: 'Download handler error', data: err instanceof Error ? err.message : String(err) });
    }
  };

  const handleTemplateSelect = (template: ShareTemplate) => {
    setSelectedTemplate(template);
    setResetKey(k => k + 1);

    if (template === "full-info") {
      setShareStage("picker");
      return;
    }

    setShareStage("export");
  };

  const handleShareComplete = (action: "saved" | "shared") => {
    if (step === 3) return;

    setShareCompleteAction(action);
    setShareExitVisible(true);

    if (shareCompleteTimerRef.current != null) {
      window.clearTimeout(shareCompleteTimerRef.current);
    }

    shareCompleteTimerRef.current = window.setTimeout(() => {
      setStep(3);
      setShareExitVisible(false);
    }, 200);
  };

  const handleDone = () => {
    router.replace("/session");
  };

  const handleViewSession = () => {
    router.push("/feed");
  };

  const handleNavBack = () => {
    if (step === 1) {
      router.back();
      return;
    }

    if (shareStage === "picker") {
      setShareStage("template");
      return;
    }

    if (shareStage === "export") {
      if (selectedTemplate === "full-info") {
        setShareStage("picker");
      } else {
        setShareStage("template");
      }
      return;
    }

    setStep(1);
  };

  const totalDrinks = drinks.length;
  const peakConfidencePct = typeof session?.peak_confidence_pct === "number" ? session.peak_confidence_pct : null;
  const durationSeconds = typeof session?.total_duration_seconds === "number" ? session.total_duration_seconds : null;

  const endScreenPills = [
    totalDrinks > 0 ? `${totalDrinks} drinks` : null,
    peakConfidencePct && peakConfidencePct > 0
      ? (
        <span key="peak">
          <span className="text-[#f97316]">{peakConfidencePct}%</span>
          <span className="text-[#666]"> peak</span>
        </span>
      )
      : null,
    durationSeconds && durationSeconds > 0 ? formatLiveDuration(durationSeconds) : null,
  ].filter(Boolean);

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
      <Toast message={toast.message} visible={toast.visible} />
      {step !== 3 && (
        <div className="min-h-dvh bg-background pb-8">
          {/* Nav */}
          <div className="dv-nav flex items-center gap-3 px-4 py-3">
            <Button variant="ghost" size="icon-sm" onClick={handleNavBack} className="text-muted-foreground">
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

            {/* Choose template button - disabled until title generated */}
            <Button
              id="choose-photo-btn"
              onClick={() => {
                setStep(2);
                setShareStage("template");
              }}
              disabled={!title || loadingTitle}
              className={cn(
                "h-12 text-[15px] font-medium bg-primary text-primary-foreground active:bg-primary/90",
                (!title || loadingTitle) && "opacity-40 pointer-events-none"
              )}
            >
              Choose template →
            </Button>
          </div>
            )}
            {step === 2 && shareStage === "template" && (
              <div className={cn("flex flex-col gap-4 transition-opacity duration-200", shareExitVisible && "opacity-0 pointer-events-none")}>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Choose a template</h2>
              <p className="mt-1 text-[13px] text-muted-foreground">Pick your style before exporting</p>
            </div>

                <button
                  type="button"
                  onClick={() => handleTemplateSelect("strava")}
                  className="dv-surface flex w-full items-center justify-between gap-3 rounded-[18px] p-4 text-left transition-colors hover:bg-card/80"
                >
              <div className="min-w-0">
                <div className="text-[16px] font-semibold text-white truncate">Strava</div>
                <div className="mt-1 text-[12px] text-[#555] line-clamp-2">The classic draggable share look.</div>
              </div>
              <div className="flex h-[84px] w-[52px] shrink-0 flex-col items-center justify-between overflow-hidden rounded-[10px] border-[0.5px] border-[#222] bg-[#0a0a0a] px-2 py-2">
                <div className="text-[6px] font-semibold leading-none tracking-[0.16em] text-white">DRUNKVA</div>
                <div className="flex w-full items-end justify-center gap-[2px] pt-1">
                  <div className="h-[22px] w-[2px] rounded-full bg-[#f97316]/80" />
                  <div className="h-[34px] w-[2px] rounded-full bg-[#f97316]" />
                  <div className="h-[18px] w-[2px] rounded-full bg-[#f97316]/70" />
                </div>
                <div className="h-[2px] w-full rounded-full bg-white/10">
                  <div className="h-full w-[72%] rounded-full bg-[#f97316]" />
                </div>
              </div>
              </button>

                <button
                  type="button"
                  onClick={() => handleTemplateSelect("full-info")}
                  className="dv-surface flex w-full items-center justify-between gap-3 rounded-[18px] p-4 text-left transition-colors hover:bg-card/80"
                >
              <div className="min-w-0">
                <div className="text-[16px] font-semibold text-white truncate">Full Info</div>
                <div className="mt-1 text-[12px] text-[#555] line-clamp-2">Every stat. For the obsessives.</div>
              </div>
              <div className="flex h-[84px] w-[52px] shrink-0 flex-col justify-between overflow-hidden rounded-[10px] border-[0.5px] border-[#222] bg-[#0a0a0a] px-2 py-2">
                <div className="whitespace-nowrap text-[6px] font-semibold leading-none tracking-[0.16em] text-white">
                  DRUNKVA
                </div>
                <div className="text-center text-[20px] font-black leading-none tracking-[-0.04em] text-[#f97316]">
                  74%
                </div>
                <div className="h-[2px] rounded-full bg-[#1a1a1a]">
                  <div className="h-full w-[74%] rounded-full bg-[#f97316]" />
                </div>
              </div>
                </button>
              </div>
            )}

            {step === 2 && shareStage === "picker" && selectedTemplate === "full-info" && (
              <div className={cn("transition-opacity duration-200", shareExitVisible && "opacity-0 pointer-events-none")}>
                <FullInfoStatPicker
                  selectedStats={selectedStats}
                  onChange={setSelectedStats}
                  onBack={() => setShareStage("template")}
                  onGenerate={() => setShareStage("export")}
                />
              </div>
            )}

            {step === 2 && shareStage === "export" && (
              <div className={cn("flex flex-col gap-4 transition-opacity duration-200", shareExitVisible && "opacity-0 pointer-events-none")}>
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

            <div ref={previewRef} className="w-full">
              <ShareExportErrorBoundary>
              <ShareCardCanvas
                backgroundSrc={userPhoto}
                containerStyle={bgStyle}
                resetKey={resetKey}
                onTransformChange={(s, x, y) => {
                  scaleRef.current = s;
                  positionRef.current = { x, y };
                }}
              >
                <div ref={overlayRef} data-export-overlay="1" className="w-full">
                  {selectedTemplate === "strava" ? (
                    <StravaStyledTemplate session={session} drinks={drinks} fastestBeerIsPR={fastestBeerIsPR} />
                  ) : (
                    <ShareOverlayFullInfo
                      session={session}
                      drinks={drinks}
                      witnesses={witnesses}
                      selectedStats={selectedStats}
                      sessionTitle={title}
                      venueName={venueName}
                    />
                  )}
                </div>
              </ShareCardCanvas>
            </ShareExportErrorBoundary>
            </div>

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
      )}

      {step === 3 && (
        <div className="flex min-h-dvh items-center justify-center bg-[#0a0a0a] px-4">
          <div
            className={cn(
              "end-screen w-full max-w-[390px] flex flex-col items-center text-center",
              endScreenMounted && "mounted"
            )}
          >
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "block text-[64px] leading-none transition-transform duration-300 ease-out",
                  endScreenMounted ? "scale-100" : "scale-[0.8]"
                )}
                aria-hidden="true"
              >
                🌅
              </span>
              <div
                className={cn(
                  "mt-3 h-[1.5px] w-0 rounded-full bg-[#f97316] transition-[width] duration-[600ms] ease-out delay-300",
                  endScreenUnderlineVisible && "w-12"
                )}
              />
            </div>

            <div className="mt-8 flex flex-col gap-1.5">
              <h2 className="text-[26px] font-extrabold tracking-[-0.03em] text-white">Night logged.</h2>
              <p className="text-[14px] font-normal text-[#555]">Go drink some water.</p>
            </div>

            {endScreenPills.length > 0 && (
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {endScreenPills.map((pill, index) => (
                  <div
                    key={`${typeof pill === "string" ? pill : "peak"}-${index}`}
                    className="rounded-full border border-[#1e1e1e] bg-[#111] px-[14px] py-[6px] text-[12px] text-[#666]"
                  >
                    {pill}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 text-[12px] text-[#333]">
              {shareCompleteAction === "shared" ? "Shared ✓" : "Saved to your camera roll"}
            </div>

            <button
              type="button"
              onClick={handleDone}
              className="simple-auth-btn mt-7 h-[56px] w-full rounded-xl bg-[#f97316] px-4 text-[16px] font-bold text-white transition-colors hover:bg-[#ea6a10] active:scale-[0.98]"
            >
              <span className="flex items-center justify-center">
                Back to the bar
                <span className="btn-arrow" aria-hidden="true">
                  →
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={handleViewSession}
              className="mt-3 text-[13px] text-[#444] transition-colors hover:text-[#666] active:text-[#666]"
            >
              View session on feed →
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .end-screen {
          opacity: 0;
          transform: translateY(12px);
          transition: opacity 300ms ease, transform 300ms ease;
        }

        .end-screen.mounted {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>

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
