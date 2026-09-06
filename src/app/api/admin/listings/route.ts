import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchAllListingsAdmin, updateListingReviewState, createModerationLog, isAdminUser } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId || !(await isAdminUser(userId))) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const listings = await fetchAllListingsAdmin();
    return NextResponse.json({ listings });
  } catch (error) {
    console.error("GET /api/admin/listings error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId || !(await isAdminUser(userId))) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { id, state, moderator_id, previous_state, reason } = body;

    if (!id || !state) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await updateListingReviewState(id, state);
    await createModerationLog({
      listing_id: id,
      moderator_id: moderator_id || userId,
      previous_state: previous_state || "pending",
      new_state: state,
      reason: reason || `Status changed to ${state}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/admin/listings error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
