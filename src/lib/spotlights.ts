export interface SpotlightStory {
  id: string;
  listing_id?: string;
  name: string;
  tagline: string;
  type: "startup" | "people" | "vc";
  logo_url?: string;
  media_url?: string;
  media_type?: "image" | "video";
  color: string;
  initials: string;
  city: string;
  website_url?: string;
  created_at: string;
  expires_at: string;
  user_id: string;
}

export function calculateSpotlightExpiry(createdDate = new Date()): Date {
  const expiry = new Date(createdDate);
  expiry.setHours(9, 0, 0, 0);

  if (createdDate.getHours() >= 9) {
    expiry.setDate(expiry.getDate() + 1);
  }

  return expiry;
}

export function isSpotlightActive(story: SpotlightStory): boolean {
  const now = new Date();
  const expiresAt = new Date(story.expires_at);
  return now < expiresAt;
}

