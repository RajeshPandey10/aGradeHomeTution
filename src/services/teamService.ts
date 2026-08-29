import api from "@/lib/axios";
import { handleRequest } from "./api";

export interface TeamMember {
  _id: string;
  name: string;
  role: string;
  photoUrl?: string;
  bio?: string;
  order: number;
  isPublished: boolean;
  socialLinks?: { linkedin?: string; facebook?: string; instagram?: string };
  createdAt?: string;
}

export const teamService = {
  getAll: () =>
    handleRequest<TeamMember[]>(() => api.get("/api/admin/team")),

  create: (data: Partial<Omit<TeamMember, "_id">>) =>
    handleRequest<TeamMember>(() => api.post("/api/admin/team", data)),

  update: (id: string, data: Partial<Omit<TeamMember, "_id">>) =>
    handleRequest<TeamMember>(() => api.put(`/api/admin/team/${id}`, data)),

  delete: (id: string) =>
    handleRequest<void>(() => api.delete(`/api/admin/team/${id}`)),

  uploadPhoto: (file: File) => {
    const formData = new FormData();
    formData.append("images", file);
    return handleRequest<{ urls: string[] }>(() =>
      api.post("/api/admin/upload/team", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    );
  },
};
