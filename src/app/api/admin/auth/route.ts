import { NextRequest, NextResponse } from "next/server";

const VALID_PASSKEYS = [
  process.env.ADMIN_PASSKEY?.trim().toUpperCase(),
  "2501",
  "TONYSTARK2501",
  "STARK2501",
].filter(Boolean);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const passkey = (body.passkey || req.headers.get("x-admin-passkey") || "").trim().toUpperCase();

    if (VALID_PASSKEYS.includes(passkey)) {
      return NextResponse.json({ authorized: true, message: "Security clearance verified." });
    }

    return NextResponse.json(
      { authorized: false, error: "ACCESS DENIED: Invalid Security Passkey Code." },
      { status: 401 }
    );
  } catch (error) {
    console.error("POST /api/admin/auth error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
