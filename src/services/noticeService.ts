import api from "@/lib/axios";
import { handleRequest } from "./api";

export interface Notice {
  _id: string;
  title: string;
  subtitle?: string;
  images?: string[];
  createdAt?: string;
}

export const noticeService = {
  getAll: () =>
    handleRequest<Notice[]>(() => api.get("/api/public/notices")),

  getById: (id: string) =>
    handleRequest<Notice>(() => api.get(`/api/public/notices/${id}`)),

  create: (data: { title: string; subtitle?: string; images?: string[] }) =>
    handleRequest<Notice>(() => api.post("/api/admin/notices", data)),

  update: (id: string, data: { title: string; subtitle?: string; images?: string[] }) =>
    handleRequest<Notice>(() => api.put(`/api/admin/notices/${id}`, data)),

  delete: (id: string) =>
    handleRequest<Notice>(() => api.delete(`/api/admin/notices/${id}`)),

  uploadImages: (files: File[]) => {
    const formData = new FormData();
    files.forEach((f) => formData.append("images", f));
    return handleRequest<{ urls: string[] }>(() =>
      api.post("/api/admin/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    );
  },
};
