import type { Metadata } from "next";
import LandingShell from "@/components/landing/LandingShell";

export const metadata: Metadata = {
  title: "Drunkva — Track your nights. Own your mornings.",
  description:
    "The social drinking tracker that logs your sessions, builds a leaderboard, and serves you a morning card with the full receipts. Join the waitlist.",
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LandingShell>{children}</LandingShell>;
}
