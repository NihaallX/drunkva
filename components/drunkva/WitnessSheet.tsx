"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface WitnessUser {
  id: string;
  real_name: string;
  alias: string | null;
  avatar_url: string | null;
}

interface WitnessSheetProps {
  open: boolean;
  sessionId: string;
  onClose: () => void;
  onDone: (taggedCount: number) => void;
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export function WitnessSheet({ open, sessionId, onClose, onDone }: WitnessSheetProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WitnessUser[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      setTimeout(() => inputRef.current?.focus(), 200);
    } else {
      document.body.style.overflow = "";
      setQuery("");
      setSelected(new Set());
      setResults([]);
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/witnesses/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.users ?? []);
        }
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, open]);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); }
      else if (next.size < 5) { next.add(id); }
      return next;
    });
  }, []);

  const handleConfirm = async () => {
    if (selected.size === 0) { onDone(0); return; }
    setSubmitting(true);
    try {
      await fetch("/api/witnesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, user_ids: Array.from(selected) }),
      });
      onDone(selected.size);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Sheet */}
      <div
        className={cn(
          "fixed bottom-0 left-1/2 -translate-x-1/2 z-[var(--z-overlay)] w-full max-w-[var(--container-w)]",
          "bg-card border-t border-border rounded-t-2xl",
          "transition-transform duration-300",
          open ? "translate-y-0" : "translate-y-full"
        )}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-border" />
        </div>

        <div className="px-4 pb-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[15px] font-semibold text-foreground">Tag witnesses</h2>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                {selected.size}/5 selected · They'll get a push to confirm
              </p>
            </div>
            <button onClick={onClose} className="text-muted-foreground text-sm">
              Skip
            </button>
          </div>

          {/* Search input */}
          <input
            ref={inputRef}
            id="witness-search"
            className="dv-input mb-3"
            placeholder="Search by name or @alias…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          {/* Results */}
          <div className="flex flex-col gap-1 max-h-52 overflow-y-auto">
            {searching ? (
              <div className="text-[13px] text-muted-foreground text-center py-4">
                Searching…
              </div>
            ) : results.length === 0 ? (
              <div className="text-[13px] text-muted-foreground text-center py-4">
                {query ? "No one found" : "Your mutual follows will appear here"}
              </div>
            ) : (
              results.map((u) => {
                const isSelected = selected.has(u.id);
                const isDisabled = !isSelected && selected.size >= 5;
                return (
                  <button
                    key={u.id}
                    id={`witness-${u.id}`}
                    onClick={() => toggleSelect(u.id)}
                    disabled={isDisabled}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] text-left transition-colors",
                      isSelected
                        ? "bg-primary/10 border border-primary/30"
                        : "bg-card border border-border hover:bg-muted",
                      isDisabled && "opacity-40"
                    )}
                  >
                    <Avatar className="size-8 shrink-0">
                      {u.avatar_url && <AvatarImage src={u.avatar_url} alt={u.real_name} />}
                      <AvatarFallback className="text-[10px] bg-muted text-muted-foreground font-medium">
                        {getInitials(u.real_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-foreground truncate">{u.real_name}</div>
                      {u.alias && (
                        <div className="text-[11px] text-muted-foreground">@{u.alias}</div>
                      )}
                    </div>
                    {isSelected && (
                      <span className="text-primary">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M3 8l3.5 3.5L13 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            <Button
              id="witness-skip"
              variant="outline"
              className="flex-1 border-border text-muted-foreground"
              onClick={() => onDone(0)}
            >
              Skip
            </Button>
            <Button
              id="witness-confirm"
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleConfirm}
              disabled={submitting}
            >
              {submitting ? "Tagging…" : selected.size > 0 ? `Tag ${selected.size}` : "Done"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
