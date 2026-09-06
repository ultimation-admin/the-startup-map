import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createPresignedUploadUrl } from "@/lib/r2";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { fileName, contentType, fileSize, folder } = body;

    if (!fileName || !contentType || !fileSize) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const result = await createPresignedUploadUrl({
      fileName,
      contentType,
      fileSize,
      folder,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/upload/presign error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
