import { compressImageFile } from "./imageCompression";
import { MediaFolder } from "./r2";

export interface UploadClientResult {
  url: string;
  fileKey?: string;
}

/**
 * Reusable high-performance client upload helper:
 * 1. Compresses image files to WebP format before upload (90%+ size reduction)
 * 2. Attempts Direct Browser-to-R2 Presigned PUT upload (0MB server memory)
 * 3. Falls back smoothly to /api/upload server route if presigned upload is blocked
 */
export async function uploadFileToR2(
  file: File,
  folder: MediaFolder = "posts"
): Promise<UploadClientResult> {
  // Step 1: Compress image on client side (JPEG/PNG -> WebP)
  const compressedFile = await compressImageFile(file);

  // Step 2: Try Direct Presigned PUT Upload
  try {
    const presignRes = await fetch("/api/upload/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: compressedFile.name,
        contentType: compressedFile.type,
        fileSize: compressedFile.size,
        folder,
      }),
    });

    if (presignRes.ok) {
      const { uploadUrl, fileKey, publicUrl } = await presignRes.json();

      if (uploadUrl) {
        // Direct PUT to Cloudflare R2 bucket
        const putRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": compressedFile.type,
          },
          body: compressedFile,
        });

        if (putRes.ok || putRes.status === 200 || putRes.status === 204) {
          console.log(`[PRESIGNED UPLOAD SUCCESS] Uploaded '${compressedFile.name}' directly to R2`);
          return { url: publicUrl, fileKey };
        }
      }
    }
  } catch (presignErr) {
    console.warn("[PRESIGNED UPLOAD FALLBACK] Presigned PUT failed, falling back to /api/upload server route:", presignErr);
  }

  // Step 3: Fallback Buffer Upload via /api/upload
  const formData = new FormData();
  formData.append("file", compressedFile);
  formData.append("folder", folder);

  const uploadRes = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!uploadRes.ok) {
    const errData = await uploadRes.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to upload file to R2");
  }

  const data = await uploadRes.json();
  return {
    url: data.url,
    fileKey: data.fileKey,
  };
}
