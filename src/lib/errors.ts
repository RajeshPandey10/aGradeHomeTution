import { isAxiosError } from "axios";

/**
 * The text to show for a failed request: the server's own `message` when it
 * sent one, otherwise `fallback`.
 */
export function getErrorMessage(
  err: unknown,
  fallback = "Something went wrong",
): string {
  if (isAxiosError<{ message?: unknown }>(err)) {
    const message = err.response?.data?.message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}
