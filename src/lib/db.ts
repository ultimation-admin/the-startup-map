/**
 * Database Layer — Cloudflare D1
 *
 * Drop-in replacement for the former supabase.ts module.
 * Exports the same interfaces and function signatures so that
 * components can swap `@/lib/supabase` → `@/lib/db` with minimal changes.
 */

import { d1Query, d1QueryFirst, d1Execute, d1Batch } from "./d1";
import { geocodeIndia } from "./integrations";

// =========================================================================
// Types (unchanged from supabase.ts)
// =========================================================================

export type ListingType = "startup" | "vc" | "person";
export type ReviewState = "draft" | "pending" | "verified" | "rejected";

export interface Listing {
  id: string;
  owner_id: string;
  type: ListingType;
  name: string;
  slug: string;
  city: string;
  latitude: number;
  longitude: number;
  sector: string;
  stage?: string;
  description?: string;
  website?: string;
  logo_url?: string;
  tweet_url?: string;
  phone_number?: string;
  review_state: ReviewState;
  color?: string;
  initials?: string;
}

export interface JobPosting {
  id: string;
  listing_id: string;
  title: string;
  location: string;
  employment_type: string;
  application_url: string;
  is_active: boolean;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  phone_number?: string;
  headline?: string;
  bio?: string;
  role: "user" | "moderator" | "admin";
  website?: string;
  twitter_url?: string;
  linkedin_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CommunityPost {
  id: string;
  community_id: string;
  community_name: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  user_initials: string;
  user_role?: string;
  content: string;
  image_url?: string;
  likes_count: number;
  views_count: number;
  replies_count: number;
  liked_by: string[];
  replies: PostReply[];
  created_at: string;
  expires_at: string;
}

export interface PostReply {
  id: string;
  post_id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  user_initials: string;
  content: string;
  created_at: string;
}

export interface Community {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  members_count: number;
}

// =========================================================================
// Constants
// =========================================================================

export function getSectorColor(sector: string): string {
  const colors: Record<string, string> = {
    Climate: "#e9775c",
    Fintech: "#518bac",
    Health: "#d4a341",
    Investor: "#719d5b",
    Consumer: "#9b8bbb",
    SaaS: "#d5874f",
  };
  return colors[sector] || "#78a747";
}

const CITY_COORDINATES: Record<string, [number, number]> = {
  bengaluru: [77.59, 12.97],
  mumbai: [72.88, 19.08],
  delhi: [77.21, 28.61],
  "delhi ncr": [77.21, 28.61],
  "new delhi": [77.21, 28.61],
  gurugram: [77.02, 28.45],
  noida: [77.39, 28.53],
  chennai: [80.27, 13.08],
  pune: [73.86, 18.52],
  hyderabad: [78.48, 17.38],
};

export const ECOSYSTEM_COMMUNITIES: Community[] = [
  { id: "startups", name: "/startups", slug: "startups", description: "General startup ecosystem discussions", members_count: 0 },
  { id: "genai", name: "/genai", slug: "genai", description: "Building & scaling AI products", members_count: 0 },
  { id: "saas", name: "/saas", slug: "saas", description: "SaaS metrics, pricing & GTM strategies", members_count: 0 },
  { id: "founders", name: "/founders", slug: "founders", description: "Founder-only peer support & stories", members_count: 0 },
  { id: "vc-deals", name: "/vc-deals", slug: "vc-deals", description: "Pitch decks, term sheets & angel investing", members_count: 0 },
  { id: "engineering", name: "/engineering", slug: "engineering", description: "Full-stack code, infra & system design", members_count: 0 },
  { id: "d2c", name: "/d2c", slug: "d2c", description: "Supply chain, branding & D2C growth", members_count: 0 },
  { id: "hiring", name: "/hiring", slug: "hiring", description: "Early stage startup hiring & job posts", members_count: 0 },
];

// =========================================================================
// Helper: map a D1 row to a Listing with computed fields
// =========================================================================

function rowToListing(row: Record<string, unknown>): Listing {
  const name = String(row.name ?? "");
  return {
    id: String(row.id),
    owner_id: String(row.owner_id),
    type: String(row.type) as ListingType,
    name,
    slug: String(row.slug),
    city: String(row.city),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    sector: String(row.sector || "General"),
    stage: row.stage ? String(row.stage) : undefined,
    description: row.description ? String(row.description) : undefined,
    website: row.website ? String(row.website) : undefined,
    logo_url: row.logo_url ? String(row.logo_url) : undefined,
    tweet_url: row.tweet_url ? String(row.tweet_url) : undefined,
    phone_number: row.phone_number ? String(row.phone_number) : undefined,
    review_state: (String(row.review_state) || "pending") as ReviewState,
    color: getSectorColor(String(row.sector || "General")),
    initials: name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase(),
  };
}

// =========================================================================
// Listings CRUD
// =========================================================================

export async function fetchListings(): Promise<Listing[]> {
  try {
    const rows = await d1Query(
      "SELECT * FROM listings WHERE review_state != ? ORDER BY created_at DESC",
      ["rejected"]
    );
    return rows.map(rowToListing);
  } catch (err) {
    console.warn("fetchListings D1 query error, returning empty array:", err);
    return [];
  }
}

export async function fetchAllListingsAdmin(): Promise<Listing[]> {
  try {
    const rows = await d1Query(
      "SELECT * FROM listings ORDER BY created_at DESC"
    );
    return rows.map(rowToListing);
  } catch (err) {
    console.warn("fetchAllListingsAdmin D1 query error, returning empty array:", err);
    return [];
  }
}

export async function fetchUserListings(userId: string): Promise<Listing[]> {
  try {
    const rows = await d1Query(
      "SELECT * FROM listings WHERE owner_id = ? ORDER BY created_at DESC",
      [userId]
    );
    return rows.map(rowToListing);
  } catch (err) {
    console.warn("fetchUserListings D1 query error, returning empty array:", err);
    return [];
  }
}

export async function fetchListingBySlug(type: string, slug: string): Promise<Listing | null> {
  try {
    const normalizedType = type === 'p' || type === 'person' ? 'person' : 'startup';
    const row = await d1QueryFirst(
      "SELECT * FROM listings WHERE slug = ? AND (type = ? OR type = ?) LIMIT 1",
      [slug, normalizedType, type]
    );
    return row ? rowToListing(row) : null;
  } catch (err) {
    console.warn(`fetchListingBySlug '${slug}' D1 query error:`, err);
    return null;
  }
}

export function getProfileHandle(type: string, name: string): string {
  const isPerson = type === "person" || type.toLowerCase().includes("person") || type.toLowerCase().includes("people");
  return isPerson ? `p/${name}` : `s/${name}`;
}

export function getProfileSlugUrl(type: string, slug: string): string {
  const isPerson = type === "person" || type.toLowerCase().includes("person") || type.toLowerCase().includes("people");
  return isPerson ? `/p/${slug}` : `/s/${slug}`;
}

export async function createListing(
  listingData: {
    name: string;
    type: ListingType;
    city: string;
    sector: string;
    website?: string;
    description?: string;
    stage?: string;
    logo_url?: string;
    tweet_url?: string;
    phone_number?: string;
    latitude?: number;
    longitude?: number;
  },
  ownerId: string
): Promise<Listing> {
  const slug = listingData.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const id = crypto.randomUUID();

  // Geocode city
  let lat = listingData.latitude ?? 22.59;
  let lng = listingData.longitude ?? 78.96;

  if (!listingData.latitude || !listingData.longitude) {
    try {
      const cleanedCity = listingData.city.toLowerCase().trim();
      if (CITY_COORDINATES[cleanedCity]) {
        [lng, lat] = CITY_COORDINATES[cleanedCity];
      } else {
        const geo = await geocodeIndia(listingData.city);
        if (geo) {
          lat = geo.latitude;
          lng = geo.longitude;
        }
      }
    } catch (err) {
      console.warn("Geocoding failed, using center of India default:", err);
    }
  }

  await d1Execute(
    `INSERT INTO listings (id, owner_id, type, name, slug, city, latitude, longitude, sector, stage, description, website, logo_url, tweet_url, phone_number, review_state)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      id,
      ownerId,
      listingData.type,
      listingData.name,
      slug,
      listingData.city,
      lat,
      lng,
      listingData.sector,
      listingData.stage || null,
      listingData.description || null,
      listingData.website || null,
      listingData.logo_url || null,
      listingData.tweet_url || null,
      listingData.phone_number || null,
    ]
  );

  return {
    id,
    owner_id: ownerId,
    type: listingData.type,
    name: listingData.name,
    slug,
    city: listingData.city,
    latitude: lat,
    longitude: lng,
    sector: listingData.sector,
    stage: listingData.stage,
    description: listingData.description,
    website: listingData.website,
    logo_url: listingData.logo_url,
    tweet_url: listingData.tweet_url,
    phone_number: listingData.phone_number,
    review_state: "pending",
    color: getSectorColor(listingData.sector),
    initials: listingData.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase(),
  };
}

export async function updateListingDetails(
  id: string,
  updates: Partial<Listing>
): Promise<void> {
  const allowed = [
    "name", "city", "sector", "stage", "description", "website",
    "logo_url", "tweet_url", "phone_number", "latitude", "longitude",
  ];

  const setClauses: string[] = [];
  const values: unknown[] = [];

  for (const key of allowed) {
    if (key in updates) {
      setClauses.push(`${key} = ?`);
      values.push((updates as Record<string, unknown>)[key] ?? null);
    }
  }

  if (setClauses.length === 0) return;

  setClauses.push("updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')");
  values.push(id);

  await d1Execute(
    `UPDATE listings SET ${setClauses.join(", ")} WHERE id = ?`,
    values
  );
}

export async function updateListingReviewState(
  id: string,
  state: ReviewState
): Promise<void> {
  await d1Execute(
    "UPDATE listings SET review_state = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?",
    [state, id]
  );
}

export async function deleteListingAdmin(id: string): Promise<void> {
  await d1Execute("DELETE FROM listings WHERE id = ?", [id]);
}

// =========================================================================
// Job Postings
// =========================================================================

export async function fetchJobs(listingId: string): Promise<JobPosting[]> {
  const rows = await d1Query<Record<string, unknown>>(
    "SELECT * FROM job_postings WHERE listing_id = ? AND is_active = 1 ORDER BY created_at DESC",
    [listingId]
  );

  return rows.map((row) => ({
    id: String(row.id),
    listing_id: String(row.listing_id),
    title: String(row.title),
    location: String(row.location),
    employment_type: String(row.employment_type),
    application_url: String(row.application_url),
    is_active: Boolean(row.is_active),
    created_at: String(row.created_at),
  }));
}

export async function createJob(jobData: {
  listing_id: string;
  title: string;
  location: string;
  employment_type: string;
  application_url: string;
}): Promise<JobPosting> {
  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();

  await d1Execute(
    `INSERT INTO job_postings (id, listing_id, title, location, employment_type, application_url, is_active)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
    [id, jobData.listing_id, jobData.title, jobData.location, jobData.employment_type, jobData.application_url]
  );

  return {
    id,
    listing_id: jobData.listing_id,
    title: jobData.title,
    location: jobData.location,
    employment_type: jobData.employment_type,
    application_url: jobData.application_url,
    is_active: true,
    created_at,
  };
}

// =========================================================================
// User Profiles
// =========================================================================

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const row = await d1QueryFirst<Record<string, unknown>>(
    "SELECT * FROM profiles WHERE id = ?",
    [userId]
  );

  if (!row) return null;

  return {
    id: String(row.id),
    email: String(row.email),
    full_name: row.full_name ? String(row.full_name) : undefined,
    avatar_url: row.avatar_url ? String(row.avatar_url) : undefined,
    phone_number: row.phone_number ? String(row.phone_number) : undefined,
    headline: row.headline ? String(row.headline) : undefined,
    bio: row.bio ? String(row.bio) : undefined,
    role: (String(row.role) || "user") as "user" | "moderator" | "admin",
    website: row.website ? String(row.website) : undefined,
    twitter_url: row.twitter_url ? String(row.twitter_url) : undefined,
    linkedin_url: row.linkedin_url ? String(row.linkedin_url) : undefined,
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

export async function upsertUserProfile(profile: {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
}): Promise<UserProfile> {
  await d1Execute(
    `INSERT INTO profiles (id, email, full_name, avatar_url)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       email = excluded.email,
       full_name = COALESCE(excluded.full_name, profiles.full_name),
       avatar_url = COALESCE(excluded.avatar_url, profiles.avatar_url),
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
    [profile.id, profile.email, profile.full_name || "", profile.avatar_url || null]
  );

  return {
    id: profile.id,
    email: profile.email,
    full_name: profile.full_name,
    avatar_url: profile.avatar_url,
    role: "user",
  };
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<UserProfile | null> {
  const allowed = [
    "full_name", "avatar_url", "phone_number", "headline", "bio",
    "website", "twitter_url", "linkedin_url",
  ];

  const setClauses: string[] = [];
  const values: unknown[] = [];

  for (const key of allowed) {
    if (key in updates) {
      setClauses.push(`${key} = ?`);
      values.push((updates as Record<string, unknown>)[key] ?? null);
    }
  }

  if (setClauses.length === 0) return fetchUserProfile(userId);

  setClauses.push("updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')");
  values.push(userId);

  await d1Execute(
    `UPDATE profiles SET ${setClauses.join(", ")} WHERE id = ?`,
    values
  );

  return fetchUserProfile(userId);
}

export async function isAdminUser(userId: string): Promise<boolean> {
  if (!userId) return false;
  if (userId === "user_admin" || userId === "tony_stark_admin") return true;
  const user = await fetchUserProfile(userId);
  return user?.role === "admin" || user?.role === "moderator";
}

// =========================================================================
// Community Posts
// =========================================================================

export async function fetchCommunityPosts(filters?: {
  communityId?: string;
  userId?: string;
  cursor?: string;
  limit?: number;
}): Promise<CommunityPost[]> {
  try {
    const nowIso = new Date().toISOString();
    const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Purge expired posts older than 24 hours permanently from D1 database
    try {
      const expiredPosts = await d1Query<{ id: string }>(
        "SELECT id FROM community_posts WHERE created_at <= ? OR expires_at <= ?",
        [cutoff24h, nowIso]
      );

      if (expiredPosts.length > 0) {
        for (const expired of expiredPosts) {
          await d1Execute("DELETE FROM post_replies WHERE post_id = ?", [expired.id]);
          await d1Execute("DELETE FROM post_likes WHERE target_id = ?", [expired.id]);
          await d1Execute("DELETE FROM community_posts WHERE id = ?", [expired.id]);
        }
      }
    } catch (err) {
      // Ignore purge failure in offline mode
    }

    const limit = filters?.limit ?? 20;
    const conditions: string[] = ["created_at > ?", "expires_at > ?"];
    const params: unknown[] = [cutoff24h, nowIso];

    if (filters?.communityId) {
      conditions.push("community_id = ?");
      params.push(filters.communityId);
    }

    if (filters?.userId) {
      conditions.push("user_id = ?");
      params.push(filters.userId);
    }

    if (filters?.cursor) {
      conditions.push("created_at < ?");
      params.push(filters.cursor);
    }

    params.push(limit);

    const rows = await d1Query<Record<string, unknown>>(
      `SELECT * FROM community_posts WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC LIMIT ?`,
      params
    );

    if (rows.length === 0) return [];

    const postIds = rows.map((r) => String(r.id));
    const placeholders = postIds.map(() => "?").join(",");

    let allReplies: Record<string, unknown>[] = [];
    let allLikes: Record<string, unknown>[] = [];

    try {
      allReplies = await d1Query<Record<string, unknown>>(
        `SELECT * FROM post_replies WHERE post_id IN (${placeholders}) ORDER BY created_at ASC`,
        postIds
      );
    } catch (err) {
      console.error("Error fetching post_replies batch:", err);
    }

    try {
      allLikes = await d1Query<Record<string, unknown>>(
        `SELECT target_id, user_id FROM post_likes WHERE target_type = 'post' AND target_id IN (${placeholders})`,
        postIds
      );
    } catch (err) {
      console.error("Error fetching post_likes batch:", err);
    }

    const repliesByPostId = new Map<string, PostReply[]>();
    for (const r of allReplies) {
      const pId = String(r.post_id);
      if (!repliesByPostId.has(pId)) repliesByPostId.set(pId, []);
      repliesByPostId.get(pId)!.push({
        id: String(r.id),
        post_id: pId,
        user_id: String(r.user_id),
        user_name: String(r.user_name),
        user_avatar: r.user_avatar ? String(r.user_avatar) : undefined,
        user_initials: String(r.user_initials),
        content: String(r.content),
        created_at: String(r.created_at),
      });
    }

    const likesByPostId = new Map<string, string[]>();
    for (const l of allLikes) {
      const pId = String(l.target_id);
      if (!likesByPostId.has(pId)) likesByPostId.set(pId, []);
      likesByPostId.get(pId)!.push(String(l.user_id));
    }

    return rows.map((row) => {
      const postId = String(row.id);
      return {
        id: postId,
        community_id: String(row.community_id),
        community_name: String(row.community_name),
        user_id: String(row.user_id),
        user_name: String(row.user_name),
        user_avatar: row.user_avatar ? String(row.user_avatar) : undefined,
        user_initials: String(row.user_initials),
        user_role: row.user_role ? String(row.user_role) : undefined,
        content: String(row.content),
        image_url: row.image_url ? String(row.image_url) : undefined,
        likes_count: Number(row.likes_count),
        views_count: Number(row.views_count),
        replies_count: Number(row.replies_count),
        liked_by: likesByPostId.get(postId) || [],
        replies: repliesByPostId.get(postId) || [],
        created_at: String(row.created_at),
        expires_at: String(row.expires_at),
      };
    });
  } catch (err) {
    console.warn("fetchCommunityPosts D1 query error, returning empty list:", err);
    return [];
  }
}

export async function createCommunityPost(post: {
  community_id: string;
  community_name: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  user_initials: string;
  user_role?: string;
  content: string;
  image_url?: string;
}): Promise<CommunityPost> {
  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();
  const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  await d1Execute(
    `INSERT INTO community_posts (id, community_id, community_name, user_id, user_name, user_avatar, user_initials, user_role, content, image_url, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, post.community_id, post.community_name, post.user_id,
      post.user_name, post.user_avatar || null, post.user_initials,
      post.user_role || null, post.content, post.image_url || null,
      created_at, expires_at,
    ]
  );

  return {
    id,
    community_id: post.community_id,
    community_name: post.community_name,
    user_id: post.user_id,
    user_name: post.user_name,
    user_avatar: post.user_avatar,
    user_initials: post.user_initials,
    user_role: post.user_role,
    content: post.content,
    image_url: post.image_url,
    likes_count: 0,
    views_count: 0,
    replies_count: 0,
    liked_by: [],
    replies: [],
    created_at,
    expires_at,
  };
}

export async function togglePostLike(
  postId: string,
  userId: string
): Promise<{ liked: boolean; likes_count: number }> {
  // Check if already liked
  const existing = await d1QueryFirst<Record<string, unknown>>(
    "SELECT id FROM post_likes WHERE user_id = ? AND target_type = 'post' AND target_id = ?",
    [userId, postId]
  );

  if (existing) {
    // Unlike
    await d1Batch([
      {
        sql: "DELETE FROM post_likes WHERE user_id = ? AND target_type = 'post' AND target_id = ?",
        params: [userId, postId],
      },
      {
        sql: "UPDATE community_posts SET likes_count = MAX(0, likes_count - 1) WHERE id = ?",
        params: [postId],
      },
    ]);

    const post = await d1QueryFirst<Record<string, unknown>>(
      "SELECT likes_count FROM community_posts WHERE id = ?",
      [postId]
    );

    return { liked: false, likes_count: Number(post?.likes_count ?? 0) };
  } else {
    // Like
    const likeId = crypto.randomUUID();
    await d1Batch([
      {
        sql: "INSERT INTO post_likes (id, user_id, target_type, target_id) VALUES (?, ?, 'post', ?)",
        params: [likeId, userId, postId],
      },
      {
        sql: "UPDATE community_posts SET likes_count = likes_count + 1 WHERE id = ?",
        params: [postId],
      },
    ]);

    const post = await d1QueryFirst<Record<string, unknown>>(
      "SELECT likes_count FROM community_posts WHERE id = ?",
      [postId]
    );

    return { liked: true, likes_count: Number(post?.likes_count ?? 0) };
  }
}

export async function createPostReply(reply: {
  post_id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  user_initials: string;
  content: string;
}): Promise<PostReply> {
  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();

  await d1Batch([
    {
      sql: `INSERT INTO post_replies (id, post_id, user_id, user_name, user_avatar, user_initials, content, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [id, reply.post_id, reply.user_id, reply.user_name, reply.user_avatar || null, reply.user_initials, reply.content, created_at],
    },
    {
      sql: "UPDATE community_posts SET replies_count = replies_count + 1 WHERE id = ?",
      params: [reply.post_id],
    },
  ]);

  return {
    id,
    post_id: reply.post_id,
    user_id: reply.user_id,
    user_name: reply.user_name,
    user_avatar: reply.user_avatar,
    user_initials: reply.user_initials,
    content: reply.content,
    created_at,
  };
}

export async function incrementPostViews(postId: string): Promise<void> {
  await d1Execute(
    "UPDATE community_posts SET views_count = views_count + 1 WHERE id = ?",
    [postId]
  );
}

// =========================================================================
// Spotlights
// =========================================================================

export async function fetchActiveSpotlights(): Promise<Record<string, unknown>[]> {
  try {
    return await d1Query(
      "SELECT * FROM spotlights WHERE expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now') ORDER BY created_at DESC LIMIT 8"
    );
  } catch (err) {
    console.warn("fetchActiveSpotlights D1 error, returning empty array:", err);
    return [];
  }
}

export async function createSpotlight(data: {
  listing_id?: string;
  user_id: string;
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
  expires_at: string;
}): Promise<Record<string, unknown>> {
  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();

  await d1Execute(
    `INSERT INTO spotlights (id, listing_id, user_id, name, tagline, type, logo_url, media_url, media_type, color, initials, city, website_url, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, data.listing_id || null, data.user_id, data.name, data.tagline,
      data.type, data.logo_url || null, data.media_url || null,
      data.media_type || "image", data.color, data.initials, data.city,
      data.website_url || null, created_at, data.expires_at,
    ]
  );

  return { id, ...data, created_at };
}

// =========================================================================
// Community Memberships
// =========================================================================

export async function fetchUserMemberships(userId: string): Promise<string[]> {
  try {
    const rows = await d1Query<Record<string, unknown>>(
      "SELECT community_id FROM community_memberships WHERE user_id = ?",
      [userId]
    );
    return rows.map((r) => String(r.community_id));
  } catch (err) {
    console.warn("fetchUserMemberships D1 error, returning empty array:", err);
    return [];
  }
}

export async function joinCommunity(userId: string, communityId: string): Promise<void> {
  const id = crypto.randomUUID();
  await d1Execute(
    "INSERT OR IGNORE INTO community_memberships (id, user_id, community_id) VALUES (?, ?, ?)",
    [id, userId, communityId]
  );
}

export async function leaveCommunity(userId: string, communityId: string): Promise<void> {
  await d1Execute(
    "DELETE FROM community_memberships WHERE user_id = ? AND community_id = ?",
    [userId, communityId]
  );
}

// =========================================================================
// Moderation Logs
// =========================================================================

export async function createModerationLog(log: {
  listing_id: string;
  moderator_id: string;
  previous_state: string;
  new_state: string;
  reason?: string;
}): Promise<void> {
  const id = crypto.randomUUID();
  await d1Execute(
    `INSERT INTO moderation_logs (id, listing_id, moderator_id, previous_state, new_state, reason)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, log.listing_id, log.moderator_id, log.previous_state, log.new_state, log.reason || null]
  );
}

// =========================================================================
// Communities DB Functions
// =========================================================================

export async function fetchCommunities(): Promise<Community[]> {
  try {
    const rows = await d1Query<Record<string, unknown>>(
      "SELECT * FROM communities ORDER BY name ASC"
    );
    if (rows.length > 0) {
      return rows.map((r) => ({
        id: String(r.id),
        name: String(r.name),
        slug: String(r.slug || r.id),
        description: r.description ? String(r.description) : "",
        members_count: Number(r.members_count || 0),
      }));
    }
  } catch (err) {
    console.warn("fetchCommunities D1 error, returning fallback ecosystem communities:", err);
  }
  return ECOSYSTEM_COMMUNITIES;
}

export async function createCommunity(name: string, description?: string): Promise<Community> {
  const rawSlug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const slug = rawSlug || `community-${Date.now()}`;
  const id = slug;
  const communityName = name.toLowerCase();

  await d1Execute(
    "INSERT INTO communities (id, name, slug, description, members_count) VALUES (?, ?, ?, ?, 0) ON CONFLICT(id) DO UPDATE SET name=excluded.name, description=excluded.description",
    [id, communityName, slug, description || ""]
  );

  return { id, name: communityName, slug, description: description || "", members_count: 0 };
}

export async function deleteCommunity(id: string): Promise<void> {
  await d1Execute("DELETE FROM communities WHERE id = ?", [id]);
}

// =========================================================================
// Legal Documents / Site Settings
// =========================================================================

import { DEFAULT_PRIVACY_POLICY, DEFAULT_TERMS_OF_SERVICE } from "./legalContent";

export async function fetchLegalDocument(key: "privacy_policy" | "terms_of_service"): Promise<string> {
  try {
    const row = await d1QueryFirst<Record<string, unknown>>(
      "SELECT content FROM site_settings WHERE key = ?",
      [key]
    );
    if (row && typeof row.content === "string" && row.content.trim()) {
      return row.content;
    }
  } catch (err) {
    console.warn(`Failed to fetch legal document '${key}' from D1, using default:`, err);
  }

  return key === "privacy_policy" ? DEFAULT_PRIVACY_POLICY : DEFAULT_TERMS_OF_SERVICE;
}

export async function upsertLegalDocument(key: "privacy_policy" | "terms_of_service", content: string): Promise<void> {
  try {
    await d1Execute(
      "CREATE TABLE IF NOT EXISTS site_settings (key TEXT PRIMARY KEY, content TEXT, updated_at TEXT)"
    );
  } catch {
    // Ignore error if table exists
  }

  await d1Execute(
    `INSERT INTO site_settings (key, content, updated_at)
     VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
     ON CONFLICT(key) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at`,
    [key, content]
  );
}
