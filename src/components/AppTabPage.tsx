import HomeClient from "@/components/HomeClient";
import { fetchBrandingSettings } from "@/lib/db";

export async function AppTabPage({ tab }: { tab: "home" | "explore" | "search" | "map" | "activity" | "profile" }) {
  const branding = await fetchBrandingSettings();
  return <HomeClient initialBranding={branding} initialTab={tab} />;
}
