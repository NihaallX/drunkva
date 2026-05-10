"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TypewriterEffectSmooth } from "@/components/ui/typewriter-effect";
import { AnimatedText } from "@/components/ui/animated-underline-text-one";
import FlowArt, { FlowSection } from "@/components/ui/story-scroll";
import { DrunkvaLogo } from "@/components/drunkva/DrunkvaLogo";

// ─── Typewriter Lines ────────────────────────────────────────────────────────
const allLines = [
  [
    { text: "Who had the most?" },
    { text: "You already know.", className: "text-[#FC4C02]" },
  ],
  [
    { text: "No memory?" },
    { text: "We got receipts.", className: "text-[#FC4C02]" },
  ],
  [
    { text: "Your liver deserves" },
    { text: "a leaderboard.", className: "text-[#FC4C02]" },
  ],
  [
    { text: "Drink responsibly." },
    { text: "Track irresponsibly.", className: "text-[#FC4C02]" },
  ],
  [
    { text: "Cheers logged." },
    { text: "Dignity: optional.", className: "text-[#FC4C02]" },
  ],
  [
    { text: "The app" },
    { text: "your friends will blame.", className: "text-[#FC4C02]" },
  ],
];

function TypewriterCycler() {
  const [lineIndex, setLineIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setLineIndex((i) => (i + 1) % allLines.length);
        setVisible(true);
      }, 400);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative z-30 min-h-[52px] flex items-center">
      <AnimatePresence mode="wait">
        {visible && (
          <motion.div
            key={lineIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <TypewriterEffectSmooth
              words={allLines[lineIndex]}
              className="my-0"
              cursorClassName="bg-[#FC4C02]"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── 3D Phone Mockup ─────────────────────────────────────────────────────────
function PhoneMockup() {
  return (
    <div className="relative w-[240px] sm:w-[270px]" style={{ aspectRatio: "9/19" }}>
      {/* Outer frame */}
      <div
        className="absolute inset-0 rounded-[40px] border-[6px]"
        style={{
          background: "#0f0f0f",
          borderColor: "#2a2a2a",
          boxShadow:
            "0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05) inset, 0 8px 40px rgba(252,76,2,0.18)",
        }}
      >
        {/* Notch */}
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-5 rounded-full"
          style={{ background: "#1a1a1a" }}
        />

        {/* Screen content */}
        <div
          className="absolute inset-2 rounded-[34px] overflow-hidden"
          style={{ background: "#050505" }}
        >
          {/* Status bar */}
          <div className="flex justify-between items-center px-5 pt-8 pb-2">
            <span className="text-[10px] font-semibold" style={{ color: "#7A7A7A" }}>9:41</span>
            <span className="text-[10px]" style={{ color: "#7A7A7A" }}>●●●</span>
          </div>

          {/* App content */}
          <div className="px-4 pt-1">
            {/* Session header */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[9px] font-medium tracking-widest uppercase" style={{ color: "#7A7A7A" }}>
                  LIVE SESSION
                </p>
                <p className="text-[12px] font-bold mt-0.5 text-white">Friday Night 🍻</p>
              </div>
              <div
                className="text-[8px] font-bold px-2 py-1 rounded-full"
                style={{ background: "#FC4C02", color: "#fff" }}
              >
                LIVE
              </div>
            </div>

            {/* BAC card */}
            <div className="rounded-xl p-3 mb-3" style={{ background: "#1A1A1A" }}>
              <p className="text-[8px] uppercase tracking-widest mb-1" style={{ color: "#7A7A7A" }}>
                Confidence Level
              </p>
              <p className="text-3xl font-black leading-none" style={{ color: "#FC4C02" }}>
                0.08%
              </p>
              <div className="mt-2 h-1.5 rounded-full" style={{ background: "#2a2a2a" }}>
                <div className="h-full w-[62%] rounded-full" style={{ background: "#FC4C02" }} />
              </div>
            </div>

            {/* Drink log */}
            <div className="space-y-1.5">
              {[
                { emoji: "🍺", name: "Kingfisher", time: "9:12 PM" },
                { emoji: "🥃", name: "Old Monk", time: "9:48 PM" },
                { emoji: "🍻", name: "Bira White", time: "10:22 PM" },
              ].map((d) => (
                <div
                  key={d.name}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg"
                  style={{ background: "#1A1A1A" }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[15px]">{d.emoji}</span>
                    <span className="text-[10px] font-medium text-white">{d.name}</span>
                  </div>
                  <span className="text-[9px]" style={{ color: "#7A7A7A" }}>{d.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Divider ─────────────────────────────────────────────────────────────────
function Divider({ color = "rgba(255,255,255,0.12)" }: { color?: string }) {
  return (
    <hr
      style={{
        borderColor: color,
        borderTopWidth: 1,
        borderStyle: "solid",
        margin: "clamp(0.4rem,1.5vw,1rem) 0",
      }}
    />
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────
export default function StoryScroll() {
  return (
    <FlowArt aria-label="Drunkva story">

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 00 — HERO (full original design, inside FlowSection)
      ═══════════════════════════════════════════════════════════════════════ */}
      <FlowSection
        aria-label="Hero"
        style={{ backgroundColor: "#0a0a0a", color: "#fff" }}
      >
        {/* Grain texture overlay (inside FlowSection, absolute) */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
            backgroundSize: "180px 180px",
            zIndex: 1,
          }}
        />
        {/* Ambient glow top-left */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: "-120px",
            left: "-120px",
            width: "480px",
            height: "480px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(252,76,2,0.07) 0%, transparent 70%)",
            zIndex: 1,
          }}
        />

        {/* ── Top bar: wordmark + eyebrow ── */}
        <div className="relative flex items-center justify-between" style={{ zIndex: 2 }}>
          {/* Wordmark */}
          <div className="flex items-center gap-2.5">
            <DrunkvaLogo className="h-8" />
          </div>

          {/* Eyebrow badge */}
          <span
            className="hidden sm:inline-flex text-[10px] sm:text-xs font-bold tracking-[0.18em] uppercase px-3 py-1.5 rounded-full border"
            style={{
              color: "#FC4C02",
              borderColor: "rgba(252,76,2,0.3)",
              background: "rgba(252,76,2,0.08)",
            }}
          >
            Now in early access
          </span>
        </div>

        <Divider />

        {/* ── Two-column: Headline left / Phone right ── */}
        <div
          className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 flex-1"
          style={{ zIndex: 2 }}
        >
          {/* Left: headline */}
          <div className="flex flex-col gap-3 lg:max-w-[58%]">
            {/* Animated underline headline */}
            <AnimatedText
              text="Track your nights."
              textClassName="text-[clamp(2.8rem,6.5vw,6rem)] font-black tracking-tight leading-[0.95] text-white"
              underlineDuration={2}
              className="items-start"
            />
            {/* Second headline line */}
            <h1
              className="text-[clamp(2.8rem,6.5vw,6rem)] font-black tracking-tight leading-[0.95]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              <span style={{ color: "#FC4C02" }}>Own</span> your mornings.
            </h1>
          </div>

          {/* Right: 3D phone — desktop only, hidden on mobile */}
          <motion.div
            className="hidden lg:flex justify-end items-center flex-shrink-0"
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 3, ease: "easeInOut", repeat: Infinity }}
            style={{ willChange: "transform" }}
          >
            <PhoneMockup />
          </motion.div>
        </div>

        <Divider />

        {/* ── Bottom: Typewriter + CTA + phone on mobile ── */}
        <div className="relative flex flex-col gap-5" style={{ zIndex: 2 }}>
          {/* Typewriter */}
          <TypewriterCycler />

          {/* CTA row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Waitlist button */}
            <div className="relative group w-full sm:w-auto">
              {/* Pulse ring on hover */}
              <span
                className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{
                  boxShadow:
                    "0 0 0 8px rgba(252,76,2,0.14), 0 0 0 16px rgba(252,76,2,0.06)",
                  borderRadius: "0.75rem",
                }}
              />
              <button
                id="join-waitlist-hero"
                className="relative w-full sm:w-auto px-8 py-4 text-sm font-bold rounded-xl transition-all duration-200 active:scale-95"
                style={{
                  background: "#FC4C02",
                  color: "#fff",
                  boxShadow: "0 4px 24px rgba(252,76,2,0.32)",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background = "#C43D00")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background = "#FC4C02")
                }
                onClick={() =>
                  document
                    .getElementById("waitlist-section")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Join the Waitlist →
              </button>
            </div>

            {/* Social proof */}
            <p className="text-sm" style={{ color: "#7A7A7A" }}>
              2,400+ nights tracked · 18 countries · 0 regrets
            </p>
          </div>

          {/* Phone mockup — mobile only, shown below CTA */}
          <div className="flex lg:hidden justify-center pt-4">
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, ease: "easeInOut", repeat: Infinity }}
            >
              <PhoneMockup />
            </motion.div>
          </div>
        </div>
      </FlowSection>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 01 — START A SESSION
      ═══════════════════════════════════════════════════════════════════════ */}
      <FlowSection
        aria-label="Start a session"
        style={{ backgroundColor: "#FC4C02", color: "#fff" }}
      >
        <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em]">
          01 — Start a session
        </p>
        <Divider color="rgba(255,255,255,0.2)" />
        <div>
          <h2 className="text-[clamp(3.5rem,12vw,14rem)] font-black leading-[0.85] uppercase tracking-tight">
            Name
            <br />
            Your
            <br />
            Night.
          </h2>
        </div>
        <Divider color="rgba(255,255,255,0.2)" />
        <p className="max-w-[65ch] text-base sm:text-lg font-normal leading-relaxed text-[rgba(255,255,255,0.9)]">
          Open Drunkva, give your session a name, and gather your crew. One tap and the night begins.
        </p>
      </FlowSection>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 02 — LOG & WITNESS
      ═══════════════════════════════════════════════════════════════════════ */}
      <FlowSection
        aria-label="Log and witness"
        style={{ backgroundColor: "#0a0a0a", color: "#fff" }}
      >
        <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em]" style={{ color: "#FC4C02" }}>
          02 — Log &amp; witness
        </p>
        <Divider />
        <div>
          <h2 className="text-[clamp(3.5rem,12vw,14rem)] font-black leading-[0.85] uppercase tracking-tight">
            Log.
            <br />
            Expose.
            <br />
            Repeat.
          </h2>
        </div>
        <Divider />
        <p className="max-w-[65ch] text-base sm:text-lg font-normal leading-relaxed text-[rgba(255,255,255,0.9)]">
          Add drinks in real time. Friends can verify — or expose — every round. Your confidence curve builds live, drink by drink.
        </p>
        <Divider />
        <div className="flex flex-wrap gap-[3vw]">
          {[
            { label: "Real-time BAC", desc: "Your confidence tracked drink by drink. Uncomfortably accurate." },
            { label: "Friend witnesses", desc: "They log it for you when you forget. And you will." },
            { label: "Live leaderboard", desc: "Who's winning the night? Updates every round." },
          ].map((item) => (
            <div key={item.label} className="min-w-[140px] flex-1">
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: "#FC4C02" }}>
                {item.label}
              </p>
              <p className="text-sm sm:text-base leading-relaxed text-[rgba(255,255,255,0.7)]">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </FlowSection>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 03 — MORNING CARD
      ═══════════════════════════════════════════════════════════════════════ */}
      <FlowSection
        aria-label="Morning card"
        style={{ backgroundColor: "#141414", color: "#fff" }}
      >
        <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em]" style={{ color: "#FC4C02" }}>
          03 — The morning card
        </p>
        <Divider />
        <div>
          <h2 className="text-[clamp(3.5rem,12vw,14rem)] font-black leading-[0.85] uppercase tracking-tight">
            Wake
            <br />
            Up
            <br />
            Served.
          </h2>
        </div>
        <Divider />
        <p className="max-w-[50ch] text-[clamp(1rem,2.5vw,1.75rem)] font-normal leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
          See what actually happened. Every drink, timestamp, and witness vote — served as your morning card. Brag or cope.
        </p>
        <Divider />
        <div className="flex flex-wrap gap-[3vw]">
          {[
            { label: "Full timeline", desc: "Every drink with timestamps. The truth, unfiltered." },
            { label: "Session stats", desc: "Total drinks, pace, peak BAC estimate, and more." },
            { label: "Shareable card", desc: "Drop it in the group chat. Watch chaos unfold." },
          ].map((item) => (
            <div key={item.label} className="min-w-[140px] flex-1">
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: "#FC4C02" }}>
                {item.label}
              </p>
              <p className="text-[clamp(0.8rem,1.3vw,1rem)] leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </FlowSection>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 04 — SOCIAL PROOF TEASE
      ═══════════════════════════════════════════════════════════════════════ */}
      <FlowSection
        aria-label="Real nights"
        style={{ backgroundColor: "#FC4C02", color: "#fff" }}
      >
        <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em]">
          04 — Real nights
        </p>
        <Divider color="rgba(255,255,255,0.2)" />
        <div>
          <h2 className="text-[clamp(3.5rem,12vw,14rem)] font-black leading-[0.85] uppercase tracking-tight">
            Real
            <br />
            Regrets.
          </h2>
        </div>
        <Divider color="rgba(255,255,255,0.2)" />
        <div className="flex flex-wrap gap-[4vw]">
          {[
            { handle: "@prateek_s", quote: "Bro this app knew I had 9 drinks before I did. Scary." },
            { handle: "@nightowl.neha", quote: "My friends use this to roast me every Monday morning. 10/10." },
            { handle: "@the_real_arjun", quote: "Finally a reason to drink more. For the data." },
          ].map((t) => (
            <div key={t.handle} className="min-w-[180px] flex-1">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider opacity-60">{t.handle}</p>
              <p className="text-[clamp(0.9rem,1.5vw,1.15rem)] leading-relaxed italic opacity-90">"{t.quote}"</p>
            </div>
          ))}
        </div>
        <Divider color="rgba(255,255,255,0.2)" />
        <div className="flex flex-wrap gap-[4vw]">
          {[
            { value: "2,400+", label: "Nights tracked" },
            { value: "18", label: "Countries" },
            { value: "0", label: "Regrets" },
          ].map((s) => (
            <div key={s.label} className="min-w-[100px]">
              <p className="text-[clamp(2rem,5vw,4rem)] font-black tracking-tight leading-none">{s.value}</p>
              <p className="mt-1 text-xs opacity-60 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </FlowSection>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 05 — JOIN CTA
      ═══════════════════════════════════════════════════════════════════════ */}
      <FlowSection
        aria-label="Join Drunkva"
        style={{ backgroundColor: "#0a0a0a", color: "#fff" }}
      >
        <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em]" style={{ color: "#FC4C02" }}>
          05 — Be early
        </p>
        <Divider />
        <div>
          <h2 className="text-[clamp(3.5rem,12vw,14rem)] font-black leading-[0.85] uppercase tracking-tight">
            Get
            <br />
            In.
          </h2>
        </div>
        <Divider />
        <p className="max-w-[50ch] text-[clamp(1rem,2.5vw,1.75rem)] font-normal leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
          First wave of degens get early access, founding status, and the right to say "I was there before it was cool."
        </p>
        <Divider />
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <a
            href="#waitlist-section"
            id="join-waitlist-story"
            className="inline-flex items-center gap-3 px-10 py-5 text-sm font-black uppercase tracking-wider rounded-xl transition-all duration-200 active:scale-95"
            style={{
              background: "#FC4C02",
              color: "#fff",
              boxShadow: "0 4px 32px rgba(252,76,2,0.38)",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = "#C43D00")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = "#FC4C02")}
          >
            Join the Waitlist →
          </a>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
            No spam. Email only when we launch.
          </p>
        </div>
      </FlowSection>

    </FlowArt>
  );
}
