import api from "@/lib/axios";
import { handleRequest } from "./api";

export interface TeacherProfile {
  _id: string;
  name?: string;
  address?: string;
  academicQualification?: string;
  experience?: string;
  about?: string;
  status: string;
  createdAt: string;
  user?: { name: string; email: string };
}

export const teacherService = {
  getRequests: () =>
    handleRequest<TeacherProfile[]>(() => api.get("/api/admin/teacher-requests")),

  getAll: () =>
    handleRequest<TeacherProfile[]>(() => api.get("/api/admin/teachers")),

  approve: (profileId: string, status: "verified" | "rejected") =>
    handleRequest<TeacherProfile>(() => api.post("/api/admin/teachers/approve", { profileId, status })),
};
