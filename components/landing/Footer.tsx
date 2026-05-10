"use client";

import { Twitter, Instagram } from "lucide-react";

export default function Footer() {
  return (
    <footer
      className="py-8 px-6 lg:px-16"
      style={{
        background: "#000000",
        borderTop: "1px solid #1a1a1a",
      }}
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="text-lg">🍺</span>
          <span
            className="text-base font-black tracking-tight"
            style={{ color: "#FC4C02", fontFamily: "var(--font-heading)" }}
          >
            Drunkva
          </span>
        </div>

        {/* Copyright */}
        <p className="text-sm order-last sm:order-none" style={{ color: "#4A4A4A" }}>
          © 2025 Drunkva. Drink responsibly.
        </p>

        {/* Social icons */}
        <div className="flex items-center gap-5">
          <a
            href="https://twitter.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Drunkva on Twitter / X"
            className="transition-colors duration-200"
            style={{ color: "#4A4A4A" }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLAnchorElement).style.color = "#FC4C02")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLAnchorElement).style.color = "#4A4A4A")
            }
          >
            <Twitter size={18} strokeWidth={1.5} />
          </a>
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Drunkva on Instagram"
            className="transition-colors duration-200"
            style={{ color: "#4A4A4A" }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLAnchorElement).style.color = "#FC4C02")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLAnchorElement).style.color = "#4A4A4A")
            }
          >
            <Instagram size={18} strokeWidth={1.5} />
          </a>
        </div>
      </div>
    </footer>
  );
}
