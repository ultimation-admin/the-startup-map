export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchActiveSpotlights, createSpotlight, fetchListingById } from "@/lib/db";
import { isAuthorizedAdmin } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  try {
    const spotlights = await fetchActiveSpotlights();
    return NextResponse.json(
      { spotlights },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("GET /api/spotlights error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { listing_id, name, tagline, type, logo_url, media_url, media_type, color, initials, city, website_url, expires_at } = body;

    if (!name || !tagline || !type || !color || !initials || !city) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (listing_id) {
      const listing = await fetchListingById(listing_id);
      if (!listing) {
        return NextResponse.json({ error: "Listing not found" }, { status: 404 });
      }
      const isOwner = listing.owner_id === userId;
      const isAdmin = await isAuthorizedAdmin(req);
      if (!isOwner && !isAdmin) {
        return NextResponse.json({ error: "Forbidden: Not listing owner or admin" }, { status: 403 });
      }
    }

    const spotlight = await createSpotlight({
      listing_id,
      user_id: userId,
      name,
      tagline,
      type,
      logo_url,
      media_url,
      media_type,
      color,
      initials,
      city,
      website_url,
      expires_at: expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    return NextResponse.json({ spotlight }, { status: 201 });
  } catch (error) {
    console.error("POST /api/spotlights error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
