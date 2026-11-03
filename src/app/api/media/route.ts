export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getR2Object } from "@/lib/r2";
import { rateLimitRequest } from "@/lib/requestRateLimit";

export async function GET(req: NextRequest) {
  try {
    const rateLimitResponse = await rateLimitRequest(req, "MEDIA_READ_LIMITER", "media");
    if (rateLimitResponse) return rateLimitResponse;

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

    const object = await getR2Object(key, req.headers.get("range"));

    if (!object.Body) {
      return NextResponse.json({ error: "Object body empty" }, { status: 404 });
    }

    const contentType = (object.ContentType || "image/png").toLowerCase();

    const headers = new Headers({
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline';",
    });
    if (object.ContentLength !== undefined) headers.set("Content-Length", String(object.ContentLength));
    if (object.ETag) headers.set("ETag", object.ETag);
    if (object.LastModified) headers.set("Last-Modified", object.LastModified.toUTCString());
    headers.set("Accept-Ranges", "bytes");
    if (object.ContentRange) headers.set("Content-Range", object.ContentRange);

    // Force download disposition for SVGs and PDFs to prevent stored XSS execution in app origin
    if (contentType === "image/svg+xml" || contentType === "application/pdf") {
      headers.set("Content-Disposition", 'attachment; filename="download"');
    } else {
      headers.set("Content-Disposition", "inline");
    }

    return new NextResponse(object.Body.transformToWebStream(), {
      status: object.$metadata.httpStatusCode === 206 ? 206 : 200,
      headers,
    });
  } catch (error: any) {
    console.error("GET /api/media error:", error?.message || error);
    return NextResponse.json({ error: "Media object not found" }, { status: 404 });
  }
}
