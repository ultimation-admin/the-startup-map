import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { geocodeIndia } from "@/lib/integrations";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const query = request.nextUrl.searchParams.get("q")?.trim();
    if (!query || query.length < 2) {
      return NextResponse.json({ error: "Provide a location query." }, { status: 400 });
    }

    const result = await geocodeIndia(query);
    return NextResponse.json({ result });
  } catch (error) {
    console.error("GET /api/geocode error:", error);
    return NextResponse.json({ error: "Unable to geocode location." }, { status: 502 });
  }
}
