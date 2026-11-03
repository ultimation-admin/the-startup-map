import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { createPostReply, deletePostReply, fetchUserListings, notifyPostOwner, upsertUserProfile } from "@/lib/db";
import { d1Query, d1QueryFirst } from "@/lib/d1";
import { getPublicMediaUrl } from "@/lib/r2";
import { rateLimitRequest } from "@/lib/requestRateLimit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rateLimitResponse = await rateLimitRequest(req, "PUBLIC_READ_LIMITER", "post-replies");
    if (rateLimitResponse) return rateLimitResponse;

    const { id } = await params;
    const { userId } = await auth();
    if (!id || id.length > 128) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    const post = await d1QueryFirst<{ id: string }>("SELECT id FROM community_posts WHERE id = ? LIMIT 1", [id]);
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    const requestedLimit = Number.parseInt(req.nextUrl.searchParams.get("limit") || "50", 10);
    const pageSize = Number.isFinite(requestedLimit) ? Math.min(50, Math.max(1, requestedLimit)) : 50;
    const rawCursor = req.nextUrl.searchParams.get("cursor");
    const separator = rawCursor?.indexOf("|") ?? -1;
    const cursorDate = separator > 0 ? rawCursor!.slice(0, separator) : "";
    const cursorId = separator > 0 ? rawCursor!.slice(separator + 1).slice(0, 100) : "";
    const hasCursor = Boolean(cursorDate && cursorId && Number.isFinite(Date.parse(cursorDate)));
    const rows = hasCursor
      ? await d1Query<Record<string, unknown>>(
          `SELECT id, post_id, user_id, user_name, user_avatar, user_initials, content, created_at, parent_reply_id, reply_to_user,
            (SELECT COUNT(*) FROM post_likes likes WHERE likes.target_type = 'reply' AND likes.target_id = post_replies.id) AS upvotes_count,
            EXISTS (SELECT 1 FROM post_likes liked WHERE liked.target_type = 'reply' AND liked.target_id = post_replies.id AND liked.user_id = ?) AS viewer_liked
          FROM post_replies WHERE post_id = ? AND (created_at > ? OR (created_at = ? AND id > ?)) ORDER BY created_at ASC, id ASC LIMIT ?`,
          [userId || "", id, cursorDate, cursorDate, cursorId, pageSize + 1]
        )
      : await d1Query<Record<string, unknown>>(
          `SELECT id, post_id, user_id, user_name, user_avatar, user_initials, content, created_at, parent_reply_id, reply_to_user,
            (SELECT COUNT(*) FROM post_likes likes WHERE likes.target_type = 'reply' AND likes.target_id = post_replies.id) AS upvotes_count,
            EXISTS (SELECT 1 FROM post_likes liked WHERE liked.target_type = 'reply' AND liked.target_id = post_replies.id AND liked.user_id = ?) AS viewer_liked
          FROM post_replies WHERE post_id = ? ORDER BY created_at ASC, id ASC LIMIT ?`,
          [userId || "", id, pageSize + 1]
        );
    const replies = rows.slice(0, pageSize).map((row) => ({
      id: String(row.id),
      post_id: String(row.post_id),
      user_id: String(row.user_id),
      user_name: String(row.user_name),
      user_avatar: row.user_avatar ? (getPublicMediaUrl(String(row.user_avatar)) || undefined) : undefined,
      user_initials: String(row.user_initials || ""),
      content: String(row.content),
      created_at: String(row.created_at),
      parent_reply_id: row.parent_reply_id ? String(row.parent_reply_id) : undefined,
      reply_to_user: row.reply_to_user ? String(row.reply_to_user) : undefined,
      upvotes_count: Number(row.upvotes_count || 0),
      viewer_liked: row.viewer_liked === true || Number(row.viewer_liked) === 1,
    }));
    const last = replies[replies.length - 1];
    return NextResponse.json({
      replies,
      has_more: rows.length > pageSize,
      next_cursor: rows.length > pageSize && last ? `${last.created_at}|${last.id}` : null,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
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

    if (cleanParentReplyId) {
      const parentReply = await d1QueryFirst<{ id: string; post_id: string }>(
        "SELECT id, post_id FROM post_replies WHERE id = ? LIMIT 1",
        [cleanParentReplyId]
      );
      if (!parentReply || parentReply.post_id !== id) {
        return NextResponse.json({ error: "The reply target is no longer available." }, { status: 400 });
      }
    }

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
