import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { d1Query, d1Execute } from "@/lib/d1";
import { isAdminUser } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId || !(await isAdminUser(userId))) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const posts = await d1Query("SELECT * FROM community_posts ORDER BY created_at DESC");
    return NextResponse.json({ posts });
  } catch (error) {
    console.error("GET /api/admin/posts error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId || !(await isAdminUser(userId))) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Post ID is required" }, { status: 400 });
    }
    await d1Execute("DELETE FROM community_posts WHERE id = ?", [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/posts error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
