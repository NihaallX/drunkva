import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Terms of Service - Drunkva",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground px-6 py-10 flex flex-col items-center">
      <div className="w-full max-w-3xl flex flex-col gap-8">
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
          <p className="text-sm text-muted-foreground">Last updated: May 2026</p>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-6 text-[15px] leading-relaxed text-muted-foreground">
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Drunkva, you agree to these Terms. If you do not agree, do not use the app.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-foreground">2. Eligibility</h2>
            <p>
              You must be of legal drinking age in your jurisdiction to use features related to alcohol tracking. You are responsible for complying with local laws.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-foreground">3. Safety and Responsibility Disclaimer</h2>
            <p className="text-foreground font-medium bg-secondary/50 p-4 rounded-lg border border-border">
              Drunkva is an entertainment and personal tracking tool. It does not provide medical, legal, or emergency advice, and it does not calculate precise medical or forensic BAC.
            </p>
            <p>
              Confidence stages, BAC-like indicators, and any generated summaries are estimates only and must <strong>NEVER</strong> be used to determine fitness to drive, operate machinery, or make safety-critical decisions.
            </p>
            <p className="text-destructive font-semibold">
              DO NOT DRINK AND DRIVE. Always seek safe transportation options.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-foreground">4. User Content and Witness Entries</h2>
            <p>
              You are responsible for content you add, including session titles, drink logs, witness entries, profile info, and shared outputs. You must only submit content you are allowed to share and that does not violate the law or others' rights.
            </p>
            <p>
              Witness and collaborative session features rely on user-submitted input and may be inaccurate or disputed. Drunkva does not guarantee the correctness of user-generated entries.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-foreground">5. AI-Generated Features</h2>
            <p>
              Some text features (for example, generated session titles) may use third-party AI services. Generated outputs may be inaccurate, offensive, or incomplete, and you should review before sharing.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-foreground">6. Prohibited Use</h2>
            <p>
              You may not use Drunkva to harass others, violate privacy, impersonate people, automate abuse, interfere with service operation, or attempt unauthorized access.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-foreground">7. Account and Access</h2>
            <p>
              We may suspend or limit access where required for security, abuse prevention, legal compliance, or operational reasons.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-foreground">8. Limitation of Liability</h2>
            <p>
              To the maximum extent allowed by law, Drunkva is provided "as is" and "as available" without warranties. We are not liable for indirect, incidental, special, consequential, or punitive damages, including those arising from alcohol-related decisions, user-generated content, or service interruptions.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-foreground">9. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. Continued use after updates means you accept the revised Terms.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-foreground">10. Contact</h2>
            <p>
              For legal or policy questions, contact us through official Drunkva support channels referenced in the app or project repository.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
