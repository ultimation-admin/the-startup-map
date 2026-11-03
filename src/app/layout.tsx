import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
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
    <html lang="en">
      <head>
        
        <script dangerouslySetInnerHTML={{ __html: SAFE_DOM_GUARD_SCRIPT }} />
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
      <body>

        <ClerkProvider
          appearance={{
            variables: {
              colorPrimary: "#f85900",
              colorBackground: "#ffffff",
              colorForeground: "#000000",
              colorMutedForeground: "#757575",
              colorInput: "#E3E3E3",
              colorInputForeground: "#000000",
              borderRadius: "10px",
              fontFamily: "Inter, Waldenburg, Inter, sans-serif",
            },
            elements: {
              formButtonPrimary:
                "bg-[#f85900] hover:bg-[#e04f00] text-white font-semibold rounded-[10px] h-10 text-[13px] normal-case shadow-none transition-colors",
              formFieldInput:
                "rounded-[10px] border border-[#E3E3E3] bg-[#E3E3E3] focus:bg-white focus:border-[#f85900] focus:ring-2 focus:ring-black text-[13px] px-4 h-10 text-black font-medium transition-colors placeholder:text-[#808080]",
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
