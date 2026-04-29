import { SignUp } from "@clerk/nextjs";
import { DrunkvaLogo } from "@/components/drunkva/DrunkvaLogo";

export default function SignUpPage() {
  return (
    // Fix #4: outer container uses Tailwind classes instead of inline style={{}}
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center px-5 gap-8">
      <div className="flex flex-col items-center gap-3">
        <DrunkvaLogo />
        <p className="text-[13px] text-muted-foreground text-center leading-relaxed max-w-[260px]">
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
