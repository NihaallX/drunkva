import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Privacy Policy â€” Drunkva",
};

export default function PrivacyPage() {
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
          <h1 className="text-3xl font-bold tracking-tight mb-2">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: April 2026</p>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-6 text-[15px] leading-relaxed text-muted-foreground">
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-foreground">1. Information We Collect</h2>
            <p>
              We collect information needed to keep track of your drink logs securely: your Name, Alias, Avatar (via Clerk login integrations), and the approximate timestamp of logged drinks.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-foreground">2. Use of Location Data</h2>
            <p>
              When initiating a session, you can optionally capture geolocation coordinates. This data is purely used to associate venue pins on a map for your personal memory summaries. It is not shared or sold.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-foreground">3. Retention</h2>
            <p>
              All personal statistics remain your property. You have the full right to delete your profile and corresponding session logs entirely from the app settings whenever you prefer.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
