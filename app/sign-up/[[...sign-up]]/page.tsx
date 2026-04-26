import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#111111",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 20px",
        gap: 32,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <svg width="48" height="48" viewBox="0 0 22 22" fill="none">
          <polygon points="11,14 2,18 11,6" fill="#C44D0E" opacity="0.85" />
          <polygon points="11,2 20,18 11,14 2,18" fill="#E8621A" />
          <polygon points="11,8 16,16 11,14 6,16" fill="#C44D0E" opacity="0.5" />
        </svg>
        <span
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: "#E8621A",
            letterSpacing: "0.04em",
            fontFamily: "Inter, sans-serif",
          }}
        >
          DRUNKVA
        </span>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", textAlign: "center", lineHeight: 1.5, maxWidth: 260 }}>
          Every night has a story. Start tracking yours.
        </p>
      </div>

      <SignUp
        appearance={{
          variables: {
            colorPrimary: "#E8621A",
            colorBackground: "#1A1A1A",
            colorText: "rgba(255,255,255,0.92)",
            colorTextSecondary: "rgba(255,255,255,0.45)",
            colorInputBackground: "#222222",
            colorInputText: "rgba(255,255,255,0.92)",
            borderRadius: "10px",
            fontFamily: "Inter, sans-serif",
          },
          elements: {
            card: { boxShadow: "none", border: "0.5px solid rgba(255,255,255,0.08)" },
            headerTitle: { color: "rgba(255,255,255,0.92)" },
            headerSubtitle: { color: "rgba(255,255,255,0.45)" },
            socialButtonsBlockButton: {
              border: "0.5px solid rgba(255,255,255,0.12)",
              background: "#222222",
              color: "rgba(255,255,255,0.85)",
            },
            dividerLine: { background: "rgba(255,255,255,0.08)" },
            dividerText: { color: "rgba(255,255,255,0.3)" },
            formFieldLabel: { color: "rgba(255,255,255,0.6)" },
            formFieldInput: { background: "#222222", borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.92)" },
            footerActionLink: { color: "#E8621A" },
          },
        }}
      />
    </div>
  );
}
