import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Privacy Policy - Drunkva",
};

export default function PrivacyPage() {
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
          <h1 className="text-3xl font-bold tracking-tight mb-2">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: May 2026</p>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-6 text-[15px] leading-relaxed text-muted-foreground">
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-foreground">1. Information We Collect</h2>
            <p>
              We collect data needed to run Drunkva features, which may include profile details (such as display name and avatar), session metadata, drink logs, witness submissions, generated titles, and app diagnostics.
            </p>
            <p>
              If authentication is enabled in your deployment, we may also process authentication identifiers from that provider. If you use mock or guest flows, stored profile fields may be limited.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-foreground">2. How We Use Data</h2>
            <p>
              We use collected data to provide app functionality, maintain session integrity, generate summaries, improve reliability, prevent abuse, and comply with legal obligations.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-foreground">3. Location Data</h2>
            <p>
              Session location is optional. If provided, location coordinates are used to support features like venue context and timeline memories. You can choose not to provide location.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-foreground">4. AI and Third-Party Processing</h2>
            <p>
              Some features may call third-party services (for example, AI text generation, notification providers, analytics, hosting, or database infrastructure). Data sent is limited to what is required for each feature.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-foreground">5. Cookies, Local Storage, and PWA Data</h2>
            <p>
              Drunkva may store local data in your browser or app context (for example, service-worker cache, queued offline events, and preference values) to improve performance and offline behavior.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-foreground">6. Data Sharing</h2>
            <p>
              We do not sell personal information. We may share data with service providers that help operate Drunkva, and where required by law, regulation, or legal process.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-foreground">7. Retention and Deletion</h2>
            <p>
              Data is retained only as long as needed for product and legal purposes. You can request deletion of profile-related data and associated session records through supported app controls.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-foreground">8. Security</h2>
            <p>
              We use reasonable administrative and technical safeguards, but no system can be guaranteed 100% secure.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-foreground">9. Children</h2>
            <p>
              Drunkva is not intended for children below legal drinking age. If you believe a minor has provided personal data, contact us so we can review and remove it where appropriate.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-foreground">10. Policy Changes</h2>
            <p>
              We may update this Privacy Policy periodically. Continued use after updates means you acknowledge the revised policy.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-foreground">11. Contact</h2>
            <p>
              For privacy-related questions or requests, contact us through official Drunkva support channels referenced in the app or project repository.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
