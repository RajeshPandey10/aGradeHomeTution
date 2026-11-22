import api from "@/lib/axios";
import type { NoticeTargetRole } from "@/lib/enums";
import { handleRequest } from "./api";

export interface Notice {
  _id: string;
  title: string;
  subtitle?: string;
  description?: string;
  images?: string[];
  showAsPopup?: boolean;
  popupExpiresAt?: string | null;
  targetRole?: NoticeTargetRole;
  // Optional homepage countdown banner (website only)
  countdownTo?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  createdAt?: string;
}

type NoticeInput = {
  title: string;
  subtitle?: string;
  description?: string;
  images?: string[];
  showAsPopup?: boolean;
  popupExpiresAt?: string | null;
  targetRole?: NoticeTargetRole;
  countdownTo?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
};

export const noticeService = {
  getAll: () =>
    handleRequest<Notice[]>(() => api.get("/api/public/notices")),

  getById: (id: string) =>
    handleRequest<Notice>(() => api.get(`/api/public/notices/${id}`)),

  create: (data: NoticeInput) =>
    handleRequest<Notice>(() => api.post("/api/admin/notices", data)),

  update: (id: string, data: NoticeInput) =>
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
