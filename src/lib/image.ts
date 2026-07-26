const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050";

export function getImageUrl(path?: string | null): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/")) return `${API_URL}${path}`;
  return path;
}
