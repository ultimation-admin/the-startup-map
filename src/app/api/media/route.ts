export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getR2Object } from "@/lib/r2";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    let key = url.searchParams.get("key");

    if (!key) {
      return NextResponse.json({ error: "Missing key parameter" }, { status: 400 });
    }

    // Clean leading slashes
    key = decodeURIComponent(key).replace(/^\/+/, "");

    if (key.includes("..") || key.startsWith(".")) {
      return NextResponse.json({ error: "Invalid key parameter" }, { status: 400 });
    }

    const object = await getR2Object(key);

    if (!object.Body) {
      return NextResponse.json({ error: "Object body empty" }, { status: 404 });
    }

    const bytes = await object.Body.transformToByteArray();
    const contentType = (object.ContentType || "image/png").toLowerCase();

    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline';",
    };

    // Force download disposition for SVGs and PDFs to prevent stored XSS execution in app origin
    if (contentType === "image/svg+xml" || contentType === "application/pdf") {
      headers["Content-Disposition"] = 'attachment; filename="download"';
    } else {
      headers["Content-Disposition"] = "inline";
    }

    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error("GET /api/media error:", error?.message || error);
    return NextResponse.json({ error: "Media object not found" }, { status: 404 });
  }
}
