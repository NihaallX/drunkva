import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Terms of Service â€” Drunkva",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground px-6 py-10 flex flex-col items-center">
      <div className="w-full max-w-xl flex flex-col gap-8">
        {/* Back Button */}
        <Link
          href="/onboarding"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Onboarding</span>
        </Link>

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Terms of Service</h1>
          <p className="text-sm text-muted-foreground">Last updated: April 2026</p>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-6 text-[15px] leading-relaxed text-muted-foreground">
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p>
              By signing up or using the Drunkva application, you agree to comply with and be bound by these Terms of Service. If you do not agree to these terms, you may not use the app.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-foreground">2. Safety and Responsibility Disclaimer</h2>
            <p className="text-foreground font-medium bg-secondary/50 p-4 rounded-lg border border-border">
              Drunkva is purely an entertainment and personal metric-tracking application. It does not calculate precise medical or forensic blood alcohol concentration (BAC). 
            </p>
            <p>
              The "Confidence Stages" and "Peak Estimations" are algorithmic estimations and must <strong>NEVER</strong> be used to evaluate your ability to operate heavy machinery, perform dangerous tasks, or drive.
            </p>
            <p className="text-destructive font-semibold">
              DO NOT DRINK AND DRIVE. Always seek safe transportation options.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-foreground">3. Age Restriction</h2>
            <p>
              By accessing the platform, you assert and guarantee that you have reached the legal minimum drinking age in the country, state, or jurisdiction where you reside.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-foreground">4. Limitation of Liability</h2>
            <p>
              Drunkva and its developers take absolutely no responsibility for actions taken under the influence of alcohol. The platform is provided "as is" without warranty. Use at your own individual risk.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
