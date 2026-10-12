export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedAdmin } from "@/lib/adminAuth";
import { fetchBrandingSettings, upsertBrandingSettings } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const isAuth = await isAuthorizedAdmin(req);
    if (!isAuth) {
      return NextResponse.json({ error: "Unauthorized admin access" }, { status: 401 });
    }

    const branding = await fetchBrandingSettings();
    return NextResponse.json(branding);
  } catch (error: any) {
    console.error("GET /api/admin/branding error:", error);
    return NextResponse.json({ error: "Failed to fetch branding settings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const isAuth = await isAuthorizedAdmin(req);
    if (!isAuth) {
      return NextResponse.json({ error: "Unauthorized admin access" }, { status: 401 });
    }

    const body = await req.json();
    const { logo_url, favicon_url } = body;

    const updated = await upsertBrandingSettings({
      logo_url,
      favicon_url,
    });

    return NextResponse.json({
      success: true,
      branding: updated,
    });
  } catch (error: any) {
    console.error("POST /api/admin/branding error:", error);
    return NextResponse.json({ error: "Failed to save branding settings" }, { status: 500 });
  }
}
