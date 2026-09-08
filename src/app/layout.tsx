import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import type { Metadata } from "next";
import { Gabarito } from "next/font/google";
import "./globals.css";

const gabarito = Gabarito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-gabarito",
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Startup Map | India's startup ecosystem",
  description: "Discover the people, companies, and investors building India's future.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  return (
    <html lang="en" className={gabarito.variable}>
      <head>
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
          publishableKey={publishableKey || "pk_test_Y2xlcmsudGhlc3RhcnR1cG1hcC5jb20k"}
          appearance={{
            theme: shadcn,
            variables: {
              colorPrimary: "#10b981",
              colorBackground: "#ffffff",
              borderRadius: "1rem",
              fontFamily: "var(--font-gabarito), 'Gabarito', sans-serif",
            },
            elements: {
              formButtonPrimary: "bg-[#10b981] hover:bg-[#059669] text-white font-bold rounded-full py-2.5 text-xs shadow-sm transition-all",
              formFieldInput: "rounded-xl border border-stone-300 focus:border-[#10b981] text-xs py-2",
            },
          }}
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}