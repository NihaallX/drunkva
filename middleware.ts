import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Generate a cryptographically secure random nonce for Content-Security-Policy.
 * Used to restrict inline scripts/styles to only those with the matching nonce attribute.
 */
function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function middleware(req: NextRequest) {
  const response = NextResponse.next();
  const nonce = generateNonce();
  response.headers.set("x-nonce", nonce);

  const isDev = process.env.NODE_ENV !== "production";
  const cspHeader = [
    "default-src 'self'",
    // In production: use nonce for inline scripts
    // In dev: keep unsafe-inline + unsafe-eval for HMR
    `script-src 'self'${isDev ? " 'unsafe-inline' 'unsafe-eval'" : ` 'nonce-${nonce}'`} https://va.vercel-scripts.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://api.groq.com https://va.vercel-scripts.com",
    "img-src 'self' data: blob: https://images.unsplash.com",
    "worker-src 'self' blob:",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join("; ");

  response.headers.set("Content-Security-Policy", cspHeader);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
