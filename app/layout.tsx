import type React from "react";
import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { InstallPrompt } from "@/components/drunkva/InstallPrompt";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

// Body font
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

// Heading / display font â€” athletic, geometric, matches Drunkva's brand
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#E8621A",
};

export const metadata: Metadata = {
  title: "Drunkva â€” Track Every Session",
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
    // ThemeProvider still manages theme context â€” but we suppress forcedTheme
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
    // <html> has NO className and NO inline style â€” avoids all SSR/client hydration mismatches.
    // Dark mode is set globally via `color-scheme: dark` in :root (globals.css).
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${spaceGrotesk.variable} font-sans`}>
        {/*
          Dark shell + centering container.
          - `.dark` here activates Tailwind dark: variants for all descendants.
          - The outer div fills the viewport with the dark background on wide screens.
          - The inner div constrains content to 390px and centers it.
        */}
        <div className="dark min-h-screen bg-background flex flex-col items-center">
          <div className="w-full max-w-[390px] flex flex-col min-h-screen relative bg-background overflow-x-clip">
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
