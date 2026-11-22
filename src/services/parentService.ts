import api from "@/lib/axios";
import type {
  Board,
  CouponType,
  Duration,
  LockAction,
  RequestStatus,
  TeacherGender,
  TeacherStatus,
  TuitionType,
} from "@/lib/enums";
import { handleRequest } from "./api";

// A user the backend sends either populated or as a bare id.
export type UserRef =
  | string
  | { _id: string; name?: string; email?: string }
  | null;

/** The populated user behind a UserRef, or undefined when it is only an id. */
export const populatedUser = (ref?: UserRef) =>
  ref && typeof ref === "object" ? ref : undefined;

export interface ParentProfile {
  _id: string;
  name?: string;
  phone?: string;
  address?: string;
  location?: string;
  duration?: Duration;
  tuitionType?: TuitionType;
  daysPerWeek?: string;
  numberOfDays?: number | null;
  teacherGender?: TeacherGender;
  numberOfStudents?: string;
  salary?: string;
  status: RequestStatus;
  // Per-student arrays, aligned by index. subjects[i] is ONE comma-joined
  // string for student i; level and medium may hold free text.
  subjects?: string[];
  board?: (Board | "")[];
  specificBoard?: string[];
  level?: string[];
  grade?: string[];
  medium?: string[];
  timeSlots?: { start: string; end: string }[];
  requirements?: string;
  latitude?: number;
  longitude?: number;
  lockHistory?: {
    teacher?: { _id: string; name: string; email: string; phoneNumber?: string };
    teacherProfile?: {
      name?: string;
      address?: string;
      phone?: string;
      gender?: string;
      academicQualification?: string;
      experience?: string;
      about?: string;
      cv?: string;
      identification?: string[];
    };
    action: LockAction;
    at: string;
    expiresAt?: string | null;
    reason?: string | null;
  }[];
  createdAt?: string;
  user?: { name: string; email: string };
  parent?: { _id: string; name: string; email: string; phoneNumber?: string };
  assignedTeacher?: { _id: string; name: string; email: string; phoneNumber?: string };
  /** The teacher holding the request: applying (ongoing), or paid and awaiting review (under_review). */
  lockedBy?: { _id: string; name: string; email: string; phoneNumber?: string };
  platformFeePercent?: number;
  payment?: {
    grossAmount: number;
    total: number;
    payable: number;
    percentage: number;
    couponCode?: string | null;
    couponType?: CouponType | null;
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
    refundedBy?: UserRef;
    refundedAt?: string;
    requestedBy?: UserRef;
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
    cv?: string;
    identification?: string[];
    status?: TeacherStatus;
  };
}

export interface ParentAccount {
  _id: string;
  name: string;
  email: string;
  phoneNumber?: string;
}

export interface CreateParentRequestPayload {
  /** Registered parent to link the request to; omit for walk-in / phone requests. */
  parentId?: string;
  name: string;
  phone: string;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  duration: Duration;
  tuitionType: TuitionType;
  daysPerWeek: string;
  numberOfDays?: number | null;
  teacherGender: TeacherGender;
  numberOfStudents: string;
  board: (Board | "")[];
  specificBoard: string[];
  level: string[];
  grade: string[];
  subjects: string[];
  medium: string[];
  timeSlots: { start: string; end: string }[];
  salary: string;
  requirements?: string;
}

export const parentService = {
  getRequests: () =>
    handleRequest<ParentProfile[]>(() => api.get("/api/admin/parent-requests")),

  create: (data: CreateParentRequestPayload) =>
    handleRequest<ParentProfile>(() => api.post("/api/admin/parent-requests", data)),

  getAccounts: () =>
    handleRequest<ParentAccount[]>(() => api.get("/api/admin/parents")),

  getRequestDetail: (id: string) =>
    handleRequest<ParentProfile>(() => api.get(`/api/admin/parent-requests/${id}`)),

  getAll: () =>
    handleRequest<ParentProfile[]>(() => api.get("/api/admin/parents")),

  approve: (profileId: string) =>
    handleRequest<ParentProfile>(() => api.post("/api/admin/parent-requests/approve", { profileId })),

  /** Accept a teacher's paid booking (status under_review): the teacher gets the parent's contact. */
  approveBooking: (id: string) =>
    handleRequest<ParentProfile>(() => api.post(`/api/admin/parent-requests/${id}/approve-booking`)),

  /** Decline a teacher's paid booking: the request goes back to vacant. `note` is internal only. */
  declineBooking: (id: string, note?: string) =>
    handleRequest<ParentProfile>(() => api.post(`/api/admin/parent-requests/${id}/decline-booking`, { note })),

  resendInvoice: (id: string) =>
    handleRequest<ParentProfile>(() => api.post(`/api/admin/parent-requests/${id}/resend-invoice`)),

  refund: (id: string, reason: string) =>
    handleRequest<ParentProfile>(() => api.post(`/api/requests/${id}/refund`, { reason })),

  approveRefund: (id: string, resolution: "vacant" | "delete", reason: string) =>
    handleRequest<ParentProfile & { deleted?: boolean }>(() => api.post(`/api/admin/parent-requests/${id}/approve-refund`, { resolution, reason })),

  rejectRefund: (id: string, reason: string, resolution: "keep" | "vacant" | "delete" = "keep") =>
    handleRequest<ParentProfile & { deleted?: boolean }>(() => api.post(`/api/admin/parent-requests/${id}/reject-refund`, { reason, resolution })),

  /** Only the fields a parent could enter; status, payment and refund have their own endpoints. */
  update: (id: string, data: Partial<Omit<CreateParentRequestPayload, "parentId">>) =>
    handleRequest<ParentProfile>(() => api.put(`/api/parent/parent-request/${id}`, data)),

  delete: (id: string) =>
    handleRequest<void>(() => api.delete(`/api/admin/parent-requests/${id}`)),
};
