import { NextRequest, NextResponse } from "next/server";
import { fetchLegalDocument } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const doc = searchParams.get("doc");

    if (doc !== "privacy_policy" && doc !== "terms_of_service") {
      return NextResponse.json({ error: "Invalid doc parameter. Must be 'privacy_policy' or 'terms_of_service'" }, { status: 400 });
    }

    const content = await fetchLegalDocument(doc);
    return NextResponse.json(
      { doc, content },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("GET /api/legal error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
