import api from "@/lib/axios";
import { handleRequest } from "./api";

export interface ParentProfile {
  _id: string;
  name?: string;
  phone?: string;
  address?: string;
  location?: string;
  duration?: string;
  tuitionType?: string;
  daysPerWeek?: string;
  numberOfDays?: number;
  teacherGender?: string;
  numberOfStudents?: string;
  salary?: string;
  status: string;
  subjects?: string[];
  board?: string[];
  specificBoard?: string[];
  level?: string[];
  grade?: string[];
  medium?: string[];
  timeSlots?: { start: string; end: string }[];
  requirements?: string;
  latitude?: number;
  longitude?: number;
  createdAt?: string;
  user?: { name: string; email: string };
  parent?: { _id: string; name: string; email: string; phoneNumber?: string };
  assignedTeacher?: { _id: string; name: string; email: string; phoneNumber?: string };
  lockedBy?: { _id: string; name: string; email: string };
  platformFeePercent?: number;
  payment?: {
    grossAmount: number;
    total: number;
    payable: number;
    percentage: number;
    couponType?: string | null;
    couponValue?: number;
  };
  paymentSlip?: {
    paymentAmount: number;
    medium: string;
    paymentRef: string;
    paidAt?: string;
  };
  refund?: {
    reason?: string;
    reasons?: string;
    phoneNumber?: string;
    qrImage?: string;
    refundedBy?: { _id: string; name: string; email: string };
    refundedAt?: string;
    requestedBy?: { _id: string; name: string; email: string };
    requestedAt?: string;
  };
  teacherProfile?: {
    name: string;
    address: string;
    phone?: string;
    gender?: string;
    academicQualification?: string;
    experience?: string;
    about?: string;
    status?: string;
  };
}

export const parentService = {
  getRequests: () =>
    handleRequest<ParentProfile[]>(() => api.get("/api/admin/parent-requests")),

  getRequestDetail: (id: string) =>
    handleRequest<ParentProfile>(() => api.get(`/api/admin/parent-requests/${id}`)),

  getAll: () =>
    handleRequest<ParentProfile[]>(() => api.get("/api/admin/parents")),

  approve: (profileId: string) =>
    handleRequest<ParentProfile>(() => api.post("/api/admin/parent-requests/approve", { profileId })),

  resendInvoice: (id: string) =>
    handleRequest<ParentProfile>(() => api.post(`/api/admin/parent-requests/${id}/resend-invoice`)),

  refund: (id: string, reason: string) =>
    handleRequest<ParentProfile>(() => api.post(`/api/requests/${id}/refund`, { reason })),

  approveRefund: (id: string) =>
    handleRequest<ParentProfile>(() => api.post(`/api/admin/parent-requests/${id}/approve-refund`)),

  rejectRefund: (id: string, reason?: string) =>
    handleRequest<ParentProfile>(() => api.post(`/api/admin/parent-requests/${id}/reject-refund`, { reason })),

  update: (id: string, data: Partial<ParentProfile>) =>
    handleRequest<ParentProfile>(() => api.put(`/api/parent/parent-request/${id}`, data)),

  delete: (id: string) =>
    handleRequest<void>(() => api.delete(`/api/admin/parent-requests/${id}`)),
};
