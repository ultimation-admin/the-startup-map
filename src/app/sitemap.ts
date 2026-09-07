import { MetadataRoute } from "next";
import { fetchListings } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://thestartupmap.com";

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms-of-service`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  // Dynamic routes for startup and person listings
  let dynamicRoutes: MetadataRoute.Sitemap = [];
  try {
    const listings = await fetchListings();
    dynamicRoutes = listings.map((listing) => {
      const routePrefix = listing.type === "person" ? "p" : "s";
      return {
        url: `${baseUrl}/${routePrefix}/${listing.slug || listing.id}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: listing.type === "startup" ? 0.8 : 0.6,
      };
    });
  } catch (err) {
    console.warn("Sitemap dynamic routes fallback:", err);
  }

  return [...staticRoutes, ...dynamicRoutes];
}
