import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createPostReply, deletePostReply, fetchUserListings, notifyPostOwner, upsertUserProfile } from "@/lib/db";

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
    const { content, parent_reply_id, reply_to_user } = body;

    const trimmedContent = typeof content === "string" ? content.trim() : "";
    if (!trimmedContent) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    // Ensure user profile exists in profiles table
    const userEmail = user.emailAddresses?.[0]?.emailAddress || "";
    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || undefined;
    await upsertUserProfile({
      id: user.id,
      email: userEmail,
      full_name: fullName,
      avatar_url: user.imageUrl || undefined,
    });

    const userListings = await fetchUserListings(user.id);
    let userName = "";
    let userInitials = "FO";
    let userAvatar = user.imageUrl || undefined;

    if (userListings.length > 0) {
      const activeProfile = userListings[0];
      const isPerson =
        activeProfile.type === "person" ||
        activeProfile.type.toLowerCase().includes("person") ||
        activeProfile.type.toLowerCase().includes("people");
      const rawSlug =
        activeProfile.slug ||
        activeProfile.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      userName = (isPerson ? `p/${rawSlug}` : `s/${rawSlug}`).toLowerCase();
      userInitials = (activeProfile.name.substring(0, 2) || "FO").toUpperCase();
      userAvatar = activeProfile.logo_url || userAvatar;
    } else {
      // Graceful fallback for authenticated users who haven't created a map listing yet
      const fallbackName = fullName || user.username || "founder";
      const rawSlug = (user.username || user.firstName || "founder")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      userName = `p/${rawSlug || "founder"}`;
      userInitials = (fallbackName.substring(0, 2) || "FO").toUpperCase();
    }

    const cleanParentReplyId =
      parent_reply_id && String(parent_reply_id).trim() !== "" && String(parent_reply_id).trim() !== "null" && String(parent_reply_id).trim() !== "undefined"
        ? String(parent_reply_id).trim()
        : undefined;

    const cleanReplyToUser =
      reply_to_user && String(reply_to_user).trim() !== "" && String(reply_to_user).trim() !== "null" && String(reply_to_user).trim() !== "undefined"
        ? String(reply_to_user).trim().replace(/^@/, "")
        : undefined;

    const reply = await createPostReply({
      post_id: id,
      user_id: user.id,
      user_name: userName,
      user_avatar: userAvatar,
      user_initials: userInitials,
      content: trimmedContent,
      parent_reply_id: cleanParentReplyId,
      reply_to_user: cleanReplyToUser,
    });

    await notifyPostOwner(id, user.id, userName, userAvatar, "reply");
    return NextResponse.json({ reply }, { status: 201 });
  } catch (error) {
    console.error("POST /api/posts/[id]/replies error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: postId } = await params;
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const replyId = searchParams.get("replyId");
    if (!replyId) {
      return NextResponse.json({ error: "replyId is required" }, { status: 400 });
    }

    const success = await deletePostReply(replyId, user.id);
    if (!success) {
      return NextResponse.json({ error: "Could not delete reply or unauthorized" }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/posts/[id]/replies error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
