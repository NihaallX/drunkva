import { requireOnboarding } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  if (process.env.NEXT_PUBLIC_CLERK_ENABLED === "true") {
    await requireOnboarding();
  }
  redirect("/session");
}
