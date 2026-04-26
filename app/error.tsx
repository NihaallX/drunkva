"use client";

import { DrunkvaLogo } from "@/components/drunkva/DrunkvaLogo";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center px-6 gap-5 text-center">
      <DrunkvaLogo />
      <div className="text-3xl">😵</div>
      <div>
        <h1 className="text-lg font-semibold text-foreground mb-1">Something went wrong</h1>
        <p className="text-[13px] text-muted-foreground">
          An unexpected error occurred. Don't worry — your data is safe.
        </p>
      </div>
      <Button
        id="error-retry-btn"
        onClick={reset}
        className="bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8"
      >
        Try again
      </Button>
    </div>
  );
}
