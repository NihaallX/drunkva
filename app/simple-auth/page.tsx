"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DrunkvaLogo } from "@/components/drunkva/DrunkvaLogo";
import { getSimpleUser, setSimpleUser } from "@/lib/simple-auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SimpleAuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [realName, setRealName] = useState("");
  const [alias, setAlias] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const existing = getSimpleUser();
    if (existing) {
      router.replace("/");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = realName.trim();
    const normalizedAlias = alias.trim() || null;

    if (!EMAIL_RE.test(normalizedEmail)) {
      setError("Please enter a valid email.");
      return;
    }
    if (!normalizedName) {
      setError("Please enter your name.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/simple-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          real_name: normalizedName,
          alias: normalizedAlias,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Sign-in failed. Please try again.");
        return;
      }

      const user = data?.user;
      if (!user?.id || !user?.email || !user?.real_name) {
        setError("Invalid response from server.");
        return;
      }

      setSimpleUser({
        id: user.id,
        real_name: user.real_name,
        alias: user.alias ?? null,
        email: user.email,
      });
      router.replace("/");
    } catch {
      setError("Could not connect. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh w-full flex items-center justify-center bg-[#0a0a0a] px-4">
      <div className="w-full max-w-[390px]">
        <div className="flex justify-center mb-8">
          <DrunkvaLogo />
        </div>

        <div className="bg-[#111] border-[0.5px] border-[#1e1e1e] rounded-[20px] p-6">
          <h1 className="text-2xl font-semibold text-white mb-1.5">Who&apos;s drinking tonight?</h1>
          <p className="text-sm text-muted-foreground mb-5">
            No passwords. No nonsense. Just your name.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              autoComplete="email"
              className="w-full rounded-xl border border-[#262626] bg-[#141414] px-3.5 py-[14px] text-sm text-white outline-none focus:border-[#f97316]/60"
            />
            <input
              type="text"
              value={realName}
              onChange={(e) => setRealName(e.target.value)}
              placeholder="What do people call you?"
              autoComplete="name"
              className="w-full rounded-xl border border-[#262626] bg-[#141414] px-3.5 py-[14px] text-sm text-white outline-none focus:border-[#f97316]/60"
            />
            <input
              type="text"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="Alias (optional)"
              autoComplete="nickname"
              className="w-full rounded-xl border border-[#262626] bg-[#141414] px-3.5 py-[14px] text-sm text-white outline-none focus:border-[#f97316]/60"
            />

            {error && <p className="text-[13px] text-[#ef4444]">{error}</p>}

            <button
              id="simple-auth-submit"
              type="submit"
              disabled={submitting}
              className="simple-auth-btn mt-1 h-12 w-full rounded-xl bg-[#f97316] px-4 text-[15px] font-bold text-white transition-opacity hover:bg-[#ea6a10] disabled:opacity-60"
            >
              {submitting ? (
                "Signing in..."
              ) : (
                <>
                  Let&apos;s go
                  <span className="btn-arrow" aria-hidden="true">
                    →
                  </span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
