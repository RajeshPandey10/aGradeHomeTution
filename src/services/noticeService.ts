import api from "@/lib/axios";
import { handleRequest } from "./api";

export interface Notice {
  _id: string;
  title: string;
  subtitle?: string;
  createdAt?: string;
}

export const noticeService = {
  getAll: () =>
    handleRequest<Notice[]>(() => api.get("/api/public/notices")),

  getById: (id: string) =>
    handleRequest<Notice>(() => api.get(`/api/public/notices/${id}`)),

  create: (data: { title: string; subtitle?: string }) =>
    handleRequest<Notice>(() => api.post("/api/admin/notices", data)),

  update: (id: string, data: { title: string; subtitle?: string }) =>
    handleRequest<Notice>(() => api.put(`/api/admin/notices/${id}`, data)),

  delete: (id: string) =>
    handleRequest<Notice>(() => api.delete(`/api/admin/notices/${id}`)),
};
