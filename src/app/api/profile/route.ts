import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { fetchUserProfile, upsertUserProfile, updateUserProfile, isAdminUser } from "@/lib/db";
import { maskEmail, maskPhoneNumber } from "@/lib/security";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get("user_id");

    if (!user_id) {
      return NextResponse.json({ error: "user_id is required" }, { status: 400 });
    }

    const profile = await fetchUserProfile(user_id);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const { userId } = await auth();
    const isSelf = Boolean(userId && userId === user_id);
    const isAdmin = userId ? await isAdminUser(userId) : false;

    const sanitizedProfile = (isSelf || isAdmin)
      ? profile
      : {
          ...profile,
          email: maskEmail(profile.email),
          phone_number: profile.phone_number ? maskPhoneNumber(profile.phone_number) : undefined,
        };

    return NextResponse.json({ profile: sanitizedProfile });
  } catch (error) {
    console.error("GET /api/profile error:", error);
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
    const { full_name, avatar_url } = body;

    const userEmail = user.emailAddresses?.[0]?.emailAddress || "";
    const profile = await upsertUserProfile({
      id: user.id,
      email: userEmail,
      full_name,
      avatar_url,
    });

    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    console.error("POST /api/profile error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const updates = body;

    const profile = await updateUserProfile(userId, updates);

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("PATCH /api/profile error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
