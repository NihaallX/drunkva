"use client";

import { DrunkvaLogo } from "@/components/drunkva/DrunkvaLogo";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/drunkva/BottomNav";

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

interface SessionStartScreenProps {
  venueInput: string;
  onVenueChange: (v: string) => void;
  onStart: () => void;
  starting: boolean;
  userName: string;
  userImageUrl: string | null;
}

export function SessionStartScreen({
  venueInput,
  onVenueChange,
  onStart,
  starting,
  userName,
  userImageUrl,
}: SessionStartScreenProps) {
  return (
    <div className="dv-page flex flex-col">
      <div className="dv-nav flex items-center justify-between px-4 py-3">
        <DrunkvaLogo />
        <Avatar className="size-7">
          {userImageUrl && <AvatarImage src={userImageUrl} alt={userName} />}
          <AvatarFallback className="bg-muted text-muted-foreground text-[10px] font-medium">
            {getInitials(userName)}
          </AvatarFallback>
        </Avatar>
      </div>

      <div className="flex-1 flex flex-col justify-center px-5 gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1.5">Start a session</h1>
          <p className="text-sm text-muted-foreground">Where are you drinking tonight?</p>
        </div>

        <input
          id="venue-input"
          className="dv-input"
          placeholder="Venue name (optional)"
          value={venueInput}
          onChange={(e) => onVenueChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onStart()}
        />

        <Button
          id="start-session-btn"
          onClick={onStart}
          disabled={starting}
          className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-[15px] font-medium"
        >
          {starting ? "Starting…" : "🍺 Start session"}
        </Button>
      </div>

      <BottomNav />
    </div>
  );
}
