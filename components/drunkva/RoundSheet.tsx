"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { logError } from "@/lib/logger";

interface GroupMember {
  id: string;
  real_name: string;
  alias: string | null;
  avatar_url: string | null;
}

interface RoundSheetProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: RoundPayload) => void;
  groupMembers?: GroupMember[];
  sessionId: string;
  isLoading?: boolean;
}

export interface RoundPayload {
  round_id: string;
  session_ids: string[];
  drinks: Array<{
    type: "beer" | "shot" | "wine" | "cocktail" | "spirit";
    manual_duration_seconds?: number;
  }>;
}

const DRINK_TYPES = [
  { type: "beer" as const, emoji: "🍺", label: "Beer" },
  { type: "shot" as const, emoji: "🥃", label: "Shot" },
  { type: "wine" as const, emoji: "🍷", label: "Wine" },
  { type: "cocktail" as const, emoji: "🍹", label: "Cocktail" },
  { type: "spirit" as const, emoji: "🥃", label: "Spirit" },
] as const;

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export function RoundSheet({
  open,
  onClose,
  onSubmit,
  groupMembers,
  sessionId,
  isLoading,
}: RoundSheetProps) {
  const hasGroupMembers = groupMembers && groupMembers.length > 0;
  const [step, setStep] = useState<"mode" | "drinks" | "members">(hasGroupMembers ? "mode" : "drinks");
  const [isGroupRound, setIsGroupRound] = useState(false);
  const [drinkCounts, setDrinkCounts] = useState<Record<string, number>>({
    beer: 1,
    shot: 0,
    wine: 0,
    cocktail: 0,
    spirit: 0,
  });
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [localIsLoading, setLocalIsLoading] = useState(false);

  // Lock body scroll when open
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

  // Reset state when closing
  useEffect(() => {
    if (!open) {
      setStep(hasGroupMembers ? "mode" : "drinks");
      setIsGroupRound(false);
      setDrinkCounts({ beer: 1, shot: 0, wine: 0, cocktail: 0, spirit: 0 });
      setSelectedMembers(new Set());
      setLocalIsLoading(false);
    }
  }, [open, hasGroupMembers]);

  const generateRoundId = () => {
    return crypto.randomUUID();
  };

  const handleDrinkSubmit = useCallback(async () => {
    try {
      setLocalIsLoading(true);

      // Build drinks array
      const drinks = DRINK_TYPES.reduce(
        (acc, dt) => {
          const count = drinkCounts[dt.type] || 0;
          for (let i = 0; i < count; i++) {
            acc.push({ type: dt.type });
          }
          return acc;
        },
        [] as Array<{ type: "beer" | "shot" | "wine" | "cocktail" | "spirit" }>
      );

      if (drinks.length === 0) {
        logError({
          context: "RoundSheet (solo)",
          message: "No drinks selected",
          data: { drinkCounts },
        });
        return;
      }

      const payload: RoundPayload = {
        round_id: generateRoundId(),
        session_ids: [sessionId],
        drinks,
      };

      onSubmit(payload);
      onClose();
    } catch (err) {
      logError({
        context: "RoundSheet.handleDrinkSubmit",
        message: "Failed to submit solo round",
        data: err,
      });
    } finally {
      setLocalIsLoading(false);
    }
  }, [drinkCounts, sessionId, onSubmit, onClose]);

  const handleGroupSubmit = useCallback(async () => {
    try {
      setLocalIsLoading(true);

      // Build drinks array (same as solo)
      const drinks = DRINK_TYPES.reduce(
        (acc, dt) => {
          const count = drinkCounts[dt.type] || 0;
          for (let i = 0; i < count; i++) {
            acc.push({ type: dt.type });
          }
          return acc;
        },
        [] as Array<{ type: "beer" | "shot" | "wine" | "cocktail" | "spirit" }>
      );

      if (drinks.length === 0) {
        logError({
          context: "RoundSheet (group)",
          message: "No drinks selected",
          data: { drinkCounts },
        });
        return;
      }

      if (selectedMembers.size === 0) {
        logError({
          context: "RoundSheet (group)",
          message: "No members selected",
          data: {},
        });
        return;
      }

      const payload: RoundPayload = {
        round_id: generateRoundId(),
        session_ids: Array.from(selectedMembers), // TODO: map member IDs to session IDs when available
        drinks,
      };

      onSubmit(payload);
      onClose();
    } catch (err) {
      logError({
        context: "RoundSheet.handleGroupSubmit",
        message: "Failed to submit group round",
        data: err,
      });
    } finally {
      setLocalIsLoading(false);
    }
  }, [drinkCounts, selectedMembers, onSubmit, onClose]);

  const toggleMember = useCallback((id: string) => {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/70"
        onClick={onClose}
      />

      {/* Sheet */}
      <Drawer
        open={open}
        onOpenChange={(o) => !o && onClose()}
        direction="bottom"
        modal={false}
      >
        <DrawerContent
          className={cn(
            "bg-card border-border",
            "max-w-[var(--container-w)] mx-auto",
            "pb-[calc(64px+env(safe-area-inset-bottom))]",
            "z-[var(--z-modal)]"
          )}
        >
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-foreground text-[15px] font-medium">
              {step === "mode" && "Round or Solo?"}
              {step === "drinks" && `What's everyone drinking?`}
              {step === "members" && "Who's joining?"}
            </DrawerTitle>
            <DrawerDescription className="sr-only">
              {step === "mode" && "Choose between a solo round or group round"}
              {step === "drinks" && "Select drinks for this round"}
              {step === "members" && "Select members to tag in this round"}
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex flex-col gap-4 px-5 pb-6">
            {/* Mode selection step */}
            {step === "mode" && (
              <div className="flex flex-col gap-2">
                <Button
                  id="round-solo-btn"
                  variant="outline"
                  className="justify-start"
                  onClick={() => {
                    setIsGroupRound(false);
                    setStep("drinks");
                  }}
                  disabled={localIsLoading || isLoading}
                >
                  <span className="text-lg mr-3">👤</span>
                  Solo round (just me)
                </Button>
                <Button
                  id="round-group-btn"
                  variant="outline"
                  className="justify-start"
                  onClick={() => {
                    setIsGroupRound(true);
                    setStep("members");
                  }}
                  disabled={localIsLoading || isLoading}
                >
                  <span className="text-lg mr-3">👥</span>
                  Group round ({groupMembers?.length || 0} available)
                </Button>
              </div>
            )}

            {/* Drinks selection step */}
            {step === "drinks" && (
              <>
                <div className="grid grid-cols-5 gap-2">
                  {DRINK_TYPES.map((dt) => (
                    <button
                      key={dt.type}
                      id={`round-drink-${dt.type}`}
                      onClick={() => {
                        setDrinkCounts((prev) => ({
                          ...prev,
                          [dt.type]: (prev[dt.type] || 0) + 1,
                        }));
                      }}
                      disabled={localIsLoading || isLoading}
                      className={cn(
                        "flex flex-col items-center justify-center py-3 px-2 rounded-[var(--radius-md)]",
                        "border border-border bg-card hover:bg-muted transition-colors",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                      )}
                      title={dt.label}
                    >
                      <span className="text-2xl">{dt.emoji}</span>
                      <span className="text-xs text-foreground mt-1">
                        {drinkCounts[dt.type] || 0}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Drink count display */}
                <div className="text-center text-sm text-muted-foreground">
                  Total:{" "}
                  <span className="font-semibold text-foreground">
                    {Object.values(drinkCounts).reduce((a, b) => a + b, 0)} drink
                    {Object.values(drinkCounts).reduce((a, b) => a + b, 0) !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-2">
                  <Button
                    id="round-back-drinks"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep(hasGroupMembers ? "mode" : "drinks")}
                    disabled={localIsLoading || isLoading}
                  >
                    Back
                  </Button>
                  <Button
                    id="round-submit-drinks"
                    className="flex-1"
                    onClick={handleDrinkSubmit}
                    disabled={
                      localIsLoading ||
                      isLoading ||
                      Object.values(drinkCounts).reduce((a, b) => a + b, 0) === 0
                    }
                  >
                    {localIsLoading || isLoading ? "Logging..." : "Log round"}
                  </Button>
                </div>
              </>
            )}

            {/* Members selection step */}
            {step === "members" && groupMembers && groupMembers.length > 0 && (
              <>
                <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
                  {groupMembers.map((member) => {
                    const isSelected = selectedMembers.has(member.id);
                    return (
                      <button
                        key={member.id}
                        id={`round-member-${member.id}`}
                        onClick={() => toggleMember(member.id)}
                        disabled={localIsLoading || isLoading}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] text-left transition-colors",
                          isSelected
                            ? "bg-primary/10 border border-primary/30"
                            : "bg-card border border-border hover:bg-muted",
                          (localIsLoading || isLoading) && "opacity-50"
                        )}
                      >
                        <Avatar className="size-8 shrink-0">
                          {member.avatar_url && (
                            <AvatarImage src={member.avatar_url} alt={member.real_name} />
                          )}
                          <AvatarFallback className="text-[10px] bg-muted text-muted-foreground font-medium">
                            {getInitials(member.real_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium text-foreground truncate">
                            {member.real_name}
                          </div>
                          {member.alias && (
                            <div className="text-[11px] text-muted-foreground">
                              @{member.alias}
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <span className="text-primary">
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                            >
                              <path
                                d="M3 8l3.5 3.5L13 4"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="text-center text-sm text-muted-foreground">
                  {selectedMembers.size}/{groupMembers.length} selected
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-2">
                  <Button
                    id="round-back-members"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep("drinks")}
                    disabled={localIsLoading || isLoading}
                  >
                    Back
                  </Button>
                  <Button
                    id="round-submit-members"
                    className="flex-1"
                    onClick={() => setStep("drinks")}
                    disabled={localIsLoading || isLoading || selectedMembers.size === 0}
                  >
                    Next
                  </Button>
                </div>
              </>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
