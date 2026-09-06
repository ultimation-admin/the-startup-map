import { NextRequest, NextResponse } from "next/server";
import { d1Query } from "@/lib/d1";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const handle = searchParams.get("handle") || "";
    const ownerId = searchParams.get("owner_id") || searchParams.get("ownerId") || "";
    const slug = searchParams.get("slug") || "";
    const name = searchParams.get("name") || "";

    if (!handle && !ownerId && !slug && !name) {
      return NextResponse.json({ error: "Search parameter is required" }, { status: 400 });
    }

    const cleanHandleName = handle.replace(/^[ps]\//i, "");

    let whereClause = "user_name = ? OR LOWER(user_name) = LOWER(?)";
    let params: any[] = [handle, handle];

    if (ownerId) {
      whereClause += " OR user_id = ?";
      params.push(ownerId);
    }

    if (cleanHandleName) {
      whereClause += " OR LOWER(user_name) = LOWER(?) OR LOWER(user_name) = LOWER('s/' || ?) OR LOWER(user_name) = LOWER('p/' || ?)";
      params.push(cleanHandleName, cleanHandleName, cleanHandleName);
    }

    if (name && name.toLowerCase() !== cleanHandleName.toLowerCase()) {
      whereClause += " OR LOWER(user_name) = LOWER(?)";
      params.push(name);
    }

    if (slug) {
      whereClause += " OR LOWER(user_name) = LOWER(?)";
      params.push(slug);
    }

    // 1. Fetch posts created by this profile handle, owner_id, slug, or name
    const posts = await d1Query(
      `SELECT * FROM community_posts WHERE (${whereClause}) ORDER BY created_at DESC`,
      params
    );

    const formattedPosts = posts.map((p: any) => ({
      ...p,
      liked_by: typeof p.liked_by === "string" ? JSON.parse(p.liked_by || "[]") : (p.liked_by || []),
      replies: typeof p.replies === "string" ? JSON.parse(p.replies || "[]") : (p.replies || []),
    }));

    // 2. Extract replies from post_replies table
    let replyWhereClause = "user_name = ? OR LOWER(user_name) = LOWER(?)";
    let replyParams: any[] = [handle, handle];

    if (ownerId) {
      replyWhereClause += " OR user_id = ?";
      replyParams.push(ownerId);
    }

    if (cleanHandleName) {
      replyWhereClause += " OR LOWER(user_name) = LOWER(?) OR LOWER(user_name) = LOWER('s/' || ?) OR LOWER(user_name) = LOWER('p/' || ?)";
      replyParams.push(cleanHandleName, cleanHandleName, cleanHandleName);
    }

    const repliesList = await d1Query(
      `SELECT id, post_id as postId, content, created_at FROM post_replies WHERE (${replyWhereClause}) ORDER BY created_at DESC`,
      replyParams
    );

    return NextResponse.json({ posts: formattedPosts, replies: repliesList });
  } catch (error: any) {
    console.error("GET /api/posts/profile error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
