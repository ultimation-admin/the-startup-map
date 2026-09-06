import { NextRequest, NextResponse } from "next/server";
import { getR2Object } from "@/lib/r2";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const keyPath = resolvedParams.key ? resolvedParams.key.join("/") : "";

    const url = new URL(req.url);
    const searchKey = url.searchParams.get("key");

    const finalKey = (searchKey || keyPath).replace(/^\/+/, "");

    if (!finalKey) {
      return NextResponse.json({ error: "Missing key parameter" }, { status: 400 });
    }

    const object = await getR2Object(finalKey);

    if (!object.Body) {
      return NextResponse.json({ error: "Object body empty" }, { status: 404 });
    }

    const bytes = await object.Body.transformToByteArray();
    const contentType = object.ContentType || "image/png";

    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error: any) {
    console.error("GET /api/media catch-all error:", error?.message || error);
    return NextResponse.json({ error: "Media object not found", details: error?.message || String(error) }, { status: 404 });
  }
}
