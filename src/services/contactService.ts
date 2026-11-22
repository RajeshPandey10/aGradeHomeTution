import api from "@/lib/axios";
import type { ContactStatus } from "@/lib/enums";
import { handleRequest } from "./api";

export interface ContactMessage {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: ContactStatus;
  reply?: string;
  repliedAt?: string | null;
  source?: string;
  createdAt: string;
}

export const contactService = {
  getAll: (status?: ContactStatus) =>
    handleRequest<ContactMessage[]>(() =>
      api.get("/api/admin/contact-messages", { params: status ? { status } : undefined })
    ),

  getById: (id: string) =>
    handleRequest<ContactMessage>(() => api.get(`/api/admin/contact-messages/${id}`)),

  reply: (id: string, reply: string) =>
    handleRequest<ContactMessage>(() => api.post(`/api/admin/contact-messages/${id}/reply`, { reply })),

  delete: (id: string) =>
    handleRequest<void>(() => api.delete(`/api/admin/contact-messages/${id}`)),
};
