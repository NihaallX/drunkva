"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { DrunkvaLogo } from "@/components/drunkva/DrunkvaLogo";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut, Trash2 } from "lucide-react";
import { clerkEnabled } from "@/lib/mock-user";
import { useClerk as useClerkHook } from "@clerk/nextjs";

let useClerk: () => any;
if (clerkEnabled) {
  useClerk = useClerkHook;
} else {
  useClerk = () => ({ signOut: async () => { window.location.href = "/sign-in"; } });
}

export default function EditProfilePage() {
  const router = useRouter();
  const [realName, setRealName] = useState("");
  const [alias, setAlias] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { signOut } = useClerk();

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data?.user) {
          if (data.user.real_name) setRealName(data.user.real_name);
          if (data.user.alias) setAlias(data.user.alias);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!realName.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ real_name: realName.trim(), alias: alias.trim() || null }),
    });
    if (res.ok) {
      router.push("/profile");
    } else {
      setError("Something went wrong. Try again.");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteReason) {
      alert("Please select a reason for leaving.");
      return;
    }
    setDeleteLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: deleteReason }),
      });
      if (res.ok) {
        await signOut();
      } else {
        alert("Failed to delete account. Try again.");
      }
    } catch (e) {
      alert("An error occurred.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background flex flex-col px-5 relative">
      <button
        onClick={() => router.back()}
        className="absolute left-5 top-8 text-muted-foreground hover:text-foreground transition-colors p-2 bg-transparent border-0 cursor-pointer"
        aria-label="Go back"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      {/* Logo */}
      <div className="flex justify-center py-10">
        <DrunkvaLogo />
      </div>

      <div className="flex-1 flex flex-col gap-5 max-w-sm mx-auto w-full">
        <div>
          <h1 className="text-[22px] font-semibold text-foreground mb-1.5">Edit profile</h1>
          <p className="text-sm text-muted-foreground">Update your details.</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="edit-real-name" className="dv-stat-label">Your name *</label>
          <input
            id="edit-real-name"
            className="dv-input"
            placeholder="John Doe"
            value={realName}
            onChange={(e) => setRealName(e.target.value)}
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="edit-alias" className="dv-stat-label">
            Alias <span className="text-muted-foreground/60 font-normal normal-case">(optional)</span>
          </label>
          <div className="relative">
            <span
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[15px] pointer-events-none select-none"
              aria-hidden="true"
            >
              @
            </span>
            <input
              id="edit-alias"
              className={cn("dv-input", "dv-input-prefix")}
              placeholder="johnsigma"
              value={alias}
              onChange={(e) => setAlias(e.target.value.replace(/\s/g, "").toLowerCase())}
            />
          </div>
        </div>

        {error && <p className="text-[13px] text-destructive">{error}</p>}

        <Button
          id="edit-profile-submit"
          onClick={handleSubmit}
          disabled={saving}
          className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-[15px] font-medium"
        >
          {saving ? "Saving..." : "Save changes"}
        </Button>

        {/* Separator */}
        <div className="h-px bg-border my-2" />

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <Button
            id="logout-btn"
            variant="outline"
            onClick={() => signOut()}
            className="border-border text-foreground h-12 text-[15px] flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </Button>

          <Button
            id="delete-prompt-btn"
            variant="ghost"
            onClick={() => setIsDeleting(true)}
            className="text-destructive hover:text-destructive/80 hover:bg-destructive/10 h-10 text-xs flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5 text-destructive" />
            <span>Delete Account</span>
          </Button>
        </div>
      </div>

      {/* Delete Survey Modal */}
      {isDeleting && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-5">
          <div className="bg-card border border-border w-full max-w-sm rounded-xl p-5 shadow-lg flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Why are you leaving?</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Help us understand where we can improve.</p>
            </div>

            <div className="flex flex-col gap-2">
              {[
                "I don't drink anymore",
                "Privacy / data concerns",
                "App felt too complex / clunky",
                "Wiping records for a clean restart",
                "Other",
              ].map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setDeleteReason(reason)}
                  className={cn(
                    "w-full text-left p-3 rounded-md text-xs border transition-colors duration-150 cursor-pointer",
                    deleteReason === reason
                      ? "bg-primary/10 border-primary text-primary font-medium"
                      : "bg-transparent border-border text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  {reason}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2.5 mt-2">
              <Button
                variant="outline"
                className="flex-1 h-10 text-xs"
                onClick={() => { setIsDeleting(false); setDeleteReason(""); }}
                disabled={deleteLoading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1 h-10 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleDelete}
                disabled={deleteLoading || !deleteReason}
              >
                {deleteLoading ? "Deleting..." : "Permanently Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
