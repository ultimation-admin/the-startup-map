export type ListingType = "startup" | "vc" | "person";
export type ListingDraft = { name: string; type: ListingType; city: string; description?: string };

export async function geocodeIndia(query: string) {
  const params = new URLSearchParams({ q: query, format: "jsonv2", limit: "1", countrycodes: "in" });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { "User-Agent": "TheStartupMap/0.1 (contact@thestartupmap.in)" },
    next: { revalidate: 86400 }
  });
  if (!response.ok) throw new Error("Geocoding service unavailable");
  const [result] = await response.json() as Array<{ lat: string; lon: string; display_name: string }>;
  return result ? { latitude: Number(result.lat), longitude: Number(result.lon), label: result.display_name } : null;
}
