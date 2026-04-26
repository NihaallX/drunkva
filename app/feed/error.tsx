"use client";

import { DrunkvaLogo } from "@/components/drunkva/DrunkvaLogo";
import { Button } from "@/components/ui/button";

export default function FeedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center px-6 gap-5 text-center">
      <DrunkvaLogo />
      <div className="text-3xl">📡</div>
      <div>
        <h1 className="text-lg font-semibold text-foreground mb-1">Feed couldn't load</h1>
        <p className="text-[13px] text-muted-foreground">
          Check your connection and try again.
        </p>
      </div>
      <Button
        id="feed-error-retry"
        onClick={reset}
        className="bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8"
      >
        Try again
      </Button>
    </div>
  );
}
