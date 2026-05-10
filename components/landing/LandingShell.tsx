"use client";

import ReactLenis from "lenis/react";
import { useEffect, useRef } from "react";

/**
 * LandingShell — breaks out of the 430px app shell.
 * Targets computed styles to find and remove max-width + overflow-clip constraints
 * from all ancestor elements.
 */
export default function LandingShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const selfRef = useRef<HTMLDivElement>(null);

  // Hide native scrollbar — Lenis handles the scroll feel
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "landing-no-scrollbar";
    style.textContent = [
      "html::-webkit-scrollbar { display: none !important; }",
      "html { scrollbar-width: none !important; -ms-overflow-style: none !important; }",
    ].join(" ");
    document.head.appendChild(style);
    return () => { document.getElementById("landing-no-scrollbar")?.remove(); };
  }, []);

  useEffect(() => {
    if (!selfRef.current) return;

    type Override = {
      el: HTMLElement;
      props: Record<string, string>;
    };
    const overrides: Override[] = [];

    const save = (el: HTMLElement, props: Record<string, string>) => {
      const saved: Record<string, string> = {};
      Object.keys(props).forEach((k) => {
        saved[k] = (el.style as unknown as Record<string, string>)[k] ?? "";
        (el.style as unknown as Record<string, string>)[k] = props[k];
      });
      overrides.push({ el, props: saved });
    };

    let el: HTMLElement | null = selfRef.current.parentElement;
    while (el && el.tagName !== "BODY") {
      const computed = window.getComputedStyle(el);
      const maxW = parseInt(computed.maxWidth);

      // Strip narrow max-width (the 430px shell)
      if (!isNaN(maxW) && maxW < 800) {
        save(el, { maxWidth: "100%" });
      }

      // Strip overflow clip/hidden that would cut off the full-width content
      if (
        computed.overflow === "clip" ||
        computed.overflowX === "clip" ||
        computed.overflowX === "hidden"
      ) {
        save(el, { overflowX: "visible", overflow: "visible" });
      }

      // Fix flex centering that squishes width
      if (computed.display === "flex" && computed.alignItems === "center") {
        save(el, { alignItems: "stretch" });
      }

      el = el.parentElement;
    }

    return () => {
      overrides.forEach(({ el, props }) => {
        Object.entries(props).forEach(([k, v]) => {
          (el.style as unknown as Record<string, string>)[k] = v;
        });
      });
    };
  }, []);

  return (
    <ReactLenis root options={{ lerp: 0.08, duration: 1.2 }}>
      <div
        ref={selfRef}
        style={{ background: "#000000", minHeight: "100dvh", width: "100%" }}
      >
        {children}
      </div>
    </ReactLenis>
  );
}
