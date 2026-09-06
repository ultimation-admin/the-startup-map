import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchActiveSpotlights, createSpotlight } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const spotlights = await fetchActiveSpotlights();
    return NextResponse.json(
      { spotlights },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
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
