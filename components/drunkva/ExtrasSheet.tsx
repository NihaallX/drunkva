"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface ExtrasSheetProps {
  open: boolean;
  onClose: () => void;
  burpCount: number;
  washroomCount: number;
  chaknaLevel: "none" | "light" | "heavy";
  onUpdate: (data: {
    burpCount?: number;
    washroomCount?: number;
    chaknaLevel?: "none" | "light" | "heavy";
  }) => void;
}

interface CounterRowProps {
  label: string;
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  decrementId: string;
  incrementId: string;
}

function CounterRow({ label, value, onDecrement, onIncrement, decrementId, incrementId }: CounterRowProps) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="dv-stat-label">{label}</div>
      <div className="flex items-center gap-4">
        <Button
          id={decrementId}
          variant="outline"
          size="icon"
          className="size-9 rounded-full border-border bg-card text-foreground text-lg"
          onClick={onDecrement}
          aria-label={`Decrease ${label}`}
        >
          −
        </Button>
        <span className="text-2xl font-medium text-foreground min-w-8 text-center">
          {value}
        </span>
        <Button
          id={incrementId}
          size="icon"
          className="size-9 rounded-full bg-primary text-primary-foreground text-lg"
          onClick={onIncrement}
          aria-label={`Increase ${label}`}
        >
          +
        </Button>
      </div>
    </div>
  );
}

const CHAKNA_OPTIONS: { value: "none" | "light" | "heavy"; label: string; emoji: string }[] = [
  { value: "none", label: "None", emoji: "🚫" },
  { value: "light", label: "Light", emoji: "🍟" },
  { value: "heavy", label: "Heavy", emoji: "🍗" },
];

export function ExtrasSheet({
  open,
  onClose,
  burpCount,
  washroomCount,
  chaknaLevel,
  onUpdate,
}: ExtrasSheetProps) {
  // Lock body scroll when drawer is open to prevent layout shift
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <Drawer
      open={open}
      onOpenChange={(o) => !o && onClose()}
      direction="bottom"
      modal={false}
    >
      <DrawerContent
        className={cn(
          "bg-card border-border",
          // Constrain to app width, centered
          "max-w-[var(--container-w)] mx-auto",
          // Clear the bottom nav (64px) + safe area — content is never hidden behind nav
          "pb-[calc(64px+env(safe-area-inset-bottom))]",
          // Ensure drawer sits above bottom nav (--z-nav) and overlays (--z-overlay)
          "z-[var(--z-modal)]"
        )}
      >
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-foreground text-[15px] font-medium">
            Extras
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            Track burps, washroom trips, and chakna for the current session.
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-col gap-5 px-5 pb-2">
          <CounterRow
            label="Burps"
            value={burpCount}
            decrementId="burp-minus"
            incrementId="burp-plus"
            onDecrement={() => onUpdate({ burpCount: Math.max(0, burpCount - 1) })}
            onIncrement={() => onUpdate({ burpCount: burpCount + 1 })}
          />

          <CounterRow
            label="Washroom Trips"
            value={washroomCount}
            decrementId="wash-minus"
            incrementId="wash-plus"
            onDecrement={() => onUpdate({ washroomCount: Math.max(0, washroomCount - 1) })}
            onIncrement={() => onUpdate({ washroomCount: washroomCount + 1 })}
          />

          {/* Chakna — uses ToggleGroup from shadcn */}
          <div className="flex flex-col gap-2.5">
            <div className="dv-stat-label">Chakna</div>
            <ToggleGroup
              type="single"
              value={chaknaLevel}
              onValueChange={(v) => v && onUpdate({ chaknaLevel: v as "none" | "light" | "heavy" })}
              className="w-full justify-start gap-2"
            >
              {CHAKNA_OPTIONS.map((opt) => (
                <ToggleGroupItem
                  key={opt.value}
                  id={`chakna-${opt.value}`}
                  value={opt.value}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1 h-auto py-2.5 rounded-[var(--radius-md)]",
                    "border-border bg-card text-muted-foreground text-xs",
                    "data-[state=on]:border-primary data-[state=on]:bg-accent data-[state=on]:text-primary"
                  )}
                  aria-label={opt.label}
                >
                  <span className="text-[18px]">{opt.emoji}</span>
                  {opt.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
