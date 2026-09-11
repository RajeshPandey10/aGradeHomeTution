import api from "@/lib/axios";

export interface EmailSenderStatus {
  _id: string;
  senderId: string;
  email: string;
  provider: string;
  priority: number;
  status: "available" | "cooldown" | "failed";
  emailsSent: number;
  emailsFailed: number;
  rateLimitErrors: number;
  lastSuccessfulSend: string | null;
  lastFailure: string | null;
  cooldownUntil: string | null;
}

export const emailSenderService = {
  async getStatuses() {
    const response = await api.get<{ data: EmailSenderStatus[] }>(
      "/api/admin/email-senders/status",
    );
    return response.data.data;
  },
};