import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import crypto from "node:crypto";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const configuredPasskey = process.env.ADMIN_PASSKEY?.trim();
    if (!configuredPasskey || configuredPasskey.length < 8) {
      return NextResponse.json(
        { error: "Admin passkey authentication is not properly configured." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const passkey = (body.passkey || "").trim();

    if (!passkey) {
      return NextResponse.json({ error: "Passkey parameter required" }, { status: 400 });
    }

    const userBuffer = Buffer.from(passkey);
    const expectedBuffer = Buffer.from(configuredPasskey);

    const isMatch =
      userBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(userBuffer, expectedBuffer);

    if (isMatch) {
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
