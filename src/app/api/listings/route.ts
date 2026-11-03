export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { fetchListings, fetchUserListings, createListing, upsertUserProfile, isAdminUser } from "@/lib/db";
import { maskPhoneNumber } from "@/lib/security";
import { rateLimitRequest } from "@/lib/requestRateLimit";
import { getEdgeCachedResponse, storeEdgeCachedResponse } from "@/lib/edgeResponseCache";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ownerId = searchParams.get("owner_id") || searchParams.get("ownerId") || searchParams.get("user_id") || searchParams.get("userId") || undefined;
    const city = searchParams.get("city") || undefined;
    const type = searchParams.get("type") || undefined;
    const sector = searchParams.get("sector") || undefined;
    const stage = searchParams.get("stage") || undefined;
    const role = searchParams.get("role") || undefined;
    const vcStage = searchParams.get("vc_stage") || undefined;
    const vcType = searchParams.get("vc_type") || undefined;
    const query = searchParams.get("q") || undefined;
    const cursor = searchParams.get("cursor") || undefined;
    const requestedLimit = Number.parseInt(searchParams.get("limit") || "250", 10);
    const limit = Number.isFinite(requestedLimit) ? Math.min(500, Math.max(1, requestedLimit)) : 250;

    let userId: string | null = null;
    try {
      const authObj = await auth();
      userId = authObj.userId;
    } catch {}

    const rateLimitResponse = await rateLimitRequest(req, "PUBLIC_READ_LIMITER", "listings", userId || undefined);
    if (rateLimitResponse) return rateLimitResponse;

    const isPublicRequest = !ownerId && !userId;
    if (isPublicRequest) {
      const cachedResponse = await getEdgeCachedResponse(req, "public-listings-v1");
      if (cachedResponse) return cachedResponse;
    }

    const isAdmin = userId ? await isAdminUser(userId) : false;
    const listingPage = ownerId
      ? { listings: await fetchUserListings(ownerId), hasMore: false, nextCursor: null }
      : await fetchListings({ city, type, sector, stage, role, vcStage, vcType, query, cursor, limit });
    const listings = listingPage.listings;

    const sanitizedListings = listings.map((l) => {
      const isOwner = Boolean(userId && userId === l.owner_id);
      if (isOwner || isAdmin || !l.phone_number) {
        return l;
      }
      return {
        ...l,
        phone_number: maskPhoneNumber(l.phone_number),
      };
    });

    const response = NextResponse.json(
      {
        listings: sanitizedListings,
        has_more: listingPage.hasMore,
        next_cursor: listingPage.nextCursor,
      },
      {
        headers: {
      "Cache-Control": ownerId || userId || isAdmin
        ? "private, no-store"
        : "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
    if (isPublicRequest) {
      await storeEdgeCachedResponse(req, "public-listings-v1", response, 60);
    }
    return response;

  } catch (error) {
    console.error("GET /api/listings error:", error);
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
    const { name, type, city, sector, website, description, stage, logo_url, tweet_url, phone_number, latitude, longitude } = body;

    if (!name || !type || !city || !sector) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const userEmail = user.emailAddresses?.[0]?.emailAddress || "";
    await upsertUserProfile({
      id: user.id,
      email: userEmail,
      full_name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || undefined,
      avatar_url: user.imageUrl || undefined,
    });

    // Enforce 1 Email = 1 Profile rule: Check if user already has an active profile
    const existingListings = await fetchUserListings(user.id);
    if (existingListings && existingListings.length > 0) {
      return NextResponse.json(
        { error: "A profile already exists for this email account.", listing: existingListings[0] },
        { status: 400 }
      );
    }

    const listing = await createListing(
      {
        name,
        type,
        city,
        sector,
        website,
        description,
        stage,
        logo_url,
        tweet_url,
        phone_number,
        latitude,
        longitude,
      },
      user.id
    );

    return NextResponse.json({ listing }, { status: 201 });
  } catch (error) {
    console.error("POST /api/listings error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
