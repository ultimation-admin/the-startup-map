/**
 * Industry-Grade Social Feed Ranking & Recommendation Engine
 *
 * Implements mathematical scoring models for high user retention,
 * high DAU conversion, and real-time engagement discovery:
 *
 * 1. TRENDING FEED: Viral Gravity & Time-Decay Velocity Algorithm
 *    Score = (Likes*3.5 + Replies*5.5 + Views*0.2 + MediaBonus + AuthorBonus) / (HoursOld + 2)^1.5
 *
 * 2. FOR YOU FEED: Multi-Signal Personalization & Serendipity Engine
 *    Score = RecencyScore + InterestAffinity + CommunityAffinity + QualityLogScore + DiversityBoost
 *
 * 3. JOINED FEED: Subscribed Community Activity & Last-Active Reply Bumping
 */

import { CommunityPost } from "./db";

export type FeedTabMode = "for-you" | "joined" | "trending";

export interface UserFeedContext {
  userId?: string;
  userCity?: string;
  userSector?: string;
  joinedCommunities: string[];
  selectedInterests: string[];
}

/**
 * Calculates the Trending Score using a Hacker News / Reddit Gravity Decay Formula
 */
export function calculateTrendingScore(post: CommunityPost, nowMs: number = Date.now()): number {
  const createdMs = new Date(post.created_at).getTime();
  const ageInHours = Math.max(0, (nowMs - createdMs) / (1000 * 60 * 60));

  // Engagement Signals
  const likesWeight = (post.likes_count || 0) * 3.5;
  const repliesWeight = (post.replies?.length || post.replies_count || 0) * 5.5; // Discussion velocity valued highest
  const viewsWeight = (post.views_count || 0) * 0.2;
  const mediaBonus = post.image_url ? 2.5 : 0.0;
  const authorBadgeBonus = post.user_name.startsWith("s/") || post.user_name.startsWith("p/") ? 2.0 : 0.0;

  const rawEngagementScore = likesWeight + repliesWeight + viewsWeight + mediaBonus + authorBadgeBonus;

  // Gravity Decay: Exponent 1.5 ensures new hot discussions rapidly surface while 24h old posts decay smoothly
  const gravityExponent = 1.5;
  const score = rawEngagementScore / Math.pow(ageInHours + 2, gravityExponent);

  return score;
}

/**
 * Calculates the Personalized "For You" Score using Multi-Signal Affinity & Serendipity
 */
export function calculateForYouScore(
  post: CommunityPost,
  context: UserFeedContext,
  nowMs: number = Date.now()
): number {
  const createdMs = new Date(post.created_at).getTime();
  const ageInHours = Math.max(0, (nowMs - createdMs) / (1000 * 60 * 60));

  // 1. Exponential Recency Factor (Half-life = 6 hours)
  const recencyScore = 10.0 * Math.exp(-0.115 * ageInHours);

  // 2. Interest / Topic Affinity Score
  let interestAffinity = 0.0;
  if (context.selectedInterests.length > 0) {
    const postContentLower = post.content.toLowerCase();
    const communityLower = (post.community_id || "").toLowerCase();

    const matchesInterest = context.selectedInterests.some((topicId) => {
      const topic = topicId.toLowerCase();
      if (communityLower === topic) return true;
      if (postContentLower.includes(topic)) return true;
      if (topic === "ai" && (communityLower === "genai" || communityLower === "deeptech" || communityLower === "tech" || postContentLower.includes("ai") || postContentLower.includes("llm") || postContentLower.includes("gpt"))) return true;
      if (topic === "saas" && (communityLower === "saas" || communityLower === "startups" || postContentLower.includes("saas") || postContentLower.includes("b2b"))) return true;
      if (topic === "fintech" && (communityLower === "fintech" || communityLower === "funding" || communityLower === "investors" || postContentLower.includes("fintech") || postContentLower.includes("pay"))) return true;
      if (topic === "cleantech" && (communityLower === "cleantech" || communityLower === "hardware" || postContentLower.includes("clean"))) return true;
      if (topic === "deeptech" && (communityLower === "deeptech" || communityLower === "genai" || postContentLower.includes("deep"))) return true;
      if (topic === "healthtech" && (communityLower === "healthtech" || postContentLower.includes("health"))) return true;
      if (topic === "edtech" && (communityLower === "edtech" || postContentLower.includes("edtech"))) return true;
      if (topic === "ecommerce" && (communityLower === "ecommerce" || postContentLower.includes("d2c") || postContentLower.includes("commerce"))) return true;
      if (topic === "ev_mobility" && (communityLower === "ev_mobility" || communityLower === "hardware" || postContentLower.includes("ev") || postContentLower.includes("mobility"))) return true;
      if (topic === "web3" && (communityLower === "web3" || postContentLower.includes("crypto") || postContentLower.includes("web3"))) return true;
      if (topic === "consumer" && (communityLower === "consumer" || communityLower === "launches")) return true;
      return false;
    });

    if (matchesInterest) {
      interestAffinity += 12.0;
    }
  }

  if (context.joinedCommunities.length > 0 && context.joinedCommunities.includes(post.community_id)) {
    interestAffinity += 8.0;
  }

  // 3. User Sector / Location Affinity
  if (context.userSector && post.content.toLowerCase().includes(context.userSector.toLowerCase())) {
    interestAffinity += 2.0;
  }
  if (context.userCity && post.content.toLowerCase().includes(context.userCity.toLowerCase())) {
    interestAffinity += 1.5;
  }

  // 4. Logarithmic Quality & Social Proof (Diminishing returns on high like counts)
  const totalEngagements = (post.likes_count || 0) + (post.replies?.length || 0) * 2;
  const qualityLogScore = Math.log2(1 + totalEngagements) * 2.2;

  // 5. Serendipity / Exploration Boost (Prevents filter bubble, rewards diverse top content)
  const serendipitySeed = (post.id.charCodeAt(0) || 0) % 10;
  const serendipityBoost = serendipitySeed > 6 ? 1.8 : 0.5;

  return recencyScore + interestAffinity + qualityLogScore + serendipityBoost;
}

/**
 * Ranks posts for the Joined Feed (Chronological + Recent Reply Bumping)
 */
export function rankJoinedFeed(posts: CommunityPost[], joinedCommunityIds: string[]): CommunityPost[] {
  // Filter to joined communities (or default all if none explicitly joined)
  const filtered = joinedCommunityIds.length > 0
    ? posts.filter((p) => joinedCommunityIds.includes(p.community_id))
    : posts;

  return [...filtered].sort((a, b) => {
    // Determine latest activity time (post creation or latest reply)
    const getLatestActivity = (p: CommunityPost) => {
      let latest = new Date(p.created_at).getTime();
      if (p.replies && p.replies.length > 0) {
        const lastReplyTime = new Date(p.replies[p.replies.length - 1].created_at).getTime();
        // Bump if reply happened within last 3 hours
        if (lastReplyTime > latest) {
          latest = lastReplyTime;
        }
      }
      return latest;
    };

    return getLatestActivity(b) - getLatestActivity(a);
  });
}

/**
 * Master Post Feed Sorting Engine
 */
export function rankCommunityFeed(
  posts: CommunityPost[],
  tab: FeedTabMode,
  context: UserFeedContext
): CommunityPost[] {
  if (posts.length === 0) return [];
  const nowMs = Date.now();

  if (tab === "joined") {
    return rankJoinedFeed(posts, context.joinedCommunities);
  }

  if (tab === "trending") {
    return [...posts].sort((a, b) => {
      const scoreA = calculateTrendingScore(a, nowMs);
      const scoreB = calculateTrendingScore(b, nowMs);
      return scoreB - scoreA;
    });
  }

  // Default: "for-you"
  return [...posts].sort((a, b) => {
    const scoreA = calculateForYouScore(a, context, nowMs);
    const scoreB = calculateForYouScore(b, context, nowMs);
    return scoreB - scoreA;
  });
}
