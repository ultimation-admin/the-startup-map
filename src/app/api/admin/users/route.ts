import { NextRequest, NextResponse } from "next/server";
import { d1Query, d1Execute } from "@/lib/d1";
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
      ? await d1Query("SELECT id, full_name, email, role, created_at FROM profiles WHERE (created_at < ? OR (created_at = ? AND id < ?)) ORDER BY created_at DESC, id DESC LIMIT ?", [cursorDate, cursorDate, cursorId, 51])
      : await d1Query("SELECT id, full_name, email, role, created_at FROM profiles ORDER BY created_at DESC, id DESC LIMIT ?", [51]);
    const users = rows.slice(0, 50);
    const last = users[users.length - 1] as Record<string, unknown> | undefined;
    return NextResponse.json({
      users,
      has_more: rows.length > 50,
      next_cursor: rows.length > 50 && last ? `${String(last.created_at)}|${String(last.id)}` : null,
    });
  } catch (error) {
    console.error("GET /api/admin/users error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!(await isAuthorizedAdmin(req))) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { id, role } = body;
    if (!id || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    await d1Execute("UPDATE profiles SET role = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?", [role, id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/admin/users error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
