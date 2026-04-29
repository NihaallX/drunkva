import { requireOnboarding } from "@/lib/auth";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  await requireOnboarding();
  return <>{children}</>;
}
