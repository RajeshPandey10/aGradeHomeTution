import api from "@/lib/axios";
import { handleRequest } from "./api";

export interface ParentProfile {
  _id: string;
  name?: string;
  phone?: string;
  address?: string;
  location?: string;
  duration?: string;
  salary?: string;
  status: string;
  subjects?: string[];
  level?: string[];
  grade?: string[];
  createdAt?: string;
  user?: { name: string; email: string };
}

export const parentService = {
  getRequests: () =>
    handleRequest<ParentProfile[]>(() => api.get("/api/admin/parent-requests")),

  getAll: () =>
    handleRequest<ParentProfile[]>(() => api.get("/api/admin/parents")),

  approve: (profileId: string) =>
    handleRequest<ParentProfile>(() => api.post("/api/admin/parent-requests/approve", { profileId })),

  update: (id: string, data: Partial<ParentProfile>) =>
    handleRequest<ParentProfile>(() => api.put(`/api/parent/parent-request/${id}`, data)),

  delete: (id: string) =>
    handleRequest<void>(() => api.delete(`/api/admin/parent-requests/${id}`)),
};
