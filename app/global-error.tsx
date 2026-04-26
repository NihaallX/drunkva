"use client";

// Fix #4: global-error renders outside the normal layout tree so Tailwind
// classes won't resolve to CSS variables — we keep minimal inline styles
// only where absolutely necessary (background on <body> since no globals.css).
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          background: "#111111",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100dvh",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ textAlign: "center", padding: "24px", maxWidth: "360px" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>💥</div>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
            Something went sideways
          </h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, marginBottom: 24 }}>
            The app hit an unexpected error. Your session data is safe.
          </p>
          {/* Button uses inline style because globals.css is not available in global-error */}
          <button
            onClick={reset}
            style={{
              background: "var(--primary, #E8621A)",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "12px 24px",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
