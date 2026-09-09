export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { fetchJobs, createJob, fetchListingById } from "@/lib/db";
import { isAuthorizedAdmin } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const listing_id = searchParams.get("listing_id");

    if (!listing_id) {
      return NextResponse.json({ error: "listing_id is required" }, { status: 400 });
    }

    const jobs = await fetchJobs(listing_id);
    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("GET /api/jobs error:", error);
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
    const { listing_id, title, location, employment_type, application_url } = body;

    if (!listing_id || !title || !location || !employment_type || !application_url) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const listing = await fetchListingById(listing_id);
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const isOwner = listing.owner_id === user.id;
    const isAdmin = await isAuthorizedAdmin(req);
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden: Not listing owner or admin" }, { status: 403 });
    }

    const job = await createJob({
      listing_id,
      title,
      location,
      employment_type,
      application_url,
    });

    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    console.error("POST /api/jobs error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
