const MAX_SIDE = 2400;
const SHRINK_ABOVE_BYTES = 1.5 * 1024 * 1024;

/**
 * Phone photos of an agreement are often 4–12MB. Images over 1.5MB are
 * redrawn at most 2400px on the long side as JPEG (still sharp enough to
 * read), which usually cuts the upload 5–10×. PDFs, small images, and
 * anything the browser can't decode are returned unchanged.
 */
export async function shrinkImageForUpload(file: File): Promise<File> {
  if (!/^image\/(jpeg|jpg|png)$/i.test(file.type) || file.size < SHRINK_ABOVE_BYTES) return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    // PNGs may be transparent; JPEG has no alpha, so paint white first.
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  }
}
