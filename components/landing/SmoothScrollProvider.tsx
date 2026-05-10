"use client";

import ReactLenis from "lenis/react";

export default function SmoothScrollProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ReactLenis root options={{ lerp: 0.08, duration: 1.2 }}>
      {children}
    </ReactLenis>
  );
}
