import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { d1Execute, d1QueryFirst } from "@/lib/d1";
import { isAuthorizedAdmin } from "@/lib/adminAuth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const post = await d1QueryFirst<{ user_id: string }>(
      "SELECT user_id FROM community_posts WHERE id = ?",
      [id]
    );

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const isOwner = post.user_id === user.id;
    const isAdmin = await isAuthorizedAdmin(req);
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden: Not the post owner or admin" }, { status: 403 });
    }

    await d1Execute("UPDATE community_posts SET content = ? WHERE id = ?", [content.trim(), id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/posts/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const post = await d1QueryFirst<{ user_id: string }>(
      "SELECT user_id FROM community_posts WHERE id = ?",
      [id]
    );

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const isOwner = post.user_id === user.id;
    const isAdmin = await isAuthorizedAdmin(req);
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden: Not the post owner or admin" }, { status: 403 });
    }

    await d1Execute("DELETE FROM community_posts WHERE id = ?", [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/posts/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
