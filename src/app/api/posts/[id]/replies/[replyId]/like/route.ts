import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { d1QueryFirst } from "@/lib/d1";
import { togglePostReplyLike } from "@/lib/db";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; replyId: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: postId, replyId } = await params;
    const reply = await d1QueryFirst<{ post_id: string }>(
      "SELECT post_id FROM post_replies WHERE id = ? LIMIT 1",
      [replyId]
    );
    if (!reply || reply.post_id !== postId) {
      return NextResponse.json({ error: "Reply not found." }, { status: 404 });
    }

    const result = await togglePostReplyLike(replyId, user.id);
    if (!result) return NextResponse.json({ error: "Reply not found." }, { status: 404 });
    return NextResponse.json({ result });
  } catch (error) {
    console.error("POST /api/posts/[id]/replies/[replyId]/like error:", error);
    return NextResponse.json({ error: "Unable to update reply like." }, { status: 500 });
  }
}
