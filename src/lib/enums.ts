/**
 * Every fixed-value field the admin panel reads or writes, in one place.
 *
 * The tuition fields mirror the backend's src/utils/tuitionEnums.js (also
 * served at GET /api/public/enums), which normalises every write to these
 * values. The rest mirror the backend models' enums. Keep them in sync.
 */

export interface EnumOption {
  readonly value: string;
  readonly label: string;
}

// ── Tuition request fields ──────────────────────────────────────────────

export const TUITION_TYPES = [
  { value: "Physical", label: "Home (physical)" },
  { value: "Online", label: "Online" },
] as const satisfies readonly EnumOption[];

export const DURATIONS = [
  { value: "Long Term", label: "Long term" },
  { value: "Short Term", label: "Short term" },
] as const satisfies readonly EnumOption[];

export const TEACHER_GENDERS = [
  { value: "Any", label: "Any" },
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
] as const satisfies readonly EnumOption[];

/** Board ids; "other" pairs with a free-text specificBoard. */
export const BOARDS = [
  { value: "neb", label: "NEB" },
  { value: "cbse", label: "CBSE" },
  { value: "cambridge", label: "IB" },
  { value: "other", label: "Other" },
] as const satisfies readonly EnumOption[];

/** Level ids; any other stored level is free text typed for "Other". */
export const LEVELS = [
  { value: "PG", label: "Playgroup" },
  { value: "school", label: "School (1–10)" },
  { value: "higher", label: "+2 (11–12)" },
] as const satisfies readonly EnumOption[];

export const MEDIUMS = [
  { value: "English", label: "English" },
  { value: "Nepali", label: "Nepali" },
] as const satisfies readonly EnumOption[];

export const DAYS_PER_WEEK = [
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
  { value: "6", label: "6" },
  { value: "7", label: "7" },
] as const satisfies readonly EnumOption[];

export const STUDENT_COUNTS = [
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
] as const satisfies readonly EnumOption[];

/** Number of days, only for a Short Term tuition. */
export const SHORT_TERM_DAYS = [
  { value: "7", label: "7 days" },
  { value: "10", label: "10 days" },
  { value: "15", label: "15 days" },
  { value: "20", label: "20 days" },
  { value: "25", label: "25 days" },
  { value: "30", label: "30 days" },
] as const satisfies readonly EnumOption[];

export const REQUEST_STATUSES = [
  { value: "pending", label: "Awaiting approval" },
  { value: "vacant", label: "Vacant" },
  { value: "ongoing", label: "Ongoing" },
  { value: "under_review", label: "Under review" },
  { value: "fulfilled", label: "Fulfilled" },
] as const satisfies readonly EnumOption[];

/** TuitionRequest.lockHistory[].action */
export const LOCK_ACTIONS = [
  { value: "initiated", label: "Initiated" },
  { value: "applied", label: "Applied" },
  { value: "locked", label: "Locked" },
  { value: "released", label: "Released" },
  { value: "expired", label: "Expired" },
  { value: "paid", label: "Paid" },
  { value: "approved", label: "Approved" },
  { value: "declined", label: "Declined" },
  { value: "fulfilled", label: "Fulfilled" },
] as const satisfies readonly EnumOption[];

// ── Post payments (backend src/utils/postPaymentLedger.js) ──────────────

/** PostPayment.status, in tab order. */
export const POST_PAYMENT_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "converted", label: "Converted" },
  { value: "rejected", label: "Rejected" },
  { value: "blacklisted", label: "Blacklisted" },
  { value: "draft", label: "Draft (on hold)" },
] as const satisfies readonly EnumOption[];

/** Where the tuition lead came from. */
export const POST_PAYMENT_SOURCES = [
  { value: "Agrade", label: "Agrade" },
  { value: "Aarambha", label: "Aarambha" },
] as const satisfies readonly EnumOption[];

// ── Teachers ────────────────────────────────────────────────────────────

/** TeacherProfile.status (profile / CV verification), in tab order. */
export const TEACHER_STATUSES = [
  { value: "in_review", label: "In review" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
  { value: "unverified", label: "Unverified" },
] as const satisfies readonly EnumOption[];

/** TeacherProfile.onlineTeaching.status (backend src/utils/onlineTeaching.js), in tab order. */
export const ONLINE_TEACHING_STATUSES = [
  { value: "in_review", label: "In review" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
  { value: "not_submitted", label: "Not submitted" },
] as const satisfies readonly EnumOption[];

/** Classes on the online teaching form, in display order. */
export const ONLINE_CLASS_LEVELS = [
  { value: "pre_primary", label: "Pre-primary" },
  { value: "upto_grade_5", label: "Up to Grade 5" },
  { value: "grade_5_to_8", label: "Grade 5 to 8" },
  { value: "grade_9_to_10", label: "Grade 9 to 10" },
  { value: "grade_11_to_12", label: "Grade 11 to 12" },
  { value: "bachelor", label: "Bachelor" },
  { value: "entrance_preparation", label: "Entrance Preparation" },
  { value: "gre_pte_sat", label: "GRE / PTE / SAT" },
  { value: "others", label: "Others" },
] as const satisfies readonly EnumOption[];

// ── Content, coupons, messages, users ───────────────────────────────────

export const NOTICE_TARGET_ROLES = [
  { value: "both", label: "All users" },
  { value: "teacher", label: "Teachers only" },
  { value: "parent", label: "Parents only" },
] as const satisfies readonly EnumOption[];

export const COUPON_TYPES = [
  { value: "percentage", label: "Percentage (%)" },
  { value: "flat", label: "Flat (Rs.)" },
] as const satisfies readonly EnumOption[];

export const CONTACT_STATUSES = [
  { value: "new", label: "New" },
  { value: "read", label: "Read" },
  { value: "replied", label: "Replied" },
] as const satisfies readonly EnumOption[];

export const USER_ROLES = [
  { value: "admin", label: "Admin" },
  { value: "teacher", label: "Teacher" },
  { value: "parent", label: "Parent" },
] as const satisfies readonly EnumOption[];

/** Every action the backend writes to the audit log. */
export const AUDIT_ACTIONS = [
  { value: "teacher_approved", label: "Teacher Approved" },
  { value: "teacher_rejected", label: "Teacher Rejected" },
  { value: "teacher_status_changed", label: "Teacher Status Changed" },
  { value: "teacher_deleted", label: "Teacher Deleted" },
  { value: "request_created_by_admin", label: "Request Created by Admin" },
  { value: "request_updated_by_admin", label: "Request Edited by Admin" },
  { value: "request_approved", label: "Request Approved" },
  { value: "request_fulfilled_by_admin", label: "Request Fulfilled" },
  { value: "request_deleted", label: "Request Deleted" },
  { value: "booking_approved", label: "Booking Accepted" },
  { value: "booking_declined", label: "Booking Declined" },
  { value: "payment_manual_submitted", label: "Manual Payment" },
  { value: "payment_esewa_verified", label: "eSewa Payment" },
  { value: "refund_requested", label: "Refund Requested" },
  { value: "refund_approved", label: "Refund Approved" },
  { value: "refund_rejected", label: "Refund Rejected" },
  { value: "refund_executed", label: "Refund Executed" },
  { value: "online_verification_submitted", label: "Online Form Submitted" },
  { value: "online_verification_approved", label: "Online Teaching Approved" },
  { value: "online_verification_rejected", label: "Online Teaching Rejected" },
  { value: "post_payment_created", label: "Post Payment Recorded" },
  { value: "post_payment_held", label: "Post Payment Held (Draft)" },
  { value: "post_payment_activated", label: "Post Payment Access Granted" },
  { value: "post_payment_edited", label: "Post Payment Edited" },
  { value: "post_payment_converted", label: "Post Payment Converted" },
  { value: "post_payment_rejected", label: "Post Payment Rejected" },
  { value: "post_payment_blacklisted", label: "Post Payment Blacklisted" },
  { value: "post_payment_pending", label: "Post Payment Reopened" },
  { value: "post_payment_deleted", label: "Post Payment Deleted" },
  { value: "notice_deleted", label: "Notice Deleted" },
  { value: "account_deleted", label: "Account Deleted" },
] as const satisfies readonly EnumOption[];

// ── Lookup ──────────────────────────────────────────────────────────────

const ENUMS = {
  tuitionType: TUITION_TYPES,
  duration: DURATIONS,
  teacherGender: TEACHER_GENDERS,
  board: BOARDS,
  level: LEVELS,
  medium: MEDIUMS,
  daysPerWeek: DAYS_PER_WEEK,
  numberOfStudents: STUDENT_COUNTS,
  numberOfDays: SHORT_TERM_DAYS,
  requestStatus: REQUEST_STATUSES,
  lockAction: LOCK_ACTIONS,
  postPaymentStatus: POST_PAYMENT_STATUSES,
  postPaymentSource: POST_PAYMENT_SOURCES,
  teacherStatus: TEACHER_STATUSES,
  onlineTeachingStatus: ONLINE_TEACHING_STATUSES,
  onlineClassLevel: ONLINE_CLASS_LEVELS,
  noticeTargetRole: NOTICE_TARGET_ROLES,
  couponType: COUPON_TYPES,
  contactStatus: CONTACT_STATUSES,
  userRole: USER_ROLES,
  auditAction: AUDIT_ACTIONS,
} as const;

export type EnumKind = keyof typeof ENUMS;
export type EnumValue<K extends EnumKind> = (typeof ENUMS)[K][number]["value"];

export type TuitionType = EnumValue<"tuitionType">;
export type Duration = EnumValue<"duration">;
export type TeacherGender = EnumValue<"teacherGender">;
export type Board = EnumValue<"board">;
export type Level = EnumValue<"level">;
export type Medium = EnumValue<"medium">;
export type RequestStatus = EnumValue<"requestStatus">;
export type LockAction = EnumValue<"lockAction">;
export type PostPaymentStatus = EnumValue<"postPaymentStatus">;
export type PostPaymentSource = EnumValue<"postPaymentSource">;
export type TeacherStatus = EnumValue<"teacherStatus">;
export type OnlineTeachingStatus = EnumValue<"onlineTeachingStatus">;
export type OnlineClassLevel = EnumValue<"onlineClassLevel">;
export type NoticeTargetRole = EnumValue<"noticeTargetRole">;
export type CouponType = EnumValue<"couponType">;
export type ContactStatus = EnumValue<"contactStatus">;
export type UserRole = EnumValue<"userRole">;
export type AuditAction = EnumValue<"auditAction">;

/** The options for a select, tab row or filter, in display order. */
export function optionsFor<K extends EnumKind>(kind: K): (typeof ENUMS)[K] {
  return ENUMS[kind];
}

const find = (kind: EnumKind, value: string | null | undefined) => {
  const key = value?.trim().toLowerCase();
  if (!key) return undefined;
  const options: readonly EnumOption[] = ENUMS[kind];
  return options.find((o) => o.value.toLowerCase() === key);
};

/** The canonical value matching `value` ignoring case, or undefined. */
export function matchValue<K extends EnumKind>(
  kind: K,
  value: string | null | undefined,
): EnumValue<K> | undefined {
  return find(kind, value)?.value as EnumValue<K> | undefined;
}

/** The display label for `value` (case-insensitive); the raw value if unknown. */
export function labelFor(kind: EnumKind, value: string | null | undefined): string {
  return find(kind, value)?.label ?? value ?? "";
}
