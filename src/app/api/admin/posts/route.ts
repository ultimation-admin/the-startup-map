import { NextRequest, NextResponse } from "next/server";
import { d1Query } from "@/lib/d1";
import { deleteCommunityPost } from "@/lib/db";
import { isAuthorizedAdmin } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  try {
    if (!(await isAuthorizedAdmin(req))) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const cursor = req.nextUrl.searchParams.get("cursor");
    const separator = cursor?.indexOf("|") ?? -1;
    const cursorDate = separator > 0 ? cursor!.slice(0, separator) : "";
    const cursorId = separator > 0 ? cursor!.slice(separator + 1).slice(0, 100) : "";
    const rows = cursorDate && cursorId && Number.isFinite(Date.parse(cursorDate))
      ? await d1Query("SELECT id, user_name, content, created_at FROM community_posts WHERE (created_at < ? OR (created_at = ? AND id < ?)) ORDER BY created_at DESC, id DESC LIMIT ?", [cursorDate, cursorDate, cursorId, 51])
      : await d1Query("SELECT id, user_name, content, created_at FROM community_posts ORDER BY created_at DESC, id DESC LIMIT ?", [51]);
    const posts = rows.slice(0, 50);
    const last = posts[posts.length - 1] as Record<string, unknown> | undefined;
    return NextResponse.json({
      posts,
      has_more: rows.length > 50,
      next_cursor: rows.length > 50 && last ? `${String(last.created_at)}|${String(last.id)}` : null,
    });
  } catch (error) {
    console.error("GET /api/admin/posts error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!(await isAuthorizedAdmin(req))) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Post ID is required" }, { status: 400 });
    }
    await deleteCommunityPost(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/posts error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
