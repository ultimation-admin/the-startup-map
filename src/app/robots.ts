import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://thestartupmap.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/tony-stark-2501"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
