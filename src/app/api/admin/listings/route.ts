import { NextRequest, NextResponse } from "next/server";
import { updateListingReviewState, createModerationLog } from "@/lib/db";
import { d1Query } from "@/lib/d1";
import { isAuthorizedAdmin } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  try {
    if (!(await isAuthorizedAdmin(req))) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const params = req.nextUrl.searchParams;
    const status = params.get("status") || "all";
    const query = (params.get("q") || "").trim().slice(0, 100).toLowerCase();
    const cursor = params.get("cursor");
    const separator = cursor?.indexOf("|") ?? -1;
    const cursorDate = separator > 0 ? cursor!.slice(0, separator) : "";
    const cursorId = separator > 0 ? cursor!.slice(separator + 1).slice(0, 100) : "";
    const conditions: string[] = [];
    const queryParams: unknown[] = [];
    if (["draft", "pending", "verified", "approved", "rejected"].includes(status)) {
      conditions.push("review_state = ?");
      queryParams.push(status);
    }
    if (query) {
      conditions.push("(LOWER(name) LIKE ? OR LOWER(city) LIKE ? OR LOWER(sector) LIKE ?)");
      const pattern = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
      queryParams.push(pattern, pattern, pattern);
    }
    if (cursorDate && cursorId && Number.isFinite(Date.parse(cursorDate))) {
      conditions.push("(created_at < ? OR (created_at = ? AND id < ?))");
      queryParams.push(cursorDate, cursorDate, cursorId);
    }
    queryParams.push(51);
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const [rows, countRows] = await Promise.all([
      d1Query<Record<string, unknown>>(
        `SELECT id, owner_id, type, name, slug, city, sector, review_state, created_at FROM listings ${where} ORDER BY created_at DESC, id DESC LIMIT ?`,
        queryParams
      ),
      cursorDate || query
        ? Promise.resolve([])
        : d1Query<Record<string, number>>(
            "SELECT COUNT(*) AS total, COALESCE(SUM(CASE WHEN review_state = 'pending' THEN 1 ELSE 0 END), 0) AS pending, COALESCE(SUM(CASE WHEN review_state IN ('verified', 'approved') THEN 1 ELSE 0 END), 0) AS verified, COALESCE(SUM(CASE WHEN review_state = 'rejected' THEN 1 ELSE 0 END), 0) AS rejected FROM listings"
          ),
    ]);
    const listings = rows.slice(0, 50);
    const last = listings[listings.length - 1];
    return NextResponse.json({
      listings,
      counts: countRows[0] || null,
      has_more: rows.length > 50,
      next_cursor: rows.length > 50 && last ? `${String(last.created_at)}|${String(last.id)}` : null,
    });
  } catch (error) {
    console.error("GET /api/admin/listings error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!(await isAuthorizedAdmin(req))) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { id, state, moderator_id, previous_state, reason } = body;

    if (!id || !state) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await updateListingReviewState(id, state);
    await createModerationLog({
      listing_id: id,
      moderator_id: moderator_id || "admin_session",
      previous_state: previous_state || "pending",
      new_state: state,
      reason: reason || `Status changed to ${state}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/admin/listings error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
