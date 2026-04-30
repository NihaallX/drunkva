/** @type {import('next').NextConfig} */

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
  // Restrict where scripts, styles, images, and connections can come from.
  // 'unsafe-inline' is required for Next.js inline styles/scripts in dev; tighten in prod if possible.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js requires 'unsafe-inline' and 'unsafe-eval' for dev HMR; nonces are preferred for prod
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.com https://*.clerk.accounts.dev",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      // Allow Clerk hosted UIs and our own origin for API calls
      "connect-src 'self' https://*.clerk.com https://*.clerk.accounts.dev https://api.groq.com",
      // Allow avatars from Clerk and other common CDNs
      "img-src 'self' data: blob: https://*.clerk.com https://img.clerk.com https://images.clerk.dev",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
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
