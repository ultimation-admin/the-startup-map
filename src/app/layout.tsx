import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import { Gabarito } from "next/font/google";
import "./globals.css";

import { fetchBrandingSettings } from "@/lib/db";
import { getPublicMediaUrl, getFaviconMimeType } from "@/lib/r2";
import { PostHogProvider } from "@/components/PostHogProvider";
import { SAFE_DOM_GUARD_SCRIPT } from "@/lib/safe-dom-guard";
import { PrimaryAppShell } from "@/components/PrimaryAppShell";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const gabarito = Gabarito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-gabarito",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const branding = await fetchBrandingSettings();
  const rawFavicon = branding.favicon_url;
  const resolvedFavicon = rawFavicon ? getPublicMediaUrl(rawFavicon) : null;
  const faviconUrl = resolvedFavicon || "/favicon.ico";
  const faviconType = getFaviconMimeType(faviconUrl);

  return {
    title: "The Startup Map | India's startup ecosystem",
    description: "Discover the people, companies, and investors building India's future.",
    icons: {
      icon: [
        { url: faviconUrl, type: faviconType },
      ],
      shortcut: [{ url: faviconUrl, type: faviconType }],
      apple: [{ url: faviconUrl }],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const branding = await fetchBrandingSettings();
  const logoUrl = branding.logo_url ? getPublicMediaUrl(branding.logo_url) : null;
  return (
    <html lang="en" className={gabarito.variable}>
      <head>
        
        <script dangerouslySetInnerHTML={{ __html: SAFE_DOM_GUARD_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://basemaps.cartocdn.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://basemaps.cartocdn.com" />
        <link rel="preconnect" href="https://a.basemaps.cartocdn.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://b.basemaps.cartocdn.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://c.basemaps.cartocdn.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://d.basemaps.cartocdn.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://a.basemaps.cartocdn.com" />
        <link rel="dns-prefetch" href="https://b.basemaps.cartocdn.com" />
        <link rel="dns-prefetch" href="https://c.basemaps.cartocdn.com" />
        <link rel="dns-prefetch" href="https://d.basemaps.cartocdn.com" />
        <link rel="preconnect" href="https://unpkg.com" crossOrigin="anonymous" />
      </head>
      <body className={gabarito.className}>

        <ClerkProvider
          appearance={{
            variables: {
              colorPrimary: "#f85900",
              colorBackground: "#ffffff",
              colorForeground: "#000000",
              colorMutedForeground: "#5B6368",
              colorInput: "#F0F2F5",
              colorInputForeground: "#000000",
              borderRadius: "10px",
              fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            },
            elements: {
              formButtonPrimary:
                "bg-[#f85900] hover:bg-[#e04f00] text-white font-semibold rounded-full h-10 text-sm normal-case shadow-xs transition-all duration-100 hover:scale-[1.01] active:scale-[0.98]",
              formFieldInput:
                "rounded-[10px] border border-transparent bg-[#F0F2F5] focus:bg-white focus:border-[#f85900] focus:ring-2 focus:ring-[#f85900]/25 text-[13.5px] px-3.5 h-10 text-black font-medium transition-all duration-100 placeholder:text-[#666666]",
              footerActionLink: "text-[#f85900] font-semibold hover:underline",
            },
          }}
        >
          <PostHogProvider>
            <PrimaryAppShell logoUrl={logoUrl}>{children}</PrimaryAppShell>
          </PostHogProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}