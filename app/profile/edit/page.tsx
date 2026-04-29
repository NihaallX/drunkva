"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { DrunkvaLogo } from "@/components/drunkva/DrunkvaLogo";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function EditProfilePage() {
  const router = useRouter();
  const [realName, setRealName] = useState("");
  const [alias, setAlias] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data?.user) {
          if (data.user.real_name) setRealName(data.user.real_name);
          if (data.user.alias) setAlias(data.user.alias);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!realName.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ real_name: realName.trim(), alias: alias.trim() || null }),
    });
    if (res.ok) {
      router.push("/profile");
    } else {
      setError("Something went wrong. Try again.");
    }
    setSaving(false);
  };

  return (
    <div className="min-h-dvh bg-background flex flex-col px-5 relative">
      <button
        onClick={() => router.back()}
        className="absolute left-5 top-8 text-muted-foreground hover:text-foreground transition-colors p-2 bg-transparent border-0 cursor-pointer"
        aria-label="Go back"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      {/* Logo */}
      <div className="flex justify-center py-10">
        <DrunkvaLogo />
      </div>

      <div className="flex-1 flex flex-col gap-5 max-w-sm mx-auto w-full">
        <div>
          <h1 className="text-[22px] font-semibold text-foreground mb-1.5">Edit profile</h1>
          <p className="text-sm text-muted-foreground">Update your details.</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="edit-real-name" className="dv-stat-label">Your name *</label>
          <input
            id="edit-real-name"
            className="dv-input"
            placeholder="John Doe"
            value={realName}
            onChange={(e) => setRealName(e.target.value)}
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="edit-alias" className="dv-stat-label">
            Alias <span className="text-muted-foreground/60 font-normal normal-case">(optional)</span>
          </label>
          <div className="relative">
            <span
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[15px] pointer-events-none select-none"
              aria-hidden="true"
            >
              @
            </span>
            <input
              id="edit-alias"
              className={cn("dv-input", "dv-input-prefix")}
              placeholder="johnsigma"
              value={alias}
              onChange={(e) => setAlias(e.target.value.replace(/\s/g, "").toLowerCase())}
            />
          </div>
        </div>

        {error && <p className="text-[13px] text-destructive">{error}</p>}

        <Button
          id="edit-profile-submit"
          onClick={handleSubmit}
          disabled={saving}
          className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-[15px] font-medium"
        >
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
