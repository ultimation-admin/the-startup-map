import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchCommunities, createCommunity, deleteCommunity } from "@/lib/db";

export async function GET() {
  try {
    const communities = await fetchCommunities();
    return NextResponse.json(
      { communities },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (err: unknown) {
    console.error("GET /api/communities error:", err);
    return NextResponse.json({ error: "Failed to fetch communities" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Community name is required" }, { status: 400 });
    }

    const community = await createCommunity(name, description);
    return NextResponse.json({ success: true, community });
  } catch (err: unknown) {
    console.error("POST /api/communities error:", err);
    return NextResponse.json({ error: "Failed to create community" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Community ID is required" }, { status: 400 });
    }

    await deleteCommunity(id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("DELETE /api/communities error:", err);
    return NextResponse.json({ error: "Failed to delete community" }, { status: 500 });
  }
}
