"use client";

import { motion } from "framer-motion";

const steps = [
  {
    emoji: "🍺",
    title: "Start a session",
    desc: "Open Drunkva, name your night, and start logging.",
    step: "01",
  },
  {
    emoji: "👀",
    title: "Log & witness",
    desc: "Add drinks in real time. Friends can verify (or expose) you.",
    step: "02",
  },
  {
    emoji: "🌅",
    title: "Wake up to your morning card",
    desc: "See what actually happened. Brag or cope.",
    step: "03",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut" as const,
    },
  },
};

export default function HowItWorks() {
  return (
    <section
      className="py-28 px-6 lg:px-16"
      style={{ background: "#0d0d0d" }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Section title */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-16 text-left lg:text-center"
        >
          <p
            className="text-xs font-semibold tracking-[0.18em] uppercase mb-4"
            style={{ color: "var(--brand)" }}
          >
            How it works
          </p>
          <h2
            className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
          >
            Simple enough to use
            <br />
            <span style={{ color: "var(--brand)" }}>after 4 drinks</span>
          </h2>
        </motion.div>

        {/* Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
        >
          {steps.map((step) => (
            <motion.div
              key={step.step}
              variants={cardVariants}
              className="group relative rounded-2xl p-8 cursor-default transition-all duration-300"
              style={{
                background: "#141414",
                border: "1px solid var(--border-default)",
                willChange: "transform",
              }}
              whileHover={{
                y: -4,
                boxShadow: "0 0 0 1px rgba(252,76,2,0.35), 0 8px 32px rgba(0,0,0,0.5)",
              }}
            >
              {/* Step number — top right faint */}
              <span
                className="absolute top-6 right-6 text-5xl font-black select-none"
                style={{ color: "rgba(252,76,2,0.08)", fontFamily: "var(--font-heading)" }}
              >
                {step.step}
              </span>

              {/* Emoji */}
              <div
                className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-6 text-2xl"
                style={{ background: "rgba(252,76,2,0.1)" }}
              >
                {step.emoji}
              </div>

              {/* Text */}
              <h3
                className="text-xl font-bold mb-3"
                style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
              >
                {step.title}
              </h3>
              <p className="text-base sm:text-lg leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {step.desc}
              </p>

              {/* Bottom brand accent line */}
              <div
                className="absolute bottom-0 left-8 right-8 h-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: "var(--brand)" }}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
