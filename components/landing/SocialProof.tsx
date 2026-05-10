"use client";

import { motion } from "framer-motion";

const testimonials = [
  {
    handle: "@prateek_s",
    avatar: "PS",
    quote: "Bro this app knew I had 9 drinks before I did. Scary.",
    nights: "23 nights tracked",
  },
  {
    handle: "@nightowl.neha",
    avatar: "NN",
    quote: "My friends use this to roast me every Monday morning. 10/10.",
    nights: "41 nights tracked",
  },
  {
    handle: "@the_real_arjun",
    avatar: "RA",
    quote: "Finally a reason to drink more. For the data.",
    nights: "67 nights tracked",
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 36 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

export default function SocialProof() {
  return (
    <section
      className="py-24 px-6 lg:px-16"
      style={{ background: "#000000" }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-14"
        >
          <p
            className="text-xs font-bold tracking-[0.18em] uppercase mb-4"
            style={{ color: "#FC4C02" }}
          >
            What they said
          </p>
          <h2
            className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight"
            style={{ fontFamily: "var(--font-heading)", color: "#fff" }}
          >
            Real nights.{" "}
            <span style={{ color: "#FC4C02" }}>Real regrets.</span>
            <br />
            Real app.
          </h2>
        </motion.div>

        {/* Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-5"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
        >
          {testimonials.map((t) => (
            <motion.div
              key={t.handle}
              variants={cardVariants}
              className="rounded-2xl p-7 flex flex-col gap-5"
              style={{
                background: "#141414",
                border: "1px solid #2D2D2D",
              }}
              whileHover={{
                y: -4,
                boxShadow: "0 0 0 1px rgba(252,76,2,0.3)",
              }}
            >
              <span
                className="text-5xl leading-none font-black select-none"
                style={{ color: "rgba(252,76,2,0.18)" }}
              >
                "
              </span>
              <p className="text-base sm:text-lg leading-relaxed italic -mt-6 max-w-[65ch]" style={{ color: "#fff" }}>
                {t.quote}
              </p>
              <div
                className="flex items-center gap-3 mt-auto pt-4 border-t"
                style={{ borderColor: "#2D2D2D" }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: "rgba(252,76,2,0.12)", color: "#FC4C02" }}
                >
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: "#FC4C02" }}>
                    {t.handle}
                  </p>
                  <p className="text-xs" style={{ color: "#7A7A7A" }}>
                    {t.nights}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
