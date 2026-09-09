import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { updateListingDetails, deleteListingAdmin, fetchListingById } from "@/lib/db";
import { isAuthorizedAdmin } from "@/lib/adminAuth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const listing = await fetchListingById(id);
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const isOwner = listing.owner_id === user.id;
    const isAdmin = await isAuthorizedAdmin(req);
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden: Not listing owner or admin" }, { status: 403 });
    }

    const updates = await req.json();
    const updated = await updateListingDetails(id, updates);
    return NextResponse.json({ listing: updated });
  } catch (error) {
    console.error("PATCH /api/listings/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const listing = await fetchListingById(id);
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const isOwner = listing.owner_id === user.id;
    const isAdmin = await isAuthorizedAdmin(req);
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden: Not listing owner or admin" }, { status: 403 });
    }

    await deleteListingAdmin(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/listings/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
