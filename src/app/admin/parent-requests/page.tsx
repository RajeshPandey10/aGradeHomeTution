"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle, Eye, Trash2, MapPin, DollarSign, Clock, Pencil, RotateCcw, Mail, User, BookOpen, Percent, AlertTriangle } from "lucide-react";
import { useRealtimeRefresh } from "@/lib/socket";
import { parentService, ParentProfile } from "@/services/parentService";
import { useToast } from "@/hooks/useToast";
import { PageHeader, DataTable } from "@/components/admin/DataTable";
import { ActionButton, ActionButtonSolid, Loading, EmptyState, StatusBadge } from "@/components/admin/UI";
import { Modal } from "@/components/admin/Modal";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

function DetailRow({ label, value, icon: Icon }: { label: string; value?: string | number | null; icon?: React.ComponentType<{ size?: number; className?: string }> }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <span className="font-medium text-slate-400 text-xs uppercase tracking-wider">{label}</span>
      <p className="text-slate-900 mt-0.5 flex items-center gap-1.5">
        {Icon && <Icon size={14} className="text-slate-400" />}
        {value}
      </p>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-600 border-b border-slate-200 pb-1 pt-3">{title}</h3>;
}

export default function ParentRequestsPage() {
  const [requests, setRequests] = useState<ParentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ParentProfile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ParentProfile | null>(null);
  const [editing, setEditing] = useState<ParentProfile | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [refundTarget, setRefundTarget] = useState<ParentProfile | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const toast = useToast();

  const fetchAll = useCallback(async () => {
    try {
      const res = await parentService.getRequests();
      const sorted = (res.data || []).sort((a, b) => {
        const aPrio = a.status === "pending" ? 0 : 1;
        const bPrio = b.status === "pending" ? 0 : 1;
        if (aPrio !== bPrio) return aPrio - bPrio;
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
      setRequests(sorted);
    } catch {
      toast.error("Failed to load parent requests");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useRealtimeRefresh(fetchAll, ["parent-request:status-updated", "parent-request:created", "request:fulfilled", "request:available"]);

  const handleView = useCallback(async (r: ParentProfile) => {
    try {
      const res = await parentService.getRequestDetail(r._id);
      setSelected(res.data);
    } catch {
      setSelected(r);
    }
  }, []);

  const handleApprove = useCallback(async (requestId: string) => {
    setProcessing(requestId);
    try {
      await parentService.approve(requestId);
      toast.success("Parent request approved and published");
      setSelected(null);
      fetchAll();
    } catch {
      toast.error("Failed to approve parent request");
    } finally {
      setProcessing(null);
    }
  }, [fetchAll, toast]);

  const handleResendInvoice = useCallback(async (id: string) => {
    setProcessing(id);
    try {
      await parentService.resendInvoice(id);
      toast.success("Invoice email resent to teacher and parent");
    } catch {
      toast.error("Failed to resend invoice");
    } finally {
      setProcessing(null);
    }
  }, [toast]);

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
    } catch {
      toast.error("Failed to refund request");
    } finally {
      setProcessing(null);
    }
  }, [refundTarget, refundReason, fetchAll, toast]);

  const handleApproveRefund = useCallback(async (id: string) => {
    setProcessing(id);
    try {
      await parentService.approveRefund(id);
      toast.success("Refund approved and request reset to vacant");
      setSelected(null);
      fetchAll();
    } catch {
      toast.error("Failed to approve refund");
    } finally {
      setProcessing(null);
    }
  }, [fetchAll, toast]);

  const handleEdit = useCallback(async () => {
    if (!editing) return;
    setProcessing(editing._id);
    try {
      const payload: Record<string, unknown> = { ...editForm };
      ["subjects", "board", "specificBoard", "level", "grade", "medium"].forEach((f) => {
        if (typeof payload[f] === "string") {
          payload[f] = (payload[f] as string).split(",").map((s) => s.trim()).filter(Boolean);
        }
      });
      if (typeof payload.timeSlots === "string") {
        payload.timeSlots = (payload.timeSlots as string).split(",").map((s) => {
          const [start, end] = s.trim().split("-");
          return { start: start?.trim() || "", end: end?.trim() || "" };
        }).filter((s) => s.start && s.end);
      }
      if (payload.numberOfDays) {
        payload.numberOfDays = parseInt(payload.numberOfDays as string, 10) || null;
      }
      await parentService.update(editing._id, payload);
      toast.success("Parent request updated");
      setEditing(null);
      fetchAll();
    } catch {
      toast.error("Failed to update parent request");
    } finally {
      setProcessing(null);
    }
  }, [editing, editForm, fetchAll, toast]);

  const openEdit = useCallback((r: ParentProfile) => {
    setEditForm({
      name: r.name || "",
      phone: r.phone || "",
      location: r.location || "",
      duration: r.duration || "",
      tuitionType: r.tuitionType || "",
      daysPerWeek: r.daysPerWeek || "",
      numberOfDays: r.numberOfDays?.toString() || "",
      teacherGender: r.teacherGender || "",
      numberOfStudents: r.numberOfStudents || "",
      salary: r.salary || "",
      subjects: r.subjects?.join(", ") || "",
      board: r.board?.join(", ") || "",
      specificBoard: r.specificBoard?.join(", ") || "",
      level: r.level?.join(", ") || "",
      grade: r.grade?.join(", ") || "",
      medium: r.medium?.join(", ") || "",
      timeSlots: r.timeSlots?.map((s) => `${s.start}-${s.end}`).join(", ") || "",
      requirements: r.requirements || "",
    });
    setEditing(r);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setProcessing(deleteTarget._id);
    try {
      await parentService.delete(deleteTarget._id);
      toast.success("Parent request deleted");
      setDeleteTarget(null);
      fetchAll();
    } catch {
      toast.error("Failed to delete parent request");
    } finally {
      setProcessing(null);
    }
  }, [deleteTarget, fetchAll, toast]);

  const filtered = statusFilter ? requests.filter((r) => r.status === statusFilter) : requests;

  return (
    <div>
      <PageHeader title="Parent Requests" subtitle="Review and approve tuition requests from parents" />

      <div className="flex gap-1.5 mb-5 flex-wrap">
        {[
          { label: "All", value: "" },
          { label: "Pending", value: "pending" },
          { label: "Vacant", value: "vacant" },
          { label: "Ongoing", value: "ongoing" },
          { label: "Fulfilled", value: "fulfilled" },
        ].map((tab) => (
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
          </button>
        ))}
      </div>

      {/* Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Request Details" wide>
        {selected && (
          <div className="space-y-3 text-sm max-h-[75vh] overflow-y-auto pr-1">
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={selected.status} />
              {selected.platformFeePercent != null && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                  <Percent size={12} /> {selected.platformFeePercent}% fee
                </span>
              )}
              {selected.createdAt && (
                <span className="text-slate-400 text-xs">Created {new Date(selected.createdAt).toLocaleDateString()}</span>
              )}
            </div>

            <SectionHeader title="Tuition Details" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DetailRow label="Name" value={selected.name} icon={User} />
              <DetailRow label="Phone" value={selected.phone} />
              <DetailRow label="Location" value={selected.location} icon={MapPin} />
              <DetailRow label="Salary" value={selected.salary ? `Rs. ${selected.salary}` : undefined} icon={DollarSign} />
              <DetailRow label="Duration" value={selected.duration} icon={Clock} />
              <DetailRow label="Tuition Type" value={selected.tuitionType} />
              <DetailRow label="Days Per Week" value={selected.daysPerWeek} />
              <DetailRow label="Number of Days" value={selected.numberOfDays} />
              <DetailRow label="Teacher Gender" value={selected.teacherGender} />
              <DetailRow label="Number of Students" value={selected.numberOfStudents} />
            </div>
            <DetailRow label="Subjects" value={selected.subjects?.join(", ")} icon={BookOpen} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DetailRow label="Board" value={selected.board?.join(", ")} />
              <DetailRow label="Level" value={selected.level?.join(", ")} />
              <DetailRow label="Grade" value={selected.grade?.join(", ")} />
              <DetailRow label="Medium" value={selected.medium?.join(", ")} />
            </div>
            <DetailRow label="Time Slots" value={selected.timeSlots?.map((s) => `${s.start}-${s.end}`).join(", ")} />
            <DetailRow label="Requirements" value={selected.requirements} />

            {selected.parent && (
              <>
                <SectionHeader title="Parent Info" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <DetailRow label="Name" value={selected.parent.name} icon={User} />
                  <DetailRow label="Email" value={selected.parent.email} />
                  <DetailRow label="Phone" value={selected.parent.phoneNumber} />
                </div>
              </>
            )}

            {selected.assignedTeacher && (
              <>
                <SectionHeader title="Assigned Teacher" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <DetailRow label="Name" value={selected.assignedTeacher.name} icon={User} />
                  <DetailRow label="Email" value={selected.assignedTeacher.email} />
                  <DetailRow label="Phone" value={selected.assignedTeacher.phoneNumber} />
                </div>
              </>
            )}
            {selected.teacherProfile && (
              <>
                <SectionHeader title="Teacher Profile" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <DetailRow label="Name" value={selected.teacherProfile.name} />
                  <DetailRow label="Phone" value={selected.teacherProfile.phone} />
                  <DetailRow label="Address" value={selected.teacherProfile.address} />
                  <DetailRow label="Gender" value={selected.teacherProfile.gender} />
                  <DetailRow label="Qualification" value={selected.teacherProfile.academicQualification} />
                  <DetailRow label="Experience" value={selected.teacherProfile.experience} />
                </div>
                <DetailRow label="About" value={selected.teacherProfile.about} />
              </>
            )}

            {selected.payment && selected.payment.grossAmount > 0 && (
              <>
                <SectionHeader title="Payment Breakdown" />
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <DetailRow label="Gross Amount" value={`Rs. ${selected.payment.grossAmount}`} icon={DollarSign} />
                    <DetailRow label={`Platform Fee (${selected.payment.percentage}%)`} value={`Rs. ${selected.payment.payable}`} />
                    {selected.payment.couponType && (
                      <DetailRow label={`Coupon (${selected.payment.couponType})`} value={selected.payment.couponValue} />
                    )}
                    <DetailRow label="Teacher Net Amount" value={`Rs. ${selected.payment.total}`} />
                  </div>
                </div>
              </>
            )}

            {selected.paymentSlip && selected.paymentSlip.paymentAmount && (
              <>
                <SectionHeader title="Payment Slip" />
                <div className="bg-emerald-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <DetailRow label="Amount Paid" value={`Rs. ${selected.paymentSlip.paymentAmount}`} icon={DollarSign} />
                    <DetailRow label="Medium" value={selected.paymentSlip.medium} />
                    <DetailRow label="Reference" value={selected.paymentSlip.paymentRef} />
                    <DetailRow label="Paid At" value={selected.paymentSlip.paidAt ? new Date(selected.paymentSlip.paidAt).toLocaleString() : undefined} />
                  </div>
                </div>
              </>
            )}

            {selected.refund?.requestedBy && !selected.refund?.refundedBy && (
              <>
                <SectionHeader title="Pending Refund Request" />
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <DetailRow label="Requested By" value={selected.refund.requestedBy.name} />
                  <DetailRow label="Reason" value={selected.refund.reason || selected.refund.reasons} />
                  {selected.refund.phoneNumber && <DetailRow label="Phone" value={selected.refund.phoneNumber} />}
                  <DetailRow label="Requested At" value={selected.refund.requestedAt ? new Date(selected.refund.requestedAt).toLocaleString() : undefined} />
                </div>
              </>
            )}

            {selected.refund?.refundedBy && (
              <>
                <SectionHeader title="Refund Info" />
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <DetailRow label="Reason" value={selected.refund.reason} />
                  <DetailRow label="Refunded By" value={selected.refund.refundedBy?.name} />
                  <DetailRow label="Refunded At" value={selected.refund.refundedAt ? new Date(selected.refund.refundedAt).toLocaleString() : undefined} />
                </div>
              </>
            )}

            {selected.lockedBy && selected.status === "ongoing" && (
              <>
                <SectionHeader title="Currently Locked By" />
                <div className="bg-purple-50 rounded-lg p-3">
                  <DetailRow label="Teacher" value={`${selected.lockedBy.name} (${selected.lockedBy.email})`} />
                </div>
              </>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4 border-t border-slate-200">
              <ActionButton icon={Eye} label="Close" onClick={() => setSelected(null)} color="slate" />
              {selected.status === "pending" && (
                <ActionButtonSolid icon={CheckCircle} label="Approve & Publish" onClick={() => handleApprove(selected._id)} disabled={processing === selected._id} color="emerald" />
              )}
              {selected.status === "fulfilled" && selected.refund?.requestedBy && !selected.refund?.refundedBy && (
                <ActionButtonSolid icon={AlertTriangle} label="Approve Refund" onClick={() => handleApproveRefund(selected._id)} disabled={processing === selected._id} color="orange" />
              )}
              {selected.status === "fulfilled" && (
                <>
                  <ActionButtonSolid icon={Mail} label="Resend Invoice" onClick={() => handleResendInvoice(selected._id)} disabled={processing === selected._id} color="blue" />
                  <ActionButtonSolid icon={RotateCcw} label="Refund" onClick={() => { setRefundTarget(selected); setRefundReason(""); }} disabled={processing === selected._id} color="red" />
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Refund Dialog */}
      {refundTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => { if (!processing) { setRefundTarget(null); } }} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Refund Request</h2>
            <p className="text-sm text-slate-600 mb-4">
              Refunding <span className="font-medium text-slate-900">{refundTarget.name}</span> will reset the request back to vacant.
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
              <button onClick={() => { setRefundTarget(null); setRefundReason(""); }} disabled={!!processing} className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40 cursor-pointer">Cancel</button>
              <button onClick={handleRefund} disabled={!!processing || !refundReason.trim()} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-40 cursor-pointer">{processing ? "Refunding..." : "Refund"}</button>
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

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Parent Request" wide>
        {editing && (
          <div className="space-y-5 text-sm max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-medium text-slate-400 text-xs uppercase tracking-wider block mb-1">Name</label>
                <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" value={editForm.name || ""} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="font-medium text-slate-400 text-xs uppercase tracking-wider block mb-1">Phone</label>
                <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" value={editForm.phone || ""} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="font-medium text-slate-400 text-xs uppercase tracking-wider block mb-1">Location</label>
              <textarea className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2} value={editForm.location || ""} onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-medium text-slate-400 text-xs uppercase tracking-wider block mb-1">Duration</label>
                <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" value={editForm.duration || ""} onChange={(e) => setEditForm((f) => ({ ...f, duration: e.target.value }))} />
              </div>
              <div>
                <label className="font-medium text-slate-400 text-xs uppercase tracking-wider block mb-1">Tuition Type</label>
                <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" value={editForm.tuitionType || ""} onChange={(e) => setEditForm((f) => ({ ...f, tuitionType: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-medium text-slate-400 text-xs uppercase tracking-wider block mb-1">Days Per Week</label>
                <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" value={editForm.daysPerWeek || ""} onChange={(e) => setEditForm((f) => ({ ...f, daysPerWeek: e.target.value }))} />
              </div>
              <div>
                <label className="font-medium text-slate-400 text-xs uppercase tracking-wider block mb-1">Number of Days</label>
                <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" type="number" value={editForm.numberOfDays || ""} onChange={(e) => setEditForm((f) => ({ ...f, numberOfDays: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-medium text-slate-400 text-xs uppercase tracking-wider block mb-1">Teacher Gender</label>
                <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" value={editForm.teacherGender || ""} onChange={(e) => setEditForm((f) => ({ ...f, teacherGender: e.target.value }))}>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Any">Any</option>
                </select>
              </div>
              <div>
                <label className="font-medium text-slate-400 text-xs uppercase tracking-wider block mb-1">Number of Students</label>
                <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" value={editForm.numberOfStudents || ""} onChange={(e) => setEditForm((f) => ({ ...f, numberOfStudents: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-medium text-slate-400 text-xs uppercase tracking-wider block mb-1">Salary</label>
                <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" value={editForm.salary || ""} onChange={(e) => setEditForm((f) => ({ ...f, salary: e.target.value }))} />
              </div>
              <div>
                <label className="font-medium text-slate-400 text-xs uppercase tracking-wider block mb-1">Board (comma separated)</label>
                <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" value={editForm.board || ""} onChange={(e) => setEditForm((f) => ({ ...f, board: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-medium text-slate-400 text-xs uppercase tracking-wider block mb-1">Specific Board</label>
                <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" value={editForm.specificBoard || ""} onChange={(e) => setEditForm((f) => ({ ...f, specificBoard: e.target.value }))} />
              </div>
              <div>
                <label className="font-medium text-slate-400 text-xs uppercase tracking-wider block mb-1">Level (comma separated)</label>
                <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" value={editForm.level || ""} onChange={(e) => setEditForm((f) => ({ ...f, level: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-medium text-slate-400 text-xs uppercase tracking-wider block mb-1">Grade (comma separated)</label>
                <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" value={editForm.grade || ""} onChange={(e) => setEditForm((f) => ({ ...f, grade: e.target.value }))} />
              </div>
              <div>
                <label className="font-medium text-slate-400 text-xs uppercase tracking-wider block mb-1">Medium (comma separated)</label>
                <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" value={editForm.medium || ""} onChange={(e) => setEditForm((f) => ({ ...f, medium: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="font-medium text-slate-400 text-xs uppercase tracking-wider block mb-1">Subjects (comma separated)</label>
              <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" value={editForm.subjects || ""} onChange={(e) => setEditForm((f) => ({ ...f, subjects: e.target.value }))} />
            </div>
            <div>
              <label className="font-medium text-slate-400 text-xs uppercase tracking-wider block mb-1">Time Slots (e.g. 10:00-12:00, 14:00-16:00)</label>
              <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" value={editForm.timeSlots || ""} onChange={(e) => setEditForm((f) => ({ ...f, timeSlots: e.target.value }))} />
            </div>
            <div>
              <label className="font-medium text-slate-400 text-xs uppercase tracking-wider block mb-1">Requirements</label>
              <textarea className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2} value={editForm.requirements || ""} onChange={(e) => setEditForm((f) => ({ ...f, requirements: e.target.value }))} />
            </div>
            <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
              <ActionButton icon={Eye} label="Cancel" onClick={() => setEditing(null)} color="slate" />
              <ActionButtonSolid icon={CheckCircle} label="Save" onClick={handleEdit} disabled={processing === editing._id} color="blue" />
            </div>
          </div>
        )}
      </Modal>

      {loading ? <Loading /> : filtered.length === 0 ? <EmptyState message={statusFilter ? `No ${statusFilter} requests` : "No parent requests found"} /> : (
        <DataTable
          columns={[
            { key: "name", header: "Name", render: (r) => (
              <div>
                <span className="font-medium text-slate-900">{r.name}</span>
                {r.parent && <p className="text-slate-400 text-xs">{r.parent.name}</p>}
              </div>
            )},
            { key: "location", header: "Location", render: (r) => {
              const loc = r.location || "";
              const short = loc.split(",")[0] || loc;
              return (
                <span className="inline-flex items-center gap-1 text-slate-500 max-w-[180px]" title={loc}>
                  <MapPin size={14} className="shrink-0" />
                  <span className="truncate">{short || "—"}</span>
                </span>
              );
            }},
            { key: "duration", header: "Duration", render: (r) => (
              <div>
                <span className="text-slate-500">{r.duration || "—"}</span>
                {r.platformFeePercent != null && <p className="text-indigo-500 text-xs">{r.platformFeePercent}% fee</p>}
              </div>
            )},
            { key: "salary", header: "Salary", render: (r) => <span className="text-slate-500">{r.salary ? `Rs. ${r.salary}` : "—"}</span> },
            { key: "teacher", header: "Teacher", render: (r) => r.assignedTeacher ? (
              <span className="text-emerald-600 text-xs font-medium">{r.assignedTeacher.name}</span>
            ) : r.lockedBy ? (
              <span className="text-purple-600 text-xs font-medium">{r.lockedBy.name} (locked)</span>
            ) : <span className="text-slate-300">—</span> },
            { key: "status", header: "Status", render: (r) => (
              <div className="flex items-center gap-1.5">
                <StatusBadge status={r.status} />
                {r.refund?.requestedBy && !r.refund?.refundedBy && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                    <AlertTriangle size={11} /> Refund Requested
                  </span>
                )}
              </div>
            ) },
            { key: "actions", header: "", render: (r) => (
              <div className="flex gap-1.5 justify-end">
                <ActionButton icon={Eye} label="View" onClick={() => handleView(r)} color="blue" />
                {r.status === "pending" && (
                  <ActionButton icon={CheckCircle} label="Approve" onClick={() => handleApprove(r._id)} disabled={processing === r._id} color="emerald" />
                )}
                {r.status === "fulfilled" && (
                  <ActionButton icon={Mail} label="Invoice" onClick={() => handleResendInvoice(r._id)} disabled={processing === r._id} color="blue" />
                )}
                <ActionButton icon={Pencil} label="Edit" onClick={() => openEdit(r)} disabled={processing === r._id} color="amber" />
                <ActionButton icon={Trash2} label="Delete" onClick={() => setDeleteTarget(r)} disabled={processing === r._id} color="red" />
              </div>
            )},
          ]}
          data={filtered}
        />
      )}
    </div>
  );
}
