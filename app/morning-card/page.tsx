"use client";

import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { MorningCardInner } from "@/components/drunkva/MorningCardInner";
import { ErrorBoundary } from "@/components/drunkva/ErrorBoundary";

export default function MorningCardPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={
        <div className="min-h-dvh bg-background flex items-center justify-center">
          <Skeleton className="h-5 w-24" />
        </div>
      }>
        <MorningCardInner />
      </Suspense>
    </ErrorBoundary>
  );
}
