import api from "@/lib/axios";
import { handleRequest } from "./api";

/**
 * Classes a teacher can choose on the online teaching form. Keys mirror the
 * backend's src/utils/onlineTeaching.js and the app's online_teaching_form.dart.
 */
export const ONLINE_CLASS_LEVELS: { key: string; label: string }[] = [
  { key: "pre_primary", label: "Pre-primary" },
  { key: "upto_grade_5", label: "Up to Grade 5" },
  { key: "grade_5_to_8", label: "Grade 5 to 8" },
  { key: "grade_9_to_10", label: "Grade 9 to 10" },
  { key: "grade_11_to_12", label: "Grade 11 to 12" },
  { key: "bachelor", label: "Bachelor" },
  { key: "entrance_preparation", label: "Entrance Preparation" },
  { key: "gre_pte_sat", label: "GRE / PTE / SAT" },
  { key: "others", label: "Others" },
];

export const onlineClassLabel = (key: string) =>
  ONLINE_CLASS_LEVELS.find((l) => l.key === key)?.label ?? key;

/** A teacher's online teaching verification (needed for online tuitions). */
export interface OnlineTeaching {
  status: "not_submitted" | "in_review" | "verified" | "rejected";
  hasPenTablet?: boolean | null;
  demoVideoUrl?: string | null;
  classLevels?: string[];
  entrancePreparation?: string | null;
  otherClasses?: string | null;
  experience?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
}

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
  /** Teacher's photo URL (JPEG/PNG), uploaded with the profile. */
  profilePicture?: string | null;
  onlineTeaching?: OnlineTeaching;
  createdAt: string;
  user?: { name: string; email: string; phoneNumber?: string; isVerified?: boolean };
}

export interface TeacherAccount {
  _id: string;
  name: string;
  email: string;
  phoneNumber?: string | null;
  isVerified?: boolean;
  createdAt: string;
}

export const teacherService = {
  getRequests: (status?: string, search?: string) =>
    handleRequest<TeacherProfile[]>(() =>
      api.get("/api/admin/teacher-requests", {
        params: { ...(status ? { status } : {}), ...(search ? { search } : {}) },
      }),
    ),

  getAll: async (search?: string) => {
    const res = await api.get("/api/admin/teachers", { params: search ? { search } : {} });
    return {
      data: res.data.data as TeacherProfile[],
      /** Teachers who have submitted a profile. */
      registeredCount: (res.data.registeredCount ?? 0) as number,
      verifiedCount: (res.data.verifiedCount ?? 0) as number,
      /** Every teacher account, including those who haven't submitted a profile/CV. */
      accountCount: (res.data.accountCount ?? 0) as number,
      withoutProfileCount: (res.data.withoutProfileCount ?? 0) as number,
    };
  },

  /** Teacher accounts that haven't submitted a profile/CV yet, newest first. */
  getWithoutProfile: (search?: string) =>
    handleRequest<TeacherAccount[]>(() =>
      api.get("/api/admin/teachers/without-profile", { params: search ? { search } : {} }),
    ),

  approve: (profileId: string, status: string, rejectionReason?: string, rejectionRemarks?: string) =>
    handleRequest<TeacherProfile>(() => api.post("/api/admin/teachers/approve", { profileId, status, rejectionReason, rejectionRemarks })),

  delete: (id: string) =>
    handleRequest<void>(() => api.delete(`/api/admin/teachers/${id}`)),

  /** Teachers who submitted the online teaching form, those in review first. */
  getOnlineVerifications: async (status?: string, search?: string) => {
    const res = await api.get("/api/admin/online-verifications", {
      params: { ...(status ? { status } : {}), ...(search ? { search } : {}) },
    });
    return {
      data: res.data.data as TeacherProfile[],
      inReviewCount: (res.data.inReviewCount ?? 0) as number,
    };
  },

  /** Approve, or reject with a reason the teacher will see. */
  reviewOnlineVerification: (profileId: string, decision: "approve" | "reject", reason?: string) =>
    handleRequest<TeacherProfile>(() =>
      api.post(`/api/admin/online-verifications/${profileId}/review`, { decision, reason }),
    ),
};
