/**
 * Cloudflare R2 – Presigned Upload Utility
 *
 * Generates presigned PUT URLs so the browser can upload files directly to R2
 * without routing binary data through the Next.js server.
 *
 * Requires: @aws-sdk/client-s3, @aws-sdk/s3-request-presigner
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const R2_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID ?? "";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID ?? "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY ?? "";
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME ?? "the-startup-map-media";

/** Public CDN domain for serving uploaded media (e.g. "https://media.thestartupmap.com") */
export const R2_PUBLIC_DOMAIN = process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN ?? "";

// ---------------------------------------------------------------------------
// S3-compatible client for R2
// ---------------------------------------------------------------------------

let _client: S3Client | null = null;

function getR2Client(): S3Client {
  if (_client) return _client;

  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error(
      "R2 credentials not configured. Set CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, " +
        "and R2_SECRET_ACCESS_KEY in .env.local"
    );
  }

  _client = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });

  return _client;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MediaFolder = "avatars" | "posts" | "spotlights" | "logos" | "decks";

export interface PresignedUploadResult {
  /** Presigned PUT URL – the browser uploads the file binary here */
  uploadUrl: string;
  /** R2 object key (e.g. "posts/a1b2c3.webp") */
  fileKey: string;
  /** Public CDN URL to access the file after upload */
  publicUrl: string;
}

export interface PresignUploadInput {
  fileName: string;
  contentType: string;
  fileSize: number;
  folder?: MediaFolder;
}

// ---------------------------------------------------------------------------
// Allowed MIME types & size limits
// ---------------------------------------------------------------------------

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "video/mp4",
  "video/webm",
  "application/pdf",
]);

const VALID_FOLDERS = new Set<MediaFolder>(["avatars", "posts", "spotlights", "logos", "decks"]);

const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "application/pdf": "pdf",
};

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB
const MAX_PDF_BYTES = 25 * 1024 * 1024; // 25 MB

function getMaxBytes(contentType: string): number {
  if (contentType.startsWith("video/")) return MAX_VIDEO_BYTES;
  if (contentType === "application/pdf") return MAX_PDF_BYTES;
  return MAX_IMAGE_BYTES;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a presigned PUT URL for direct browser-to-R2 upload.
 *
 * Flow:
 *   1. Server calls this function → returns { uploadUrl, fileKey, publicUrl }
 *   2. Browser `PUT`s the file binary to `uploadUrl`
 *   3. File is accessible at `publicUrl` via R2 public bucket / custom domain
 */
export async function createPresignedUploadUrl({
  fileName,
  contentType,
  fileSize,
  folder = "posts",
}: PresignUploadInput): Promise<PresignedUploadResult> {
  // Validate folder parameter
  const targetFolder = VALID_FOLDERS.has(folder) ? folder : "posts";

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.has(contentType)) {
    throw new Error(`Unsupported file type: ${contentType}`);
  }

  // Validate file size
  const maxBytes = getMaxBytes(contentType);
  if (fileSize > maxBytes) {
    throw new Error(
      `File too large: ${(fileSize / (1024 * 1024)).toFixed(1)}MB exceeds ${(maxBytes / (1024 * 1024)).toFixed(0)}MB limit`
    );
  }

  // Build unique object key (extension derived securely from MIME type)
  const extension = MIME_TO_EXTENSION[contentType] || "bin";
  const uniqueId = crypto.randomUUID();
  const fileKey = `${targetFolder}/${uniqueId}.${extension}`;

  // Generate presigned URL (valid for 10 minutes)
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: fileKey,
    ContentType: contentType,
    ContentLength: fileSize,
    CacheControl: "public, max-age=31536000, immutable",
  });

  const uploadUrl = await getSignedUrl(getR2Client(), command, { expiresIn: 600 });
  const publicUrl = formatR2PublicUrl(fileKey);

  return { uploadUrl, fileKey, publicUrl };
}

export function formatR2PublicUrl(fileKey: string): string {
  if (!fileKey) return "";
  const cleanKey = fileKey.replace(/^\/+/, "");
  const domain = (process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN || R2_PUBLIC_DOMAIN || "https://media.thestartupmap.com")
    .trim()
    .replace(/\/+$/, "");

  if (domain && domain.startsWith("http")) {
    return `${domain}/${cleanKey}`;
  }

  return `/api/media?key=${encodeURIComponent(cleanKey)}`;
}

export function getPublicMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // 1. Data URLs or Blob preview URLs from file selection
  if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return trimmed;
  }

  // 2. Legacy /api/media route with key parameter or path -> resolve to direct R2 CDN URL
  if (trimmed.startsWith("/api/media")) {
    try {
      const parsedUrl = new URL(trimmed, "http://localhost");
      const keyParam = parsedUrl.searchParams.get("key");
      if (keyParam) {
        return formatR2PublicUrl(keyParam);
      }
      const pathKey = parsedUrl.pathname.replace(/^\/api\/media\/?/, "");
      if (pathKey) {
        return formatR2PublicUrl(pathKey);
      }
    } catch {
      // Fallback
    }
  }

  // 3. Already a full HTTP/HTTPS URL (including https://media.thestartupmap.com/...)
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  // 4. Otherwise treat as an R2 object key (e.g. "logos/abc.png", "posts/xyz.webp")
  return formatR2PublicUrl(trimmed);
}

export function extractR2KeyFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) return null;

  if (trimmed.startsWith("/api/media")) {
    try {
      const parsedUrl = new URL(trimmed, "http://localhost");
      const keyParam = parsedUrl.searchParams.get("key");
      if (keyParam) return keyParam.replace(/^\/+/, "");
      const pathKey = parsedUrl.pathname.replace(/^\/api\/media\/?/, "");
      if (pathKey) return pathKey.replace(/^\/+/, "");
    } catch {}
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const parsedUrl = new URL(trimmed);
      return parsedUrl.pathname.replace(/^\/+/, "");
    } catch {}
  }

  return trimmed.replace(/^\/+/, "");
}

export function getFaviconMimeType(url: string | null | undefined): string {
  if (!url) return "image/x-icon";
  const clean = url.split("?")[0].toLowerCase();
  if (clean.endsWith(".webp")) return "image/webp";
  if (clean.endsWith(".png")) return "image/png";
  if (clean.endsWith(".svg")) return "image/svg+xml";
  if (clean.endsWith(".jpg") || clean.endsWith(".jpeg")) return "image/jpeg";
  if (clean.endsWith(".gif")) return "image/gif";
  return "image/x-icon";
}

/**
 * Upload a binary buffer directly to Cloudflare R2 server-side.
 */
export async function uploadR2Buffer({
  buffer,
  fileName,
  contentType,
  folder = "posts",
}: {
  buffer: Buffer;
  fileName: string;
  contentType: string;
  folder?: MediaFolder;
}): Promise<{ fileKey: string; publicUrl: string }> {
  const targetFolder = VALID_FOLDERS.has(folder as MediaFolder) ? folder : "posts";
  const extension = MIME_TO_EXTENSION[contentType] || "bin";
  const uniqueId = crypto.randomUUID();
  const fileKey = `${targetFolder}/${uniqueId}.${extension}`;

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: fileKey,
    Body: buffer,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  });

  await getR2Client().send(command);

  const publicUrl = formatR2PublicUrl(fileKey);

  return { fileKey, publicUrl };
}

/**
 * Get an object from R2 by its key.
 */
export async function getR2Object(fileKey: string) {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: fileKey,
  });
  return await getR2Client().send(command);
}

/**
 * Delete an object from R2 by its key.
 */
export async function deleteR2Object(fileKey: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: fileKey,
  });

  await getR2Client().send(command);
}
