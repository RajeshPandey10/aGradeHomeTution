import api from "@/lib/axios";

export interface ApiError {
  message: string;
  status?: number;
}

export { getErrorMessage } from "@/lib/errors";

export async function handleRequest<T>(fn: () => Promise<{ data: { data: T; message?: string } }>): Promise<{ data: T; message?: string }> {
  const res = await fn();
  return { data: res.data.data, message: res.data.message };
}
