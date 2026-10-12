/**
 * Client-side Canvas Image Compression Utility
 * Compresses raw JPEG/PNG/WebP photos to target dimensions and WebP format
 * before uploading to Cloudflare R2 object storage.
 */

export async function compressImageFile(
  file: File,
  maxDimension = 1600,
  quality = 0.82
): Promise<File> {
  // Pass non-image types (SVG, GIF, PDF, video) as-is
  if (
    !file.type.startsWith("image/") ||
    file.type === "image/svg+xml" ||
    file.type === "image/gif"
  ) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Downscale dimensions if exceeding maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return resolve(file);
        }

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Export to WebP blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve(file);
            }

            // Clean original filename with .webp extension
            const originalName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
            const newFileName = `${originalName}.webp`;

            const compressedFile = new File([blob], newFileName, {
              type: "image/webp",
              lastModified: Date.now(),
            });

            // Return compressed file if it's smaller than original
            if (compressedFile.size < file.size) {
              console.log(
                `[IMAGE COMPRESSION] Compressed '${file.name}' (${(file.size / 1024).toFixed(1)}KB -> ${(compressedFile.size / 1024).toFixed(1)}KB)`
              );
              return resolve(compressedFile);
            }

            resolve(file);
          },
          "image/webp",
          quality
        );
      };

      img.onerror = () => resolve(file);
    };

    reader.onerror = () => resolve(file);
  });
}
