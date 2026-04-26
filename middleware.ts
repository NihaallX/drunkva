import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isClerkEnabled = process.env.NEXT_PUBLIC_CLERK_ENABLED === "true";

const isPrivateRoute = createRouteMatcher([
  "/session(.*)",
  "/feed(.*)",
  "/profile(.*)",
  "/morning-card(.*)",
  "/onboarding(.*)",
  "/api/sessions(.*)",
  "/api/drinks(.*)",
  "/api/feed(.*)",
  "/api/cheers(.*)",
  "/api/follow(.*)",
  "/api/profile(.*)",
  "/api/title(.*)",
  "/api/push(.*)",
]);

// When Clerk is disabled (NEXT_PUBLIC_CLERK_ENABLED != true), pass all requests through.
// This allows testing every screen locally without real Clerk credentials.
export default isClerkEnabled
  ? clerkMiddleware(async (auth, req) => {
      if (isPrivateRoute(req)) {
        await auth.protect();
      }
    })
  : function middleware(_req: NextRequest) {
      return NextResponse.next();
    };

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
