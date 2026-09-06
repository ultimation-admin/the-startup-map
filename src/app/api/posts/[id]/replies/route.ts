import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createPostReply, fetchUserListings } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    return NextResponse.json({ message: "Replies are included in post data" });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const userListings = await fetchUserListings(user.id);
    if (userListings.length === 0) {
      return NextResponse.json(
        {
          error: "NO_PROFILE_CREATED",
          message: "You must create a profile (as People or Startup) on the map before replying!",
        },
        { status: 403 }
      );
    }

    const activeProfile = userListings[0];
    const isPerson = activeProfile.type === "person" || activeProfile.type.toLowerCase().includes("person") || activeProfile.type.toLowerCase().includes("people");
    const rawSlug = activeProfile.slug || activeProfile.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const userName = (isPerson ? `p/${rawSlug}` : `s/${rawSlug}`).toLowerCase();
    const userInitials = activeProfile.name.substring(0, 2).toUpperCase();
    const userAvatar = activeProfile.logo_url || user.imageUrl || undefined;

    const reply = await createPostReply({
      post_id: id,
      user_id: user.id,
      user_name: userName,
      user_avatar: userAvatar,
      user_initials: userInitials,
      content,
    });

    return NextResponse.json({ reply }, { status: 201 });
  } catch (error) {
    console.error("POST /api/posts/[id]/replies error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
