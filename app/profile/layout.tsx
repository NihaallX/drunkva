import { requireOnboarding } from "@/lib/auth";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NEXT_PUBLIC_CLERK_ENABLED === "true") {
    await requireOnboarding();
  }
  return <>{children}</>;
}
