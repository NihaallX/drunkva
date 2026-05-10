"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TypewriterEffectSmooth } from "@/components/ui/typewriter-effect";
import { AnimatedText } from "@/components/ui/animated-underline-text-one";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const allLines = [
  [
    { text: "Who had the most?" },
    { text: "You already know.", className: "text-[var(--brand)]" },
  ],
  [
    { text: "No memory?" },
    { text: "We got receipts.", className: "text-[var(--brand)]" },
  ],
  [
    { text: "Your liver deserves" },
    { text: "a leaderboard.", className: "text-[var(--brand)]" },
  ],
  [
    { text: "Drink responsibly." },
    { text: "Track irresponsibly.", className: "text-[var(--brand)]" },
  ],
  [
    { text: "Finally, a social network" },
    { text: "your hangover approves.", className: "text-[var(--brand)]" },
  ],
  [
    { text: "Cheers logged." },
    { text: "Dignity: optional.", className: "text-[var(--brand)]" },
  ],
  [
    { text: "Your BAC in real time." },
    { text: "Your dignity — not our problem.", className: "text-[var(--brand)]" },
  ],
  [
    { text: "The app" },
    { text: "your friends will blame.", className: "text-[var(--brand)]" },
  ],
];

export default function Hero() {
  const [lineIndex, setLineIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const heroRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);

  // Typewriter cycling
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

  // GSAP parallax on phone mockup
  useEffect(() => {
    if (!phoneRef.current || !heroRef.current) return;

    const ctx = gsap.context(() => {
      gsap.to(phoneRef.current, {
        y: -60,
        ease: "none",
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen flex items-center overflow-hidden"
      style={{ background: "var(--bg-base)" }}
    >
      {/* Grain texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-[1] opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "200px 200px",
        }}
      />

      {/* Ambient glow */}
      <div
        className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(circle, rgba(252,76,2,0.06) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-[10] w-full max-w-7xl mx-auto px-6 lg:px-16 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* ── Left — Copy — always on top of phone ── */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col items-start relative z-[20]"
          >
            {/* Eyebrow pill */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mb-6"
            >
              <span
                className="text-xs font-semibold tracking-[0.18em] uppercase px-3 py-1.5 rounded-full border"
                style={{
                  color: "var(--brand)",
                  borderColor: "rgba(252,76,2,0.3)",
                  background: "rgba(252,76,2,0.08)",
                }}
              >
                🍺 Now in early access
              </span>
            </motion.div>

            {/* Main headline with animated underline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="mb-2"
            >
              <AnimatedText
                text="Track your nights."
                textClassName="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] text-white"
                underlineDuration={1.8}
                className="items-start"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="mb-6"
            >
              <h1
                className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight"
                style={{
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-heading)",
                }}
              >
                <span style={{ color: "var(--brand)" }}>Own</span> your mornings.
              </h1>
            </motion.div>

            {/* Typewriter — fixed z-index so it stays above phone */}
            <div className="relative z-[30] min-h-[64px] flex items-center">
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
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.55 }}
              className="mt-6 flex flex-col items-start gap-4"
            >
              <div className="relative group">
                {/* Pulse ring on hover */}
                <span
                  className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{
                    boxShadow:
                      "0 0 0 8px rgba(252,76,2,0.15), 0 0 0 14px rgba(252,76,2,0.06)",
                    borderRadius: "0.75rem",
                  }}
                />
                <button
                  id="join-waitlist-hero"
                  className="relative px-8 py-4 text-base font-bold rounded-xl transition-all duration-200 active:scale-95"
                  style={{
                    background: "var(--brand)",
                    color: "#fff",
                    boxShadow: "0 4px 24px rgba(252,76,2,0.3)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "var(--brand-dim)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "var(--brand)";
                  }}
                  onClick={() => {
                    document
                      .getElementById("waitlist-section")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  Join the Waitlist →
                </button>
              </div>

              {/* Social proof */}
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                2,400+ nights tracked · 18 countries · 0 regrets
              </p>
            </motion.div>
          </motion.div>

          {/* ── Right — Phone Mockup ── lower z-index */}
          <div className="flex justify-center lg:justify-end relative z-[10]">
            <motion.div
              ref={phoneRef}
              animate={{ y: [0, -12, 0] }}
              transition={{
                duration: 3,
                ease: "easeInOut",
                repeat: Infinity,
              }}
              style={{ willChange: "transform" }}
            >
              <PhoneMockup />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PhoneMockup() {
  return (
    <div
      className="relative w-[260px] sm:w-[300px]"
      style={{ aspectRatio: "9/19" }}
    >
      {/* Phone frame */}
      <div
        className="absolute inset-0 rounded-[40px] border-[6px]"
        style={{
          background: "#0f0f0f",
          borderColor: "#2a2a2a",
          boxShadow:
            "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04) inset, 0 8px 32px rgba(252,76,2,0.12)",
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
          style={{ background: "#0a0a0a" }}
        >
          {/* Status bar */}
          <div className="flex justify-between items-center px-5 pt-8 pb-3">
            <span
              className="text-[10px] font-semibold"
              style={{ color: "var(--text-secondary)" }}
            >
              9:41
            </span>
            <div className="flex gap-1 items-center">
              <span
                className="text-[10px]"
                style={{ color: "var(--text-secondary)" }}
              >
                ●●●
              </span>
            </div>
          </div>

          {/* Session header */}
          <div className="px-4 pt-1">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p
                  className="text-[10px] font-medium tracking-widest uppercase"
                  style={{ color: "var(--text-secondary)" }}
                >
                  LIVE SESSION
                </p>
                <p
                  className="text-sm font-bold mt-0.5"
                  style={{ color: "var(--text-primary)" }}
                >
                  Friday Night 🍻
                </p>
              </div>
              <div
                className="text-[9px] font-bold px-2 py-1 rounded-full"
                style={{ background: "var(--brand)", color: "#fff" }}
              >
                LIVE
              </div>
            </div>

            {/* BAC meter */}
            <div
              className="rounded-xl p-3 mb-3"
              style={{ background: "var(--bg-card)" }}
            >
              <p
                className="text-[9px] uppercase tracking-widest mb-1"
                style={{ color: "var(--text-secondary)" }}
              >
                Confidence Level
              </p>
              <p
                className="text-3xl font-black leading-none"
                style={{ color: "var(--brand)" }}
              >
                0.08%
              </p>
              <div
                className="mt-2 h-1.5 rounded-full"
                style={{ background: "#2a2a2a" }}
              >
                <div
                  className="h-full w-[62%] rounded-full"
                  style={{ background: "var(--brand)" }}
                />
              </div>
            </div>

            {/* Drinks list */}
            <div className="space-y-1.5">
              {[
                { emoji: "🍺", name: "Kingfisher", time: "9:12 PM" },
                { emoji: "🥃", name: "Old Monk", time: "9:48 PM" },
                { emoji: "🍻", name: "Bira White", time: "10:22 PM" },
              ].map((d) => (
                <div
                  key={d.name}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg"
                  style={{ background: "var(--bg-card)" }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{d.emoji}</span>
                    <span
                      className="text-[10px] font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {d.name}
                    </span>
                  </div>
                  <span
                    className="text-[9px]"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {d.time}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
