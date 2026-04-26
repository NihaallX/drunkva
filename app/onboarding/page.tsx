"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { DrunkvaLogo } from "@/components/drunkva/DrunkvaLogo";
import { Button } from "@/components/ui/button";

const TOS = `Drunkva is a personal tracking and entertainment tool. We do not promote or encourage alcohol consumption. Users are solely responsible for their own choices. By signing up you confirm you are of legal drinking age in your jurisdiction.`;

// ─── Checkbox ────────────────────────────────────────────────────────────────
function AgreementCheckbox({ agreed, onToggle }: { agreed: boolean; onToggle: () => void }) {
  return (
    <button
      id="tos-agree"
      type="button"
      onClick={onToggle}
      className="flex items-start gap-3 text-left bg-transparent border-0 p-0 cursor-pointer"
      aria-pressed={agreed}
    >
      <div
        className={cn(
          "mt-0.5 size-5 shrink-0 rounded-[4px] flex items-center justify-center transition-all duration-150",
          agreed ? "bg-primary" : "border border-border bg-transparent"
        )}
      >
        {agreed && <span className="text-primary-foreground text-xs font-bold">✓</span>}
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{TOS}</p>
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter();
  const [realName, setRealName] = useState("");
  const [alias, setAlias] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!realName.trim()) { setError("Name is required"); return; }
    if (!agreed) { setError("Please accept the terms"); return; }
    setSaving(true);
    setError("");
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ real_name: realName.trim(), alias: alias.trim() || null }),
    });
    if (res.ok) {
      router.push("/session");
    } else {
      setError("Something went wrong. Try again.");
    }
    setSaving(false);
  };

  return (
    <div className="min-h-dvh bg-background flex flex-col px-5">
      {/* Logo */}
      <div className="flex justify-center py-10">
        <DrunkvaLogo size={32} />
      </div>

      <div className="flex-1 flex flex-col gap-5 max-w-sm mx-auto w-full">
        <div>
          <h1 className="text-[22px] font-semibold text-foreground mb-1.5">Set up your profile</h1>
          <p className="text-sm text-muted-foreground">You only do this once.</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="real-name" className="dv-stat-label">Your name *</label>
          <input
            id="real-name"
            className="dv-input"
            placeholder="Nihal Kapoor"
            value={realName}
            onChange={(e) => setRealName(e.target.value)}
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="alias" className="dv-stat-label">
            Alias <span className="text-muted-foreground/60 font-normal normal-case">(optional)</span>
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[15px]">@</span>
            <input
              id="alias"
              className={cn("dv-input", "pl-7")}
              placeholder="nk_official"
              value={alias}
              onChange={(e) => setAlias(e.target.value.replace(/\s/g, "").toLowerCase())}
            />
          </div>
        </div>

        <AgreementCheckbox agreed={agreed} onToggle={() => setAgreed(!agreed)} />

        {error && <p className="text-[13px] text-destructive">{error}</p>}

        <Button
          id="onboarding-submit"
          onClick={handleSubmit}
          disabled={saving}
          className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-[15px] font-medium"
        >
          {saving ? "Saving…" : "Let's go 🍺"}
        </Button>
      </div>
    </div>
  );
}
