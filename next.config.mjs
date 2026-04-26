/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
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
