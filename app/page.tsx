import { redirect } from "next/navigation";

const clerkEnabled = process.env.NEXT_PUBLIC_CLERK_ENABLED === "true";

export default async function HomePage() {
  if (clerkEnabled) {
    // Dynamically import Clerk only when enabled
    const { auth } = await import("@clerk/nextjs/server");
    const { userId } = await auth();
    if (userId) {
      redirect("/session");
    } else {
      redirect("/sign-in");
    }
  }

  // Clerk disabled — go straight to session for local testing
  redirect("/session");
}
