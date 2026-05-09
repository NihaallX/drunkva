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
  // Restrict where scripts, styles, images, and connections can come from.
  // 'unsafe-inline' is required for Next.js inline styles/scripts in dev; tighten in prod if possible.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js requires 'unsafe-inline' and 'unsafe-eval' for dev HMR; prod drops unsafe-eval.
      // va.vercel-scripts.com is required for Vercel Web Analytics.
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://clerk.com https://*.clerk.accounts.dev https://va.vercel-scripts.com`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // data: is required — Next.js self-hosts Google Fonts as data:font/woff2;base64 URIs.
      "font-src 'self' data: https://fonts.gstatic.com",
      // Allow Clerk hosted UIs and our own origin for API calls.
      // api.groq.com is called server-side only but listed here as a safety net.
      "connect-src 'self' https://*.clerk.com https://*.clerk.accounts.dev https://clerk-telemetry.com https://*.clerk-telemetry.com https://api.groq.com https://va.vercel-scripts.com",
      // Allow avatars from Clerk and other common CDNs
      "img-src 'self' data: blob: https://*.clerk.com https://img.clerk.com https://images.clerk.dev",
      // Clerk internally creates Web Workers from blob: URLs for its auth machinery.
      // Without worker-src the browser falls back to script-src which blocks blob:.
      "worker-src 'self' blob:",
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
