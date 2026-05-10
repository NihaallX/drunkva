"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Waitlist() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 800);
  };

  return (
    <section
      id="waitlist-section"
      className="py-28 px-6 lg:px-16"
      style={{ background: "#0d0d0d" }}
    >
      <div className="max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <p
            className="text-xs font-bold tracking-[0.18em] uppercase mb-5"
            style={{ color: "#FC4C02" }}
          >
            Early access
          </p>

          <h2
            className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-5"
            style={{ color: "#fff", fontFamily: "var(--font-heading)" }}
          >
            Be early.{" "}
            <span style={{ color: "#FC4C02" }}>Be legendary.</span>
          </h2>

          <p
            className="text-base sm:text-lg mb-12 max-w-xl mx-auto leading-relaxed"
            style={{ color: "#7A7A7A" }}
          >
            We're letting in the first wave of degens. Get in before your friends do.
          </p>

          <AnimatePresence mode="wait">
            {!submitted ? (
              <motion.form
                key="form"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.4 }}
                onSubmit={handleSubmit}
                className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto"
              >
                <input
                  id="waitlist-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="flex-1 px-5 py-4 rounded-xl text-sm font-medium outline-none transition-all duration-200"
                  style={{
                    background: "#141414",
                    color: "#fff",
                    border: "1px solid transparent",
                    caretColor: "#FC4C02",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.border = "1px solid rgba(252,76,2,0.5)";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(252,76,2,0.08)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.border = "1px solid transparent";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
                <button
                  id="join-waitlist-btn"
                  type="submit"
                  disabled={loading}
                  className="px-7 py-4 text-sm font-bold rounded-xl transition-all duration-200 disabled:opacity-70 active:scale-95 whitespace-nowrap"
                  style={{
                    background: "#FC4C02",
                    color: "#fff",
                    boxShadow: "0 4px 20px rgba(252,76,2,0.25)",
                  }}
                >
                  {loading ? "Joining..." : "Join Waitlist"}
                </button>
              </motion.form>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="max-w-lg mx-auto rounded-2xl px-8 py-8"
                style={{
                  background: "#141414",
                  border: "1px solid rgba(252,76,2,0.3)",
                  boxShadow: "0 0 40px rgba(252,76,2,0.07)",
                }}
              >
                <p className="text-3xl mb-3">🍻</p>
                <p className="text-xl font-bold mb-2" style={{ color: "#fff" }}>
                  You're in.
                </p>
                <p className="text-sm" style={{ color: "#7A7A7A" }}>
                  Try not to drink before we launch.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {!submitted && (
            <p className="text-xs mt-5" style={{ color: "#4A4A4A" }}>
              No spam. We only email you when Drunkva goes live.
            </p>
          )}
        </motion.div>
      </div>
    </section>
  );
}
