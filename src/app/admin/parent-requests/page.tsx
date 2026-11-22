"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  CheckCircle,
  Eye,
  Trash2,
  MapPin,
  DollarSign,
  Clock,
  Pencil,
  RotateCcw,
  Mail,
  User,
  BookOpen,
  Percent,
  AlertTriangle,
  LockKeyhole,
  Plus,
  XCircle,
  UserCheck,
  FileText,
  ExternalLink,
} from "lucide-react";
import CreateParentRequestModal from "@/components/admin/CreateParentRequestModal";
import EditParentRequestModal from "@/components/admin/EditParentRequestModal";
import { describeStudents } from "@/components/admin/TuitionFields";
import { SearchInput } from "@/components/admin/SearchInput";
import { matchesSearch } from "@/lib/search";
import { useRealtimeRefresh } from "@/lib/socket";
import {
  parentService,
  ParentProfile,
  populatedUser,
} from "@/services/parentService";
import { useToast } from "@/hooks/useToast";
import { getErrorMessage } from "@/services/api";
import { getImageUrl } from "@/lib/image";
import { labelFor, optionsFor, type RequestStatus } from "@/lib/enums";
import { PageHeader, DataTable } from "@/components/admin/DataTable";
import {
  ActionButton,
  ActionButtonSolid,
  Loading,
  EmptyState,
  StatusBadge,
} from "@/components/admin/UI";
import { Modal } from "@/components/admin/Modal";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

// The backend refuses (409) to delete a request whose paid booking is awaiting review.
const canDelete = (r: ParentProfile) => r.status !== "under_review";

function DetailRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value?: string | number | null;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <span className="font-medium text-slate-400 text-xs uppercase tracking-wider">
        {label}
      </span>
      <p className="text-slate-900 mt-0.5 flex items-center gap-1.5">
        {Icon && <Icon size={14} className="text-slate-400" />}
        {value}
      </p>
    </div>
  );
}
function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-600 border-b border-slate-200 pb-1 pt-3">
      {title}
    </h3>
  );
}

export default function ParentRequestsPage() {
  const [requests, setRequests] = useState<ParentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ParentProfile | null>(null);
  const [lockTarget, setLockTarget] = useState<ParentProfile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ParentProfile | null>(null);
  const [editing, setEditing] = useState<ParentProfile | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [refundTarget, setRefundTarget] = useState<ParentProfile | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "">("");
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  // A paid booking the admin is accepting or declining (status under_review)
  const [reviewAction, setReviewAction] = useState<{
    request: ParentProfile;
    decision: "approve" | "decline";
  } | null>(null);
  const [declineNote, setDeclineNote] = useState("");
  const toast = useToast();

  const fetchAll = useCallback(async () => {
    try {
      const res = await parentService.getRequests();
      // Needs-action first: bookings to review, then requests to publish
      const priority = (status: RequestStatus) =>
        status === "under_review" ? 0 : status === "pending" ? 1 : 2;
      const sorted = (res.data || []).sort((a, b) => {
        const aPrio = priority(a.status);
        const bPrio = priority(b.status);
        if (aPrio !== bPrio) return aPrio - bPrio;
        return (
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
        );
      });
      setRequests(sorted);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load parent requests"));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);
  useRealtimeRefresh(
    fetchAll,
    [
      "parent-request:status-updated",
      "parent-request:created",
      "parent-request:updated",
      "parent-request:deleted",
      "request:fulfilled",
      "request:available",
      "request:under-review",
      "request:locked",
      "request:expired",
    ],
    400,
  );

  const handleView = useCallback(async (r: ParentProfile) => {
    try {
      const res = await parentService.getRequestDetail(r._id);
      setSelected(res.data);
    } catch {
      setSelected(r);
    }
  }, []);

  const handleLockView = useCallback(async (r: ParentProfile) => {
    try {
      const res = await parentService.getRequestDetail(r._id);
      setLockTarget(res.data);
    } catch {
      setLockTarget(r);
    }
  }, []);

  const handleApprove = useCallback(
    async (requestId: string) => {
      setProcessing(requestId);
      try {
        await parentService.approve(requestId);
        toast.success("Parent request approved and published");
        setSelected(null);
        fetchAll();
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to approve parent request"));
      } finally {
        setProcessing(null);
      }
    },
    [fetchAll, toast],
  );

  const handleReviewDecision = useCallback(async () => {
    if (!reviewAction) return;
    const { request, decision } = reviewAction;
    setProcessing(request._id);
    try {
      if (decision === "approve") {
        await parentService.approveBooking(request._id);
        toast.success(
          `Booking accepted. ${request.lockedBy?.name || "The teacher"} can now see the parent's contact.`,
        );
      } else {
        await parentService.declineBooking(request._id, declineNote.trim() || undefined);
        toast.success("Booking declined. The request is vacant again and the teacher has been notified.");
      }
      setReviewAction(null);
      setDeclineNote("");
      setSelected(null);
      fetchAll();
    } catch (err) {
      toast.error(getErrorMessage(err));
      // Someone else may have decided it already; show the current state.
      fetchAll();
    } finally {
      setProcessing(null);
    }
  }, [reviewAction, declineNote, fetchAll, toast]);

  const openReview = useCallback((request: ParentProfile, decision: "approve" | "decline") => {
    setDeclineNote("");
    setReviewAction({ request, decision });
  }, []);

  const handleResendInvoice = useCallback(
    async (id: string) => {
      setProcessing(id);
      try {
        await parentService.resendInvoice(id);
        toast.success("Invoice email resent to teacher and parent");
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to resend invoice"));
      } finally {
        setProcessing(null);
      }
    },
    [toast],
  );

  const handleRefund = useCallback(async () => {
    if (!refundTarget || !refundReason.trim()) return;
    setProcessing(refundTarget._id);
    try {
      await parentService.refund(refundTarget._id, refundReason.trim());
      toast.success("Request refunded successfully");
      setRefundTarget(null);
      setRefundReason("");
      setSelected(null);
      fetchAll();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to refund request"));
    } finally {
      setProcessing(null);
    }
  }, [refundTarget, refundReason, fetchAll, toast]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setProcessing(deleteTarget._id);
    try {
      await parentService.delete(deleteTarget._id);
      toast.success("Parent request deleted");
      setDeleteTarget(null);
      fetchAll();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to delete parent request"));
    } finally {
      setProcessing(null);
    }
  }, [deleteTarget, fetchAll, toast]);

  const reviewCount = requests.filter((r) => r.status === "under_review").length;
  const byStatus = statusFilter
    ? requests.filter((r) => r.status === statusFilter)
    : requests;
  const filtered = byStatus.filter((r) =>
    matchesSearch(search, [
      r.name,
      r.phone,
      r.location,
      r.status,
      r.duration,
      r.tuitionType,
      labelFor("tuitionType", r.tuitionType),
      labelFor("requestStatus", r.status),
      r.salary,
      r.teacherGender,
      r.subjects,
      r.grade,
      r.board,
      r.specificBoard,
      r.level,
      r.medium,
      r.requirements,
      r.parent?.name,
      r.parent?.email,
      r.parent?.phoneNumber,
      r.assignedTeacher?.name,
      r.assignedTeacher?.email,
      r.assignedTeacher?.phoneNumber,
      r.teacherProfile?.name,
      r.teacherProfile?.phone,
      r.lockedBy?.name,
      r.lockedBy?.email,
      r.paymentSlip?.paymentRef,
      r.payment?.couponCode,
      populatedUser(r.refund?.requestedBy)?.name,
    ]),
  );

  return (
    <div>
      <PageHeader
        title="Parent Requests"
        subtitle="Review, approve or add tuition requests from parents"
        action={
          <ActionButtonSolid
            icon={Plus}
            label="New Request"
            onClick={() => setCreating(true)}
            color="blue"
          />
        }
      />
      <CreateParentRequestModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={fetchAll}
      />
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search name, phone, location, parent, teacher, subject…"
        shown={filtered.length}
        total={byStatus.length}
      />
      <div className="flex gap-1.5 mb-5 flex-wrap">
        {[{ label: "All", value: "" } as const, ...optionsFor("requestStatus")].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              statusFilter === tab.value
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab.label}
            {tab.value === "under_review" && reviewCount > 0 && (
              <span
                className={`ml-1.5 inline-flex min-w-4.5 justify-center rounded-full px-1 text-[10px] font-semibold ${
                  statusFilter === tab.value ? "bg-white text-blue-700" : "bg-orange-500 text-white"
                }`}
              >
                {reviewCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Detail Modal */}
      <Modal
        open={!!lockTarget}
        onClose={() => setLockTarget(null)}
        title="Lock History"
        wide
      >
        {lockTarget && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              All teacher lock, application, release, expiry, and fulfillment events for <strong>{lockTarget.name}</strong>.
            </p>
            {lockTarget.lockHistory?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-400">
                      <th className="px-3 py-2">Teacher</th>
                      <th className="px-3 py-2">Action</th>
                      <th className="px-3 py-2">Date & time</th>
                      <th className="px-3 py-2">Expiry / reason</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {[...lockTarget.lockHistory].reverse().map((entry, index) => (
                      <tr key={`${entry.at}-${index}`} className="border-b border-slate-100">
                        <td className="px-3 py-3">
                          <p className="font-medium text-slate-900">{entry.teacher?.name || "Unknown teacher"}</p>
                          <p className="text-xs text-slate-500">{entry.teacher?.email || "—"}</p>
                        </td>
                        <td className="px-3 py-3"><StatusBadge status={entry.action} kind="lockAction" /></td>
                        <td className="px-3 py-3 text-slate-600">{new Date(entry.at).toLocaleString()}</td>
                        <td className="px-3 py-3 text-slate-500">
                          {entry.expiresAt ? `Until ${new Date(entry.expiresAt).toLocaleString()}` : entry.reason || "—"}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {entry.teacher && (
                            <ActionButton icon={Eye} label="View" onClick={() => handleView({ ...lockTarget, assignedTeacher: entry.teacher } as ParentProfile)} color="blue" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <EmptyState message="No lock history recorded for this request" />}
          </div>
        )}
      </Modal>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Request Details"
        wide
      >
        {selected && (
          <div className="space-y-3 text-sm max-h-[75vh] overflow-y-auto pr-1">
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={selected.status} kind="requestStatus" />
              {selected.platformFeePercent != null && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                  <Percent size={12} /> {selected.platformFeePercent}% fee
                </span>
              )}
              {selected.createdAt && (
                <span className="text-slate-400 text-xs">
                  Created {new Date(selected.createdAt).toLocaleDateString()}
                </span>
              )}
            </div>

            {selected.status === "under_review" && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-2.5">
                  <UserCheck size={18} className="text-orange-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-orange-900">Booking awaiting your review</p>
                    <p className="text-orange-800 mt-0.5">
                      <span className="font-medium">{selected.lockedBy?.name || "A teacher"}</span>{" "}
                      paid
                      {selected.paymentSlip?.paymentAmount
                        ? ` Rs. ${selected.paymentSlip.paymentAmount}`
                        : ""}
                      {selected.paymentSlip?.paidAt
                        ? ` on ${new Date(selected.paymentSlip.paidAt).toLocaleString()}`
                        : ""}{" "}
                      to book this tuition. Check their profile against the requirements below.
                      Accepting shares the parent&apos;s contact with them; declining makes the
                      request vacant again for other teachers.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <DetailRow label="Teacher" value={selected.lockedBy?.name} icon={User} />
                  <DetailRow label="Email" value={selected.lockedBy?.email} />
                  <DetailRow
                    label="Phone"
                    value={
                      selected.lockedBy?.phoneNumber ||
                      selected.teacherProfile?.phone ||
                      "Not provided"
                    }
                  />
                </div>
                {selected.teacherProfile?.cv && (
                  <a
                    href={getImageUrl(selected.teacherProfile.cv)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm"
                  >
                    <FileText size={14} /> View CV <ExternalLink size={12} />
                  </a>
                )}
              </div>
            )}

            <SectionHeader title="Tuition Details" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DetailRow label="Name" value={selected.name} icon={User} />
              <DetailRow label="Phone" value={selected.phone} />
              <DetailRow
                label="Location"
                value={selected.location}
                icon={MapPin}
              />
              <DetailRow
                label="Salary"
                value={selected.salary ? `Rs. ${selected.salary}` : undefined}
                icon={DollarSign}
              />
              <DetailRow
                label="Duration"
                value={labelFor("duration", selected.duration)}
                icon={Clock}
              />
              <DetailRow
                label="Tuition Type"
                value={labelFor("tuitionType", selected.tuitionType)}
              />
              <DetailRow label="Days Per Week" value={selected.daysPerWeek} />
              <DetailRow label="Number of Days" value={selected.numberOfDays} />
              <DetailRow
                label="Teacher Gender"
                value={labelFor("teacherGender", selected.teacherGender)}
              />
              <DetailRow
                label="Number of Students"
                value={selected.numberOfStudents}
              />
            </div>
            {describeStudents(selected).map((student, i, all) => (
              <div key={i} className="rounded-lg bg-slate-50 p-3">
                {all.length > 1 && (
                  <p className="mb-2 text-xs font-semibold text-slate-700">Student {i + 1}</p>
                )}
                <DetailRow label="Subjects" value={student.subjects} icon={BookOpen} />
                <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <DetailRow label="Board" value={student.board} />
                  <DetailRow label="Level" value={student.level} />
                  <DetailRow label="Grade" value={student.grade} />
                  <DetailRow label="Medium" value={student.medium} />
                </div>
              </div>
            ))}
            <DetailRow
              label="Time Slots"
              value={selected.timeSlots
                ?.map((s) => `${s.start}-${s.end}`)
                .join(", ")}
            />
            <DetailRow label="Requirements" value={selected.requirements} />

            {selected.parent && (
              <>
                <SectionHeader title="Parent Info" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <DetailRow
                    label="Name"
                    value={selected.parent.name}
                    icon={User}
                  />
                  <DetailRow label="Email" value={selected.parent.email} />
                  <DetailRow
                    label="Phone"
                    value={selected.parent.phoneNumber || "Not provided"}
                  />
                </div>
              </>
            )}

            {selected.assignedTeacher && (
              <>
                <SectionHeader title="Assigned Teacher" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <DetailRow
                    label="Name"
                    value={selected.assignedTeacher.name}
                    icon={User}
                  />
                  <DetailRow
                    label="Email"
                    value={selected.assignedTeacher.email}
                  />
                  <DetailRow
                    label="Phone"
                    value={
                      selected.assignedTeacher.phoneNumber ||
                      selected.teacherProfile?.phone ||
                      "Not provided"
                    }
                  />
                </div>
              </>
            )}
            {selected.teacherProfile && (
              <>
                <SectionHeader
                  title={
                    selected.status === "under_review"
                      ? "Teacher Profile (awaiting review)"
                      : "Teacher Profile"
                  }
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <DetailRow
                    label="Name"
                    value={selected.teacherProfile.name}
                  />
                  <DetailRow
                    label="Phone"
                    value={selected.teacherProfile.phone || "Not provided"}
                  />
                  <DetailRow
                    label="Address"
                    value={selected.teacherProfile.address}
                  />
                  <DetailRow
                    label="Gender"
                    value={selected.teacherProfile.gender}
                  />
                  <DetailRow
                    label="Qualification"
                    value={selected.teacherProfile.academicQualification}
                  />
                  <DetailRow
                    label="Experience"
                    value={selected.teacherProfile.experience}
                  />
                </div>
                <DetailRow
                  label="About"
                  value={selected.teacherProfile.about}
                />
              </>
            )}

            {selected.payment && selected.payment.grossAmount > 0 && (
              <>
                <SectionHeader title="Payment Breakdown" />
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <DetailRow
                      label="Gross Amount"
                      value={`Rs. ${selected.payment.grossAmount}`}
                      icon={DollarSign}
                    />
                    <DetailRow
                      label={`Platform Fee (${selected.payment.percentage}%)`}
                      value={`Rs. ${selected.payment.payable}`}
                    />
                    {selected.payment.couponType && (
                      <DetailRow
                        label={`Coupon (${selected.payment.couponType})`}
                        value={selected.payment.couponValue}
                      />
                    )}
                    <DetailRow
                      label="Teacher Net Amount"
                      value={`Rs. ${selected.payment.total}`}
                    />
                  </div>
                </div>
              </>
            )}

            {selected.paymentSlip && selected.paymentSlip.paymentAmount && (
              <>
                <SectionHeader title="Payment Slip" />
                <div className="bg-emerald-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <DetailRow
                      label="Amount Paid"
                      value={`Rs. ${selected.paymentSlip.paymentAmount}`}
                      icon={DollarSign}
                    />
                    <DetailRow
                      label="Medium"
                      value={selected.paymentSlip.medium}
                    />
                    <DetailRow
                      label="Reference"
                      value={selected.paymentSlip.paymentRef}
                    />
                    <DetailRow
                      label="Paid At"
                      value={
                        selected.paymentSlip.paidAt
                          ? new Date(
                              selected.paymentSlip.paidAt,
                            ).toLocaleString()
                          : undefined
                      }
                    />
                  </div>
                </div>
              </>
            )}

            {selected.refund?.requestedBy && !selected.refund?.refundedBy && (
              <>
                <SectionHeader title="Refund Request" />
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between gap-3">
                  <p className="text-sm text-amber-800">
                    <AlertTriangle
                      size={14}
                      className="inline mr-1.5 -mt-0.5"
                    />
                    A refund has been requested
                    {populatedUser(selected.refund.requestedBy)?.name && (
                      <>
                        {" "}by{" "}
                        <span className="font-medium">
                          {populatedUser(selected.refund.requestedBy)?.name}
                        </span>
                      </>
                    )}
                    . Manage it in the dedicated Refunds page.
                  </p>
                  <Link
                    href="/admin/refunds"
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors"
                  >
                    Go to Refunds
                  </Link>
                </div>
              </>
            )}

            {selected.refund?.refundedBy && (
              <>
                <SectionHeader title="Refund Info" />
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <DetailRow
                    label="Reason"
                    value={selected.refund.reason || selected.refund.reasons}
                  />
                  <DetailRow
                    label="Refunded By"
                    value={populatedUser(selected.refund.refundedBy)?.name}
                  />
                  <DetailRow
                    label="Refunded At"
                    value={
                      selected.refund.refundedAt
                        ? new Date(selected.refund.refundedAt).toLocaleString()
                        : undefined
                    }
                  />
                </div>
              </>
            )}

            {selected.lockedBy && selected.status === "ongoing" && (
              <>
                <SectionHeader title="Currently Locked By" />
                <div className="bg-purple-50 rounded-lg p-3">
                  <DetailRow
                    label="Teacher"
                    value={`${selected.lockedBy.name} (${selected.lockedBy.email})`}
                  />
                </div>
              </>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4 border-t border-slate-200">
              <ActionButton
                icon={Eye}
                label="Close"
                onClick={() => setSelected(null)}
                color="slate"
              />
              {selected.status === "pending" && (
                <ActionButtonSolid
                  icon={CheckCircle}
                  label="Approve & Publish"
                  onClick={() => handleApprove(selected._id)}
                  disabled={processing === selected._id}
                  color="emerald"
                />
              )}
              {selected.status === "under_review" && (
                <>
                  <ActionButtonSolid
                    icon={XCircle}
                    label="Decline Booking"
                    onClick={() => openReview(selected, "decline")}
                    disabled={processing === selected._id}
                    color="red"
                  />
                  <ActionButtonSolid
                    icon={UserCheck}
                    label="Accept Booking"
                    onClick={() => openReview(selected, "approve")}
                    disabled={processing === selected._id}
                    color="emerald"
                  />
                </>
              )}
              {selected.status === "fulfilled" && (
                <>
                  <ActionButtonSolid
                    icon={Mail}
                    label="Resend Invoice"
                    onClick={() => handleResendInvoice(selected._id)}
                    disabled={processing === selected._id}
                    color="blue"
                  />
                  <ActionButtonSolid
                    icon={RotateCcw}
                    label="Refund"
                    onClick={() => {
                      setRefundTarget(selected);
                      setRefundReason("");
                    }}
                    disabled={processing === selected._id}
                    color="red"
                  />
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Refund Dialog */}
      {refundTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => {
              if (!processing) {
                setRefundTarget(null);
              }
            }}
          />
          <div
            className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              Refund Request
            </h2>
            <p className="text-sm text-slate-600 mb-4">
              Refunding{" "}
              <span className="font-medium text-slate-900">
                {refundTarget.name}
              </span>{" "}
              will reset the request back to vacant.
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="e.g. Teacher requested cancellation, Payment dispute"
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                disabled={!!processing}
                autoFocus
              />
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => {
                  setRefundTarget(null);
                  setRefundReason("");
                }}
                disabled={!!processing}
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRefund}
                disabled={!!processing || !refundReason.trim()}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-40 cursor-pointer"
              >
                {processing ? "Refunding..." : "Refund"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={reviewAction?.decision === "approve"}
        onClose={() => !processing && setReviewAction(null)}
        onConfirm={handleReviewDecision}
        title="Accept Booking"
        message={`Accept ${reviewAction?.request.lockedBy?.name || "this teacher"} for "${reviewAction?.request.name || "this request"}"? The request will be marked fulfilled, the teacher will be able to see the parent's contact, and the parent will be told who their teacher is.`}
        confirmLabel="Accept Booking"
        confirmColor="emerald"
        loading={!!reviewAction && processing === reviewAction.request._id}
      />

      {reviewAction?.decision === "decline" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => !processing && setReviewAction(null)}
          />
          <div
            className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Decline Booking</h2>
            <p className="text-sm text-slate-600 mb-4">
              <span className="font-medium text-slate-900">{reviewAction.request.name}</span>{" "}
              will go back to <span className="font-medium">vacant</span> so other teachers can
              apply.{" "}
              <span className="font-medium text-slate-900">
                {reviewAction.request.lockedBy?.name || "The teacher"}
              </span>{" "}
              won&apos;t see the parent&apos;s contact.
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4">
              {/* Mirrors announceBookingDeclined in the backend's
                  src/services/bookingReviewService.js — keep in sync. */}
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                The teacher will be told
              </p>
              <p className="text-sm text-slate-700">
                Thank you so much for your interest in this tuition, and for your patience while
                our team reviewed your booking. We&apos;re truly sorry — after careful
                consideration, we weren&apos;t able to confirm it this time, as some of this
                vacancy&apos;s requirements weren&apos;t fully met. This is in no way a reflection
                of your abilities as a teacher.{" "}
                {reviewAction.request.paymentSlip?.paymentAmount
                  ? `The Rs. ${reviewAction.request.paymentSlip.paymentAmount} you paid`
                  : "Any payment you made"}{" "}
                will be refunded to you in full, and our team will contact you shortly about it. New
                tuitions are posted every day, and we would be glad to see you apply for the next
                one that suits you.
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex gap-2 text-sm text-amber-800">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>
                Declining doesn&apos;t send money back automatically. Refund
                {reviewAction.request.paymentSlip?.paymentAmount
                  ? ` Rs. ${reviewAction.request.paymentSlip.paymentAmount}`
                  : ""}{" "}
                to the teacher yourself
                {reviewAction.request.paymentSlip?.paymentRef
                  ? ` (payment ref ${reviewAction.request.paymentSlip.paymentRef})`
                  : ""}
                . The amount and reference stay in the Lock History and Audit Logs.
              </span>
            </div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Internal note <span className="text-slate-400 font-normal">(optional, never shown to the teacher)</span>
            </label>
            <textarea
              value={declineNote}
              onChange={(e) => setDeclineNote(e.target.value)}
              placeholder="e.g. Parent asked for a female tutor; qualification below the required level"
              rows={3}
              maxLength={1000}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              disabled={!!processing}
              autoFocus
            />
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setReviewAction(null)}
                disabled={!!processing}
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleReviewDecision}
                disabled={!!processing}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-40 cursor-pointer"
              >
                {processing ? "Declining..." : "Decline Booking"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Parent Request"
        message={`Are you sure you want to delete the request from "${deleteTarget?.name || deleteTarget?.parent?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        confirmColor="red"
        loading={processing === deleteTarget?._id}
      />

      <EditParentRequestModal
        request={editing}
        onClose={() => setEditing(null)}
        onSaved={fetchAll}
      />

      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <EmptyState
          message={
            search.trim()
              ? `No ${statusFilter ? `"${labelFor("requestStatus", statusFilter)}" ` : ""}requests match "${search.trim()}"`
              : statusFilter
                ? `No "${labelFor("requestStatus", statusFilter)}" requests`
                : "No parent requests found"
          }
        />
      ) : (
        <DataTable
          columns={[
            {
              key: "name",
              header: "Name",
              render: (r) => (
                <div>
                  <span className="font-medium text-slate-900">{r.name}</span>
                  {r.parent && (
                    <p className="text-slate-400 text-xs">{r.parent.name}</p>
                  )}
                </div>
              ),
            },
            {
              key: "location",
              header: "Location",
              render: (r) => {
                const loc = r.location || "";
                const short = loc.split(",")[0] || loc;
                return (
                  <span
                    className="inline-flex items-center gap-1 text-slate-500 max-w-45"
                    title={loc}
                  >
                    <MapPin size={14} className="shrink-0" />
                    <span className="truncate">{short || "—"}</span>
                  </span>
                );
              },
            },
            {
              key: "duration",
              header: "Duration",
              render: (r) => (
                <div>
                  <span className="text-slate-500">{labelFor("duration", r.duration) || "—"}</span>
                  {r.platformFeePercent != null && (
                    <p className="text-indigo-500 text-xs">
                      {r.platformFeePercent}% fee
                    </p>
                  )}
                </div>
              ),
            },
            {
              key: "salary",
              header: "Salary",
              render: (r) => (
                <span className="text-slate-500">
                  {r.salary ? `Rs. ${r.salary}` : "—"}
                </span>
              ),
            },
            {
              key: "teacher",
              header: "Teacher",
              render: (r) =>
                r.assignedTeacher ? (
                  <span className="text-emerald-600 text-xs font-medium">
                    {r.assignedTeacher.name}
                  </span>
                ) : r.lockedBy && r.status === "under_review" ? (
                  <span className="text-orange-600 text-xs font-medium">
                    {r.lockedBy.name} (paid, awaiting review)
                  </span>
                ) : r.lockedBy ? (
                  <span className="text-purple-600 text-xs font-medium">
                    {r.lockedBy.name} (locked)
                  </span>
                ) : (
                  <span className="text-slate-300">—</span>
                ),
            },
            {
              key: "status",
              header: "Status",
              render: (r) => (
                <div className="flex items-center gap-1.5">
                  <StatusBadge status={r.status} kind="requestStatus" />
                  {r.refund?.requestedBy && !r.refund?.refundedBy && (
                    <Link
                      href="/admin/refunds"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
                    >
                      <AlertTriangle size={11} /> Refund Requested
                    </Link>
                  )}
                </div>
              ),
            },
            {
              key: "actions",
              header: "",
              render: (r) => (
                <div className="flex gap-1.5 justify-end">
                  <ActionButton
                    icon={Eye}
                    label="View"
                    onClick={() => handleView(r)}
                    color="blue"
                  />
                  {r.status === "pending" && (
                    <ActionButton
                      icon={CheckCircle}
                      label="Approve"
                      onClick={() => handleApprove(r._id)}
                      disabled={processing === r._id}
                      color="emerald"
                    />
                  )}
                  {r.status === "under_review" && (
                    <ActionButton
                      icon={UserCheck}
                      label="Review"
                      onClick={() => handleView(r)}
                      disabled={processing === r._id}
                      color="amber"
                    />
                  )}
                  {r.status === "fulfilled" && (
                    <ActionButton
                      icon={Mail}
                      label="Invoice"
                      onClick={() => handleResendInvoice(r._id)}
                      disabled={processing === r._id}
                      color="blue"
                    />
                  )}
                  <ActionButton
                    icon={LockKeyhole}
                    label="Lock"
                    onClick={() => handleLockView(r)}
                    color="purple"
                  />
                  <ActionButton
                    icon={Pencil}
                    label="Edit"
                    onClick={() => setEditing(r)}
                    disabled={processing === r._id}
                    color="amber"
                  />
                  {canDelete(r) && (
                    <ActionButton
                      icon={Trash2}
                      label="Delete"
                      onClick={() => setDeleteTarget(r)}
                      disabled={processing === r._id}
                      color="red"
                    />
                  )}
                </div>
              ),
            },
          ]}
          data={filtered}
        />
      )}
    </div>
  );
}
