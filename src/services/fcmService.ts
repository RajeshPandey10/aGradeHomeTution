import api from "@/lib/axios";
import { handleRequest } from "./api";

export interface FcmBatchResult {
  successCount: number;
  failureCount: number;
  errors?: string[];
  removedStaleTokens?: number;
}

export interface FcmResult {
  message: string;
  results?: FcmBatchResult[];
}

export const fcmService = {
  send: (payload: { title: string; body: string; role?: string; user_id?: string }) =>
    handleRequest<FcmResult>(() => api.post("/api/fcm/send", payload)),
};
