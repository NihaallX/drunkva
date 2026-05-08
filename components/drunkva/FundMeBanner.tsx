"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function FundMeBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const isDismissed = localStorage.getItem("drunkva-fund-banner-dismissed") === "true";
    setDismissed(isDismissed);
  }, []);

  if (!mounted || dismissed) return null;

  return (
    <div className="mx-4 mt-3 mb-2 bg-muted/50 border border-border/50 rounded-lg p-3 flex items-center justify-between gap-2">
      <div className="flex-1 flex flex-col gap-1">
        <p className="text-[11px] font-semibold text-primary">☕ Support Drunkva</p>
        <p className="text-[12px] text-muted-foreground">Help me get a domain.</p>
      </div>
      <div className="flex items-center gap-1.5">
        <Button
          onClick={() => router.push("/fund")}
          className="h-7 px-3 text-xs"
          variant="default"
        >
          Fund
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => {
            localStorage.setItem("drunkva-fund-banner-dismissed", "true");
            setDismissed(true);
          }}
          className="text-muted-foreground h-7 w-7"
          aria-label="Dismiss"
        >
          ✕
        </Button>
      </div>
    </div>
  );
}
