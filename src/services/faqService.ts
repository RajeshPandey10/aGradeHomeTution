import api from "@/lib/axios";
import { handleRequest } from "./api";

export interface FaqItem {
  _id: string;
  question: string;
  answer: string;
  order: number;
  isPublished: boolean;
  createdAt?: string;
}

export const faqService = {
  getAll: () =>
    handleRequest<FaqItem[]>(() => api.get("/api/admin/faq-items")),

  create: (data: { question: string; answer: string; order?: number; isPublished?: boolean }) =>
    handleRequest<FaqItem>(() => api.post("/api/admin/faq-items", data)),

  update: (id: string, data: Partial<Pick<FaqItem, "question" | "answer" | "order" | "isPublished">>) =>
    handleRequest<FaqItem>(() => api.put(`/api/admin/faq-items/${id}`, data)),

  delete: (id: string) =>
    handleRequest<void>(() => api.delete(`/api/admin/faq-items/${id}`)),
};
