import api from "@/lib/axios";

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
  send: async (payload: { title: string; body: string; role?: string; user_id?: string }) => {
    const res = await api.post("/api/fcm/send", payload);
    return res.data as FcmResult;
  },
};
