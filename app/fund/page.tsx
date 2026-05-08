"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { DrunkvaLogo } from "@/components/drunkva/DrunkvaLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const GOAL_AMOUNT = 3000;
const CURRENT_RAISED = 0;
const UPI_ID = "nihalpardeshi12344@oksbi";
const SUPPORTERS: string[] = [];

export default function FundPage() {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const handleCopyUPI = async () => {
    try {
      await navigator.clipboard.writeText(UPI_ID);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const progressPercent = (CURRENT_RAISED / GOAL_AMOUNT) * 100;

  return (
    <div className="bg-background min-h-screen flex flex-col">
      {/* Sticky Header with back button */}
      <div className="bg-background border-b border-border sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => router.back()}
            className="text-muted-foreground"
            aria-label="Go back"
          >
            ←
          </Button>
          <span className="text-sm font-medium text-foreground">Fund Drunkva</span>
          <div className="w-8" />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto pb-6">
        <div className="flex flex-col px-4 py-6 gap-6 max-w-[var(--container-w)] mx-auto">
          {/* Logo & Title Section */}
          <div className="flex flex-col items-center gap-4 text-center">
            <DrunkvaLogo className="h-12" />
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Fund Drunkva
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Built by one person, for the love of tracking chaotic nights.
                No VC. No ads. Just vibes.
              </p>
            </div>
          </div>

          {/* The Story Card */}
          <Card>
            <CardContent className="text-xs text-muted-foreground leading-relaxed">
              I built Drunkva to track nights out like Strava tracks runs. Now
              it's a real app with real friends using it. Help me keep it public
              and get a proper domain. Every contribution helps.
            </CardContent>
          </Card>

          {/* Funding Goal Section */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-foreground">
              Funding Goal
            </h3>
            <div className="flex flex-col gap-3">
              {/* Progress bar */}
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${Math.max(progressPercent, 2)}%` }}
                  aria-valuenow={CURRENT_RAISED}
                  aria-valuemin={0}
                  aria-valuemax={GOAL_AMOUNT}
                  role="progressbar"
                />
              </div>
              <p className="text-xs text-muted-foreground font-medium">
                ₹{CURRENT_RAISED.toLocaleString("en-IN")} raised of ₹
                {GOAL_AMOUNT.toLocaleString("en-IN")} goal
              </p>
              <p className="text-xs text-muted-foreground italic">
                Numbers updated manually. Trust the process.
              </p>
            </div>
          </div>

          {/* UPI QR Code Section */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-foreground">
              Scan to Pay via UPI
            </h3>

            {/* UPI QR Code Image */}
            <div className="rounded-lg overflow-hidden">
              <img
                src="/upi-qr.png"
                alt="UPI QR Code"
                className="w-full aspect-square object-cover rounded-lg"
              />
            </div>

            {/* Copyable UPI ID */}
            <div className="flex gap-2">
              <input
                type="text"
                value={UPI_ID}
                readOnly
                className="flex-1 bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground cursor-pointer"
                onClick={handleCopyUPI}
              />
              <Button
                onClick={handleCopyUPI}
                variant={copied ? "default" : "outline"}
                className="px-3 whitespace-nowrap"
              >
                {copied ? "✓ Copied" : "Copy"}
              </Button>
            </div>
          </div>

          {/* Supporters Wall Section */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-foreground">
              People Who Bought Us a Drink 🥃
            </h3>

            {SUPPORTERS.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                Be the first one. 🫡
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {SUPPORTERS.map((name) => (
                  <div
                    key={name}
                    className="bg-muted px-3 py-1.5 rounded-full text-xs text-foreground border border-border"
                  >
                    {name}
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Ping me on Instagram to get your name here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
