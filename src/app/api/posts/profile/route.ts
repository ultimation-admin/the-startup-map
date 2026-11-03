import { NextRequest, NextResponse } from "next/server";
import { d1Query } from "@/lib/d1";
import { rateLimitRequest } from "@/lib/requestRateLimit";

const PAGE_SIZE = 25;

function readCursor(value: string | null): { createdAt: string; id: string } | null {
  if (!value) return null;
  const separator = value.indexOf("|");
  if (separator < 1) return null;
  const createdAt = value.slice(0, separator);
  const id = value.slice(separator + 1).slice(0, 100);
  if (!id || !Number.isFinite(Date.parse(createdAt))) return null;
  return { createdAt, id };
}

function nextCursor(rows: Array<Record<string, unknown>>): string | null {
  if (rows.length <= PAGE_SIZE) return null;
  const last = rows[PAGE_SIZE - 1];
  return `${String(last.created_at)}|${String(last.id)}`;
}

export async function GET(req: NextRequest) {
  try {
    const rateLimitResponse = await rateLimitRequest(req, "PUBLIC_READ_LIMITER", "profile-posts");
    if (rateLimitResponse) return rateLimitResponse;

    const { searchParams } = new URL(req.url);
    const ownerId = (searchParams.get("owner_id") || "").trim().slice(0, 128);
    if (!ownerId) {
      return NextResponse.json({ error: "Profile owner is required." }, { status: 400 });
    }

    const postsCursor = readCursor(searchParams.get("posts_cursor"));
    const repliesCursor = readCursor(searchParams.get("replies_cursor"));
    const postsWhere = postsCursor
      ? "user_id = ? AND (created_at < ? OR (created_at = ? AND id < ?))"
      : "user_id = ?";
    const postsParams: unknown[] = postsCursor
      ? [ownerId, postsCursor.createdAt, postsCursor.createdAt, postsCursor.id, PAGE_SIZE + 1]
      : [ownerId, PAGE_SIZE + 1];
    const repliesWhere = repliesCursor
      ? "user_id = ? AND (created_at < ? OR (created_at = ? AND id < ?))"
      : "user_id = ?";
    const repliesParams: unknown[] = repliesCursor
      ? [ownerId, repliesCursor.createdAt, repliesCursor.createdAt, repliesCursor.id, PAGE_SIZE + 1]
      : [ownerId, PAGE_SIZE + 1];

    const [postRows, replyRows] = await Promise.all([
      d1Query<Record<string, unknown>>(
        `SELECT * FROM community_posts WHERE ${postsWhere} ORDER BY created_at DESC, id DESC LIMIT ?`,
        postsParams
      ),
      d1Query<Record<string, unknown>>(
        `SELECT id, post_id AS postId, content, created_at FROM post_replies WHERE ${repliesWhere} ORDER BY created_at DESC, id DESC LIMIT ?`,
        repliesParams
      ),
    ]);

    const posts = postRows.slice(0, PAGE_SIZE).map((post) => ({
      ...post,
      liked_by: typeof post.liked_by === "string" ? JSON.parse(post.liked_by || "[]") : (post.liked_by || []),
      replies: typeof post.replies === "string" ? JSON.parse(post.replies || "[]") : (post.replies || []),
    }));
    const replies = replyRows.slice(0, PAGE_SIZE);

    return NextResponse.json(
      {
        posts,
        replies,
        has_more_posts: postRows.length > PAGE_SIZE,
        has_more_replies: replyRows.length > PAGE_SIZE,
        next_posts_cursor: nextCursor(postRows),
        next_replies_cursor: nextCursor(replyRows),
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("GET /api/posts/profile error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
