import type { AxiosProgressEvent } from "axios";
import { isAxiosError } from "axios";
import api from "@/lib/axios";
import type { PostPaymentSource, PostPaymentStatus } from "@/lib/enums";
import { handleRequest } from "./api";

/**
 * Post payments: a tuition an admin assigns to a teacher who pays the
 * commission later. Backend: src/controllers/postPaymentController.js; money
 * rules in src/utils/postPaymentLedger.js.
 */

export interface PostPaymentAgreement {
  url: string;
  originalName?: string | null;
  mimeType?: string | null;
  size?: number;
}

export interface PostPaymentTeacherProfile {
  _id: string;
  name?: string;
  phone?: string | null;
  address?: string;
  gender?: string | null;
  academicQualification?: string;
  experience?: string;
  about?: string;
  cv?: string;
  identification?: string[];
  status?: string;
  profilePicture?: string | null;
}

export interface PostPaymentRequestRef {
  _id: string;
  name?: string;
  location?: string;
  salary?: string;
  duration?: string;
  tuitionType?: string;
  status?: string;
  createdAt?: string;
  parent?: { _id: string; name?: string; email?: string; phoneNumber?: string } | null;
}

export interface PostPayment {
  _id: string;
  status: PostPaymentStatus;
  source: PostPaymentSource;
  commissionPercent: number;
  baseSalary: number;
  commissionAmount: number;
  partialPaidAmount: number;
  returnDays: number;
  recordedAt: string;
  dueDate: string;
  agreement?: PostPaymentAgreement | null;
  rejectionReason?: string | null;
  decidedAt?: string | null;
  decidedBy?: { _id: string; name?: string } | null;
  createdBy?: { _id: string; name?: string } | null;
  createdAt: string;
  updatedAt: string;
  warningAcknowledged?: boolean;
  teacher: { _id: string; name?: string; email?: string; phoneNumber?: string | null };
  teacherProfile?: PostPaymentTeacherProfile | null;
  tuitionRequest?: PostPaymentRequestRef | null;
  tuitionSnapshot?: { name?: string; location?: string; salary?: string; duration?: string; tuitionType?: string; parentName?: string };
  teacherSnapshot?: { name?: string; email?: string; phoneNumber?: string | null };
  /** The request is still held by this post payment (not released/reassigned). */
  requestLinked: boolean;
  history?: { action: string; at: string; by?: { _id: string; name?: string } | null; note?: string | null }[];
  // Ledger (see the backend's ledgerOf)
  collected: number;
  pending: number;
  badDebt: number;
  deducted: number;
  outstanding: number;
  /** Nepal date of recordedAt, YYYY-MM-DD. */
  dayKey: string;
  /** Server's countdown when fetched; the panel recomputes it live from dueDate. */
  daysLeft: number | null;
}

export interface PostPaymentSummary {
  total: number;
  pending: number;
  converted: number;
  rejected: number;
  blacklisted: number;
  drafts: number;
  overdue: number;
  pendingRevenue: number;
  successfulRevenue: number;
  partialCollected: number;
  collectedRevenue: number;
  badDebt: number;
  deducted: number;
  expected: number;
}

export interface TeacherOption {
  userId: string;
  profileId: string;
  name: string;
  accountName?: string;
  email?: string;
  phone?: string | null;
  address?: string | null;
  gender?: string | null;
  academicQualification?: string | null;
  experience?: string | null;
  profilePicture?: string | null;
  unsettled: { pending: number; blacklisted: number; owed: number } | null;
}

export interface UnsettledInfo {
  teacher: {
    _id: string;
    name?: string;
    email?: string;
    phoneNumber?: string | null;
    profile?: { name?: string; phone?: string | null } | null;
  };
  unsettled: PostPayment[];
}

export interface PostPaymentFields {
  teacherId?: string;
  source?: PostPaymentSource | "";
  commissionPercent?: number | string;
  returnDays?: number | string;
  partialPaidAmount?: number | string;
  baseSalary?: number | string;
  /** ISO timestamp. */
  recordedAt?: string | null;
  agreement?: File | null;
  acknowledgeWarning?: boolean;
}

export interface TeacherHistory {
  teacher: { _id: string; name?: string; email?: string; phoneNumber?: string | null; createdAt?: string } | null;
  profile: PostPaymentTeacherProfile | null;
  records: PostPayment[];
  totals: { count: number; collected: number; pending: number; badDebt: number; deducted: number } & Partial<Record<PostPaymentStatus, number>>;
}

const toForm = (fields: Record<string, unknown>) => {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null || value === "") continue;
    if (value instanceof File) form.append(key, value, value.name);
    else form.append(key, String(value));
  }
  return form;
};

type Progress = (percent: number) => void;
const onProgress = (cb?: Progress) =>
  cb
    ? (e: AxiosProgressEvent) => {
        if (e.total) cb(Math.round((e.loaded / e.total) * 100));
      }
    : undefined;

// Overrides the shared client's JSON default, as the other uploads do; axios
// fills in the multipart boundary.
const multipart = { headers: { "Content-Type": "multipart/form-data" } };

/** The 409 the backend sends when a teacher still owes on earlier post payments. */
export function unsettledFromError(err: unknown): UnsettledInfo | null {
  if (!isAxiosError(err) || err.response?.status !== 409) return null;
  const body = err.response.data as { code?: string; data?: UnsettledInfo } | undefined;
  return body?.code === "UNSETTLED_POST_PAYMENT" && body.data ? body.data : null;
}

/** Field errors ({ field: message }) from a 400, if any. */
export function fieldErrorsFromError(err: unknown): Record<string, string> {
  if (!isAxiosError(err) || err.response?.status !== 400) return {};
  const errors = (err.response.data as { errors?: Record<string, string> } | undefined)?.errors;
  return errors && typeof errors === "object" ? errors : {};
}

export const postPaymentService = {
  list: async (range?: { from?: string; to?: string }) => {
    const res = await api.get("/api/admin/post-payments", { params: range });
    return res.data.data as {
      records: PostPayment[];
      summary: { overall: PostPaymentSummary; range: PostPaymentSummary };
    };
  },

  get: (id: string) => handleRequest<PostPayment>(() => api.get(`/api/admin/post-payments/${id}`)),

  teacherOptions: () =>
    handleRequest<TeacherOption[]>(() => api.get("/api/admin/post-payments/teacher-options")),

  checkTeacher: (teacherId: string, excludeId?: string) =>
    handleRequest<UnsettledInfo>(() =>
      api.get(`/api/admin/post-payments/teacher-check/${teacherId}`, {
        params: excludeId ? { excludeId } : undefined,
      }),
    ),

  teacherHistory: (userId: string) =>
    handleRequest<TeacherHistory>(() => api.get(`/api/admin/post-payments/teachers/${userId}`)),

  create: (
    requestId: string,
    fields: PostPaymentFields,
    action: "submit" | "hold",
    progress?: Progress,
  ) =>
    handleRequest<PostPayment>(() =>
      api.post("/api/admin/post-payments", toForm({ requestId, action, ...fields }), {
        ...multipart,
        onUploadProgress: onProgress(progress),
      }),
    ),

  update: (id: string, fields: PostPaymentFields, progress?: Progress) =>
    handleRequest<PostPayment>(() =>
      api.patch(`/api/admin/post-payments/${id}`, toForm({ ...fields }), {
        ...multipart,
        onUploadProgress: onProgress(progress),
      }),
    ),

  activate: (id: string, acknowledgeWarning = false) =>
    handleRequest<PostPayment>(() =>
      api.post(`/api/admin/post-payments/${id}/activate`, { acknowledgeWarning }),
    ),

  decide: (
    id: string,
    status: Exclude<PostPaymentStatus, "draft">,
    options: { reason?: string; reopenRequest?: boolean } = {},
  ) =>
    handleRequest<PostPayment>(() =>
      api.post(`/api/admin/post-payments/${id}/status`, { status, ...options }),
    ),

  remove: (id: string, options: { reopenRequest?: boolean; reason?: string } = {}) =>
    handleRequest<{ _id: string; requestReopened: boolean }>(() =>
      api.delete(`/api/admin/post-payments/${id}`, { data: options }),
    ),
};
