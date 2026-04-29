import { requireOnboarding } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  await requireOnboarding();
  redirect("/session");
}
