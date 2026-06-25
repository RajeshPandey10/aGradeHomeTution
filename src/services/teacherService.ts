import api from "@/lib/axios";
import { handleRequest } from "./api";

export interface TeacherProfile {
  _id: string;
  name?: string;
  phone?: string;
  address?: string;
  academicQualification?: string;
  experience?: string;
  about?: string;
  gender?: string;
  cv?: string;
  identification?: string[];
  status: string;
  rejectionReason?: string | null;
  rejectionRemarks?: string | null;
  rejectedAt?: string | null;
  createdAt: string;
  user?: { name: string; email: string; phoneNumber?: string; isVerified?: boolean };
}

export const teacherService = {
  getRequests: (status?: string) =>
    handleRequest<TeacherProfile[]>(() => api.get("/api/admin/teacher-requests", { params: status ? { status } : {} })),

  getAll: () =>
    handleRequest<TeacherProfile[]>(() => api.get("/api/admin/teachers")),

  approve: (profileId: string, status: string, rejectionReason?: string, rejectionRemarks?: string) =>
    handleRequest<TeacherProfile>(() => api.post("/api/admin/teachers/approve", { profileId, status, rejectionReason, rejectionRemarks })),

  delete: (id: string) =>
    handleRequest<void>(() => api.delete(`/api/admin/teachers/${id}`)),
};
