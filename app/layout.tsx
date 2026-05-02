import type React from "react";
import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk, Barlow_Condensed } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { InstallPrompt } from "@/components/drunkva/InstallPrompt";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

// Body font — display: swap prevents invisible text while font loads
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Heading / display font — athletic, geometric, matches Drunkva's brand
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

// Condensed display font for share overlay stats — matches Strava's athletic aesthetic
const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#E8621A",
};

export const metadata: Metadata = {
  title: "Drunkva — Track Every Session",
  description:
    "The social drinking session tracker. Log drinks, track your confidence curve, share your night.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Drunkva",
  },
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/drunkva-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/drunkva-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

const clerkEnabled = process.env.NEXT_PUBLIC_CLERK_ENABLED === "true";

function Providers({ children }: { children: React.ReactNode }) {
  return (
    // ThemeProvider still manages theme context — but we suppress forcedTheme
    // to stop next-themes injecting style={{color-scheme:"dark"}} on <html>.
    // Dark mode is handled entirely via CSS (color-scheme: dark in :root).
    <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
      {children}
      <Toaster />
    </ThemeProvider>
  );
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const content = (
    // <html> has NO className and NO inline style — avoids all SSR/client hydration mismatches.
    // Dark mode is set globally via `color-scheme: dark` in :root (globals.css).
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect to external origins hit early in the page lifecycle.
            Establishing the TCP+TLS handshake before JS runs saves 200-400ms
            on first auth check and avatar image loads. */}
        <link rel="preconnect" href="https://clerk.accounts.dev" />
        <link rel="preconnect" href="https://img.clerk.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* DNS-prefetch as a fallback for browsers that don't support preconnect */}
        <link rel="dns-prefetch" href="https://clerk.accounts.dev" />
        <link rel="dns-prefetch" href="https://img.clerk.com" />
      </head>
      <script
        dangerouslySetInnerHTML={{
          __html: `// Prevent automatic geolocation prompts from cached/old bundles.
;(function(){try{if(typeof navigator!=='undefined'&&navigator.geolocation){
  const noopError = function(cb){ if(typeof cb==='function') cb({code:1,message:'Geolocation disabled by app'}); };
  try{ navigator.geolocation.getCurrentPosition = function(success, error){ return noopError(error); }; }catch(e){}
  try{ navigator.geolocation.watchPosition = function(){ return -1; }; }catch(e){}
}}
}catch(e){} })();`,
        }}
      />
      <body className={`${inter.variable} ${spaceGrotesk.variable} ${barlowCondensed.variable} font-sans`}>
        {/*
          Dark shell + centering container.
          - `.dark` here activates Tailwind dark: variants for all descendants.
          - The outer div fills the viewport with the dark background on wide screens.
          - The inner div constrains content to 390px and centers it.
        */}
        <div className="dark min-h-screen bg-background flex flex-col items-center">
          <div className="w-full max-w-[var(--container-w)] flex flex-col min-h-screen relative bg-background overflow-x-clip">
            <Providers>
              {children}
              <InstallPrompt />
            </Providers>
          </div>
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html: `if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); }); }`,
          }}
        />
        <Analytics />
      </body>
    </html>
  );

  return clerkEnabled ? (
    <ClerkProvider>{content}</ClerkProvider>
  ) : (
    content
  );
}
