import api from "@/lib/axios";

export interface ApiError {
  message: string;
  status?: number;
}

export function getErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "response" in err) {
    const axiosErr = err as { response?: { data?: { message?: string } } };
    return axiosErr.response?.data?.message || "Something went wrong";
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}

export async function handleRequest<T>(fn: () => Promise<{ data: { data: T; message?: string } }>): Promise<{ data: T; message?: string }> {
  const res = await fn();
  return { data: res.data.data, message: res.data.message };
}
