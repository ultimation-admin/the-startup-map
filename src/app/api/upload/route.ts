import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { uploadR2Buffer, MediaFolder } from "@/lib/r2";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as MediaFolder) || "posts";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const fileType = (file.type || "").toLowerCase();
    if (!ALLOWED_MIME_TYPES.includes(fileType)) {
      return NextResponse.json(
        { error: `Invalid file type: '${file.type}'. Allowed types: images (JPEG, PNG, WebP, GIF), videos (MP4, WebM)` },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds 10MB limit (size: ${(file.size / (1024 * 1024)).toFixed(2)}MB)` },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await uploadR2Buffer({
      buffer,
      fileName: file.name,
      contentType: fileType,
      folder,
    });

    console.log(`[R2 UPLOAD SUCCESS] Stored '${file.name}' in R2 bucket as '${result.fileKey}'`);

    return NextResponse.json({
      url: result.publicUrl,
      fileKey: result.fileKey,
    });
  } catch (error: any) {
    console.error("POST /api/upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload file to R2 storage" },
      { status: 500 }
    );
  }
}
