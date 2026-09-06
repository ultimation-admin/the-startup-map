import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { upsertUserProfile, fetchUserListings, createListing } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let email = "";
    let fullName = `User_${userId.slice(-4)}`;
    let avatarUrl: string | undefined = undefined;

    try {
      const user = await currentUser();
      if (user) {
        email = user.emailAddresses?.[0]?.emailAddress || "";
        fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username || fullName;
        avatarUrl = user.imageUrl || undefined;
      }
    } catch (e) {
      console.warn("currentUser() failed, proceeding with auth userId:", e);
    }

    // 1. Sync User Profile in D1
    const profile = await upsertUserProfile({
      id: userId,
      email,
      full_name: fullName,
      avatar_url: avatarUrl,
    });

    // 2. Fetch User Listings (Profiles manually created by user)
    const userListings = await fetchUserListings(userId);

    return NextResponse.json({
      success: true,
      profile,
      listings: userListings,
    });
  } catch (error: unknown) {
    console.error("POST /api/profile/sync error:", error);
    return NextResponse.json({ error: "Failed to sync user profile" }, { status: 500 });
  }
}
