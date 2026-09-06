import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchListingBySlug, isAdminUser } from "@/lib/db";
import { maskPhoneNumber } from "@/lib/security";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "startup";
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json({ error: "Slug parameter is required" }, { status: 400 });
    }

    const listing = await fetchListingBySlug(type, slug);
    if (!listing) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const { userId } = await auth();
    const isAdmin = userId ? await isAdminUser(userId) : false;
    const isOwner = Boolean(userId && userId === listing.owner_id);

    const sanitizedListing = (isOwner || isAdmin || !listing.phone_number)
      ? listing
      : { ...listing, phone_number: maskPhoneNumber(listing.phone_number) };

    return NextResponse.json({ listing: sanitizedListing });

  } catch (error) {
    console.error("GET /api/listings/slug error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
