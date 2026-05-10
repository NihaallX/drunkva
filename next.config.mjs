/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV !== "production";

const securityHeaders = [
  // Prevent browsers from MIME-sniffing responses away from the declared content-type
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Block the page from being embedded in iframes on other origins (clickjacking protection)
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Stop legacy IE from executing downloads in the site context
  { key: "X-XSS-Protection", value: "1; mode=block" },
  // Do not send the full URL as Referer when navigating to other origins
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Restrict powerful features to only those actually needed by the app
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), interest-cohort=()",
  },
  // Force HTTPS for 1 year (including subdomains) once the browser has visited once
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  // Note: Content-Security-Policy is now set dynamically in middleware.ts with nonce support
  // to provide production security hardening (removes unsafe-inline from script-src in prod).
];

const nextConfig = {
  images: {
    unoptimized: true,
  },

  async headers() {
    return [
      {
        // Apply security headers to every route
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },

  experimental: {
    // Reduces unnecessary preload hints for large component libraries in dev.
    // Addresses the Turbopack dev-mode warning:
    //   "[turbopack]_browser_dev_hmr-client_hmr-client_ts was preloaded but not used"
    // This is a known Next.js 16 + Turbopack dev-only issue — it does NOT affect
    // production builds (pnpm build). If the warning persists in dev after this,
    // it can be safely ignored as it has zero impact on runtime performance.
    optimizePackageImports: ["@radix-ui/react-dialog", "lucide-react"],
  },
};

export default nextConfig;
