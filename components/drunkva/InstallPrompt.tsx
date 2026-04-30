"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

// Typed interface for the non-standard beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const VISIT_KEY = "dv-visit-count";

export function InstallPrompt() {
  // useRef — not useState — to hold the deferred prompt.
  // useState can lose the reference between renders because React may
  // batch state updates and recreate closures.
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);

  const pathname = usePathname();

  useEffect(() => {
    // Count visits — show on 2nd+ visit
    const count = parseInt(localStorage.getItem(VISIT_KEY) ?? "0", 10) + 1;
    localStorage.setItem(VISIT_KEY, String(count));

    const handler = (e: Event) => {
      // Prevent the browser's default mini-infobar from showing
      e.preventDefault();
      // Store the event for later — ref survives re-renders
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      
      const isAuthRoute = pathname?.startsWith("/sign-in") || pathname?.startsWith("/sign-up");
      if (count >= 2 && !isAuthRoute) {
        setOpen(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Lock body scroll while prompt is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleInstall = async () => {
    if (!deferredPromptRef.current) return;
    // Trigger the browser's native install dialog
    deferredPromptRef.current.prompt();
    const { outcome } = await deferredPromptRef.current.userChoice;
    // Clear the ref regardless of outcome — can't reuse a consumed event
    deferredPromptRef.current = null;
    setOpen(false);
    if (outcome === "accepted") {
      // App was installed — could track analytics here
    }
  };

  return (
    <Drawer open={open} onOpenChange={setOpen} direction="bottom">
      <DrawerContent
        className={cn(
          "bg-card border-border",
          "max-w-[var(--container-w)] mx-auto",
          // Pad below bottom nav so Install button is never hidden behind it
          "pb-[calc(64px+env(safe-area-inset-bottom))]",
          // Sit above bottom nav (--z-nav); bottom nav remains visible and interactive
          "z-[var(--z-modal)]"
        )}
      >
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-foreground">
            Add Drunkva to your home screen
          </DrawerTitle>
          <DrawerDescription className="text-muted-foreground">
            Get the full experience — offline drink logging, push notifications, and faster loading.
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex gap-3 px-4 pb-2">
          <Button
            id="install-prompt-accept"
            onClick={handleInstall}
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Install
          </Button>
          <Button
            id="install-prompt-dismiss"
            variant="outline"
            onClick={() => setOpen(false)}
            className="flex-1 border-border text-muted-foreground"
          >
            Not now
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
