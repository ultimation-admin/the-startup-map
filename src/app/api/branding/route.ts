export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { fetchBrandingSettings } from "@/lib/db";

export async function GET() {
  try {
    const branding = await fetchBrandingSettings();
    return NextResponse.json(branding, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
        Pragma: "no-cache",
      },
    });
  } catch (error: any) {
    console.error("GET /api/branding error:", error);
    return NextResponse.json(
      { logo_url: null, favicon_url: null },
      { status: 500 }
    );
  }
}
