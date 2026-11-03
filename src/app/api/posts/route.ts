export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { fetchCommunityPosts, createCommunityPost, upsertUserProfile, fetchUserListings } from "@/lib/db";
import { rankCommunityFeed, FeedTabMode } from "@/lib/feedAlgorithm";
import { rateLimitRequest } from "@/lib/requestRateLimit";
import { getEdgeCachedResponse, storeEdgeCachedResponse } from "@/lib/edgeResponseCache";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    const rateLimitResponse = await rateLimitRequest(req, "PUBLIC_READ_LIMITER", "posts", userId || undefined);
    if (rateLimitResponse) return rateLimitResponse;
    const isPublicRequest = !userId;
    if (isPublicRequest) {
      const cachedResponse = await getEdgeCachedResponse(req, "public-posts-v1");
      if (cachedResponse) return cachedResponse;
    }

    const { searchParams } = new URL(req.url);
    const communityId = searchParams.get("community_id") || searchParams.get("communityId") || undefined;
    const cursor = searchParams.get("cursor") || undefined;
    const requestedLimit = Number.parseInt(searchParams.get("limit") || "20", 10);
    // Keep public feed requests bounded even when callers provide a negative or
    // unusually large limit (SQLite treats negative LIMIT values as unlimited).
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(50, Math.max(1, requestedLimit))
      : 20;
    const tab = (searchParams.get("tab") as FeedTabMode) || undefined;
    const userCity = searchParams.get("city") || undefined;
    const userSector = searchParams.get("sector") || undefined;
    const joined = searchParams.get("joined") ? searchParams.get("joined")!.split(",") : [];
    const interests = searchParams.get("interests") ? searchParams.get("interests")!.split(",") : [];
    let posts = await fetchCommunityPosts({ communityId, cursor, limit, viewerId: userId || undefined });

    if (tab) {
      posts = rankCommunityFeed(posts, tab, {
        userCity,
        userSector,
        joinedCommunities: joined,
        selectedInterests: interests,
      });
    }

    const response = NextResponse.json(
      { posts },
      {
        headers: {
          "Cache-Control": isPublicRequest
            ? "public, max-age=0, s-maxage=10, stale-while-revalidate=30"
            : "private, no-store",
        },
      }
    );
    if (isPublicRequest) {
      await storeEdgeCachedResponse(req, "public-posts-v1", response, 10);
    }
    return response;
  } catch (error) {
    console.error("GET /api/posts error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { community_id, community_name, content, image_url } = body;

    if (!community_id || !content || !community_name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const userEmail = user.emailAddresses?.[0]?.emailAddress || "";
    await upsertUserProfile({
      id: user.id,
      email: userEmail,
      full_name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || undefined,
      avatar_url: user.imageUrl || undefined,
    });

    const userListings = await fetchUserListings(user.id);
    if (userListings.length === 0) {
      return NextResponse.json(
        {
          error: "NO_PROFILE_CREATED",
          message: "You must create a profile (as People or Startup) on the map before posting in the community feed!",
        },
        { status: 403 }
      );
    }

    const activeProfile = userListings[0];
    const isPerson = activeProfile.type === "person" || activeProfile.type.toLowerCase().includes("person") || activeProfile.type.toLowerCase().includes("people");
    const rawSlug = activeProfile.slug || activeProfile.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const userName = (isPerson ? `p/${rawSlug}` : `s/${rawSlug}`).toLowerCase();
    const userInitials = activeProfile.name.substring(0, 2).toUpperCase();
    const userAvatar = activeProfile.logo_url || user.imageUrl || undefined;

    const post = await createCommunityPost({
      user_id: user.id,
      user_name: userName,
      user_avatar: userAvatar,
      user_initials: userInitials,
      community_id,
      community_name,
      content,
      image_url: image_url || undefined,
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error("POST /api/posts error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
