export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { fetchListings, fetchUserListings, createListing, upsertUserProfile, isAdminUser } from "@/lib/db";
import { maskPhoneNumber } from "@/lib/security";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ownerId = searchParams.get("owner_id") || searchParams.get("ownerId") || searchParams.get("user_id") || searchParams.get("userId") || undefined;
    const city = searchParams.get("city") || undefined;
    const type = searchParams.get("type") || undefined;
    const sector = searchParams.get("sector") || undefined;
    const stage = searchParams.get("stage") || undefined;

    let listings = ownerId ? await fetchUserListings(ownerId) : await fetchListings();
    if (city) {
      listings = listings.filter((l) => l.city.toLowerCase() === city.toLowerCase());
    }
    if (type) {
      listings = listings.filter((l) => l.type === type);
    }
    if (sector) {
      listings = listings.filter((l) => l.sector.toLowerCase() === sector.toLowerCase());
    }
    if (stage) {
      listings = listings.filter((l) => l.stage?.toLowerCase() === stage.toLowerCase());
    }

    let userId: string | null = null;
    try {
      const authObj = await auth();
      userId = authObj.userId;
    } catch {}

    const isAdmin = userId ? await isAdminUser(userId) : false;

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

    return NextResponse.json(
      { listings: sanitizedListings },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );

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
