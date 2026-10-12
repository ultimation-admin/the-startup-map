import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { d1QueryFirst } from "@/lib/d1";
import { notifyPostOwner, togglePostRepost } from "@/lib/db";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const post = await d1QueryFirst<{ id: string }>(
      "SELECT id FROM community_posts WHERE id = ?",
      [id]
    );
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const result = await togglePostRepost(id, user.id);
    if (result.reposted) {
      const actorName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.primaryEmailAddress?.emailAddress || "A community member";
      await notifyPostOwner(id, user.id, actorName, user.imageUrl, "repost");
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/posts/[id]/repost error:", error);
    return NextResponse.json({ error: "Unable to update repost" }, { status: 500 });
  }
}
