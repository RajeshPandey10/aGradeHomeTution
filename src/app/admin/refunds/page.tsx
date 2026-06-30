"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CheckCircle,
  XCircle,
  Eye,
  MapPin,
  DollarSign,
  User,
  Phone,
  Mail,
  Calendar,
  ImageIcon,
  RotateCcw,
  Trash2,
  FileText,
  ExternalLink,
  ZoomIn,
} from "lucide-react";
import { parentService, ParentProfile } from "@/services/parentService";
import { useToast } from "@/hooks/useToast";
import { useRealtimeRefresh } from "@/lib/socket";
import { PageHeader, DataTable } from "@/components/admin/DataTable";
import { ActionButton, ActionButtonSolid, Loading, EmptyState } from "@/components/admin/UI";
import { Modal } from "@/components/admin/Modal";
import { ImageLightbox, useLightbox } from "@/components/admin/ImageLightbox";
import api from "@/lib/axios";

interface TeacherProfileSnapshot {
  name?: string;
  address?: string;
  phone?: string;
  gender?: string;
  academicQualification?: string;
  experience?: string;
  about?: string;
  cv?: string;
  identification?: string[];
  status?: string;
}

interface RefundSnapshot {
  tuition?: { name?: string; location?: string; salary?: string; duration?: string };
  parent?: { _id: string; name?: string; email?: string; phoneNumber?: string } | null;
  teacher?: { _id: string; name?: string; email?: string; phoneNumber?: string; profile?: TeacherProfileSnapshot | null } | null;
  originalRefundRequest?: { reason?: string; reasons?: string; phoneNumber?: string; qrImage?: string; requestedAt?: string };
  resolution?: "vacant" | "delete" | "keep";
  adminReason?: string;
}

interface RefundLog {
  _id: string;
  action: "refund_approved" | "refund_rejected";
  performedBy: { _id: string; name: string; email: string } | null;
  targetId: string;
  details?: RefundSnapshot;
  createdAt: string;
}

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

function CvLink({ url }: { url?: string | null }) {
  if (!url) return null;
  return (
    <div>
      <span className="font-medium text-slate-400 text-xs uppercase tracking-wider">CV</span>
      <a href={url} target="_blank" rel="noopener noreferrer" className="mt-0.5 inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 hover:underline text-sm font-medium">
        <FileText size={14} />
        View CV
        <ExternalLink size={12} />
      </a>
    </div>
  );
}

function IdentificationLinks({ urls, onZoom }: { urls?: string[] | null; onZoom: (url: string) => void }) {
  if (!urls || urls.length === 0) return null;
  return (
    <div>
      <span className="font-medium text-slate-400 text-xs uppercase tracking-wider">Identification Documents</span>
      <div className="flex flex-wrap gap-2 mt-1">
        {urls.map((url, i) => (
          <button key={url} type="button" onClick={() => onZoom(url)} className="block cursor-zoom-in group relative">
            <img src={url} alt={`ID ${i + 1}`} className="w-16 h-16 object-cover rounded-lg border border-slate-200 group-hover:border-blue-400 transition-colors" />
            <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg">
              <ZoomIn size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function QrPreview({ url, onZoom }: { url?: string | null; onZoom: (url: string) => void }) {
  if (!url) return null;
  return (
    <div>
      <span className="font-medium text-slate-400 text-xs uppercase tracking-wider flex items-center gap-1"><ImageIcon size={12} /> QR Code</span>
      <button type="button" onClick={() => onZoom(url)} className="mt-1 block cursor-zoom-in group relative w-40 h-40">
        <img src={url} alt="Refund QR" className="w-40 h-40 object-contain rounded-lg border border-amber-200 group-hover:border-blue-400 transition-colors bg-white" />
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg">
          <ZoomIn size={22} className="text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
        </span>
      </button>
    </div>
  );
}

function TeacherProfileSection({ name, email, phoneNumber, profile, onZoom }: { name?: string; email?: string; phoneNumber?: string; profile?: TeacherProfileSnapshot | null; onZoom: (url: string) => void }) {
  return (
    <>
      <SectionHeader title="Teacher" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <DetailRow label="Name" value={name} icon={User} />
        <DetailRow label="Email" value={email} icon={Mail} />
        <DetailRow label="Phone" value={phoneNumber || profile?.phone} icon={Phone} />
        <DetailRow label="Gender" value={profile?.gender} />
        <DetailRow label="Qualification" value={profile?.academicQualification} />
        <DetailRow label="Experience" value={profile?.experience} />
      </div>
      <DetailRow label="About" value={profile?.about} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <CvLink url={profile?.cv} />
      </div>
      <IdentificationLinks urls={profile?.identification} onZoom={onZoom} />
    </>
  );
}

type Tab = "pending" | "approved" | "rejected";
type ApproveResolution = "vacant" | "delete";
type RejectResolution = "keep" | "vacant" | "delete";

export default function RefundsPage() {
  const [requests, setRequests] = useState<ParentProfile[]>([]);
  const [approvedLogs, setApprovedLogs] = useState<RefundLog[]>([]);
  const [rejectedLogs, setRejectedLogs] = useState<RefundLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("pending");
  const [selected, setSelected] = useState<ParentProfile | null>(null);
  const [selectedLog, setSelectedLog] = useState<RefundLog | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ParentProfile | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectResolution, setRejectResolution] = useState<RejectResolution>("keep");
  const [approveTarget, setApproveTarget] = useState<ParentProfile | null>(null);
  const [approveResolution, setApproveResolution] = useState<ApproveResolution>("vacant");
  const [approveReason, setApproveReason] = useState("");
  const { lightboxSrc, openLightbox, closeLightbox } = useLightbox();
  const toast = useToast();

  const fetchAll = useCallback(async () => {
    try {
      const [requestsRes, approvedRes, rejectedRes] = await Promise.all([
        parentService.getRequests(),
        api.get("/api/admin/audit-logs", { params: { action: "refund_approved", limit: 50 } }),
        api.get("/api/admin/audit-logs", { params: { action: "refund_rejected", limit: 50 } }),
      ]);
      setRequests(requestsRes.data || []);
      setApprovedLogs(approvedRes.data.data?.logs || []);
      setRejectedLogs(rejectedRes.data.data?.logs || []);
    } catch {
      toast.error("Failed to load refund requests");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useRealtimeRefresh(fetchAll, ["request:available", "request:fulfilled", "parent-request:status-updated", "parent-request:deleted"]);

  const pending = requests.filter((r) => r.refund?.requestedBy && !r.refund?.refundedBy);

  const handleView = useCallback(async (r: ParentProfile) => {
    try {
      const res = await parentService.getRequestDetail(r._id);
      setSelected(res.data);
    } catch {
      setSelected(r);
    }
  }, []);

  const handleApprove = useCallback(async () => {
    if (!approveTarget || !approveReason.trim()) return;
    setProcessing(approveTarget._id);
    try {
      await parentService.approveRefund(approveTarget._id, approveResolution, approveReason.trim());
      toast.success(
        approveResolution === "delete"
          ? "Refund approved — tuition request closed permanently"
          : "Refund approved — request reset to vacant",
      );
      setApproveTarget(null);
      setApproveReason("");
      setSelected(null);
      fetchAll();
    } catch {
      toast.error("Failed to approve refund");
    } finally {
      setProcessing(null);
    }
  }, [approveTarget, approveResolution, approveReason, fetchAll, toast]);

  const handleReject = useCallback(async () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    setProcessing(rejectTarget._id);
    try {
      await parentService.rejectRefund(rejectTarget._id, rejectReason.trim(), rejectResolution);
      toast.success(
        rejectResolution === "delete"
          ? "Refund rejected — tuition request closed permanently"
          : rejectResolution === "vacant"
            ? "Refund rejected — request reset to vacant"
            : "Refund request rejected",
      );
      setRejectTarget(null);
      setRejectReason("");
      setRejectResolution("keep");
      setSelected(null);
      fetchAll();
    } catch {
      toast.error("Failed to reject refund");
    } finally {
      setProcessing(null);
    }
  }, [rejectTarget, rejectReason, rejectResolution, fetchAll, toast]);

  const tabs: { label: string; value: Tab; count: number }[] = [
    { label: "Pending", value: "pending", count: pending.length },
    { label: "Approved", value: "approved", count: approvedLogs.length },
    { label: "Rejected", value: "rejected", count: rejectedLogs.length },
  ];

  return (
    <div>
      <PageHeader title="Refund Requests" subtitle="Review, approve, or reject refund requests submitted by teachers" />

      <div className="flex gap-1.5 mb-5 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              tab === t.value ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {t.label} {t.count > 0 && <span className="ml-1 opacity-80">({t.count})</span>}
          </button>
        ))}
      </div>

      {/* Pending Detail Modal (live data) */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Refund Details" wide>
        {selected && (
          <div className="space-y-3 text-sm max-h-[75vh] overflow-y-auto pr-1">
            <SectionHeader title="Tuition" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DetailRow label="Name" value={selected.name} icon={User} />
              <DetailRow label="Location" value={selected.location} icon={MapPin} />
              <DetailRow label="Salary" value={selected.salary ? `Rs. ${selected.salary}` : undefined} icon={DollarSign} />
              <DetailRow label="Duration" value={selected.duration} />
            </div>

            {selected.parent && (
              <>
                <SectionHeader title="Parent" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <DetailRow label="Name" value={selected.parent.name} icon={User} />
                  <DetailRow label="Email" value={selected.parent.email} icon={Mail} />
                  <DetailRow label="Phone" value={selected.parent.phoneNumber} icon={Phone} />
                </div>
              </>
            )}

            {selected.assignedTeacher && (
              <TeacherProfileSection
                name={selected.assignedTeacher.name}
                email={selected.assignedTeacher.email}
                phoneNumber={selected.assignedTeacher.phoneNumber}
                profile={selected.teacherProfile}
                onZoom={openLightbox}
              />
            )}

            {selected.payment && selected.payment.grossAmount > 0 && (
              <>
                <SectionHeader title="Payment Breakdown" />
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <DetailRow label="Gross Amount" value={`Rs. ${selected.payment.grossAmount}`} icon={DollarSign} />
                    <DetailRow label={`Platform Fee (${selected.payment.percentage}%)`} value={`Rs. ${selected.payment.payable}`} />
                    <DetailRow label="Teacher Net Amount" value={`Rs. ${selected.payment.total}`} />
                  </div>
                </div>
              </>
            )}

            {selected.refund?.requestedBy && !selected.refund?.refundedBy && (
              <>
                <SectionHeader title="Refund Request" />
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                  <DetailRow label="Requested By" value={selected.refund.requestedBy.name} icon={User} />
                  <DetailRow label="Reason" value={selected.refund.reason || selected.refund.reasons} />
                  {selected.refund.phoneNumber && <DetailRow label="Phone" value={selected.refund.phoneNumber} icon={Phone} />}
                  <DetailRow label="Requested At" value={selected.refund.requestedAt ? new Date(selected.refund.requestedAt).toLocaleString() : undefined} icon={Calendar} />
                  <QrPreview url={selected.refund.qrImage} onZoom={openLightbox} />
                </div>
              </>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4 border-t border-slate-200">
              <ActionButton icon={Eye} label="Close" onClick={() => setSelected(null)} color="slate" />
              {selected.refund?.requestedBy && !selected.refund?.refundedBy && (
                <>
                  <ActionButtonSolid icon={CheckCircle} label="Approve Refund" onClick={() => { setApproveTarget(selected); setApproveResolution("vacant"); setApproveReason(""); }} disabled={processing === selected._id} color="emerald" />
                  <ActionButtonSolid icon={XCircle} label="Reject Refund" onClick={() => { setRejectTarget(selected); setRejectReason(""); setRejectResolution("keep"); }} disabled={processing === selected._id} color="red" />
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Historical Detail Modal (approved/rejected snapshot) */}
      <Modal open={!!selectedLog} onClose={() => setSelectedLog(null)} title={selectedLog?.action === "refund_approved" ? "Approved Refund Details" : "Rejected Refund Details"} wide>
        {selectedLog && (
          <div className="space-y-3 text-sm max-h-[75vh] overflow-y-auto pr-1">
            {selectedLog.details?.tuition && (
              <>
                <SectionHeader title="Tuition" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <DetailRow label="Name" value={selectedLog.details.tuition.name} icon={User} />
                  <DetailRow label="Location" value={selectedLog.details.tuition.location} icon={MapPin} />
                  <DetailRow label="Salary" value={selectedLog.details.tuition.salary ? `Rs. ${selectedLog.details.tuition.salary}` : undefined} icon={DollarSign} />
                  <DetailRow label="Duration" value={selectedLog.details.tuition.duration} />
                </div>
              </>
            )}

            {selectedLog.details?.parent && (
              <>
                <SectionHeader title="Parent" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <DetailRow label="Name" value={selectedLog.details.parent.name} icon={User} />
                  <DetailRow label="Email" value={selectedLog.details.parent.email} icon={Mail} />
                  <DetailRow label="Phone" value={selectedLog.details.parent.phoneNumber} icon={Phone} />
                </div>
              </>
            )}

            {selectedLog.details?.teacher && (
              <TeacherProfileSection
                name={selectedLog.details.teacher.name}
                email={selectedLog.details.teacher.email}
                phoneNumber={selectedLog.details.teacher.phoneNumber}
                profile={selectedLog.details.teacher.profile}
                onZoom={openLightbox}
              />
            )}

            {selectedLog.details?.originalRefundRequest && (
              <>
                <SectionHeader title="Original Refund Request" />
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                  <DetailRow label="Reason" value={selectedLog.details.originalRefundRequest.reason || selectedLog.details.originalRefundRequest.reasons} />
                  {selectedLog.details.originalRefundRequest.phoneNumber && <DetailRow label="Phone" value={selectedLog.details.originalRefundRequest.phoneNumber} icon={Phone} />}
                  <DetailRow label="Requested At" value={selectedLog.details.originalRefundRequest.requestedAt ? new Date(selectedLog.details.originalRefundRequest.requestedAt).toLocaleString() : undefined} icon={Calendar} />
                  <QrPreview url={selectedLog.details.originalRefundRequest.qrImage} onZoom={openLightbox} />
                </div>
              </>
            )}

            <SectionHeader title={selectedLog.action === "refund_approved" ? "Approval Decision" : "Rejection Decision"} />
            <div className={`border rounded-lg p-4 space-y-2 ${selectedLog.action === "refund_approved" ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
              <DetailRow label="Admin Reason" value={selectedLog.details?.adminReason} />
              {selectedLog.details?.resolution && (
                <DetailRow
                  label="Resolution"
                  value={
                    selectedLog.details.resolution === "delete"
                      ? "Request deleted permanently"
                      : selectedLog.details.resolution === "vacant"
                        ? "Reset to vacant"
                        : "Kept as is — no change to listing"
                  }
                />
              )}
              <DetailRow label="Decided By" value={selectedLog.performedBy?.name} icon={User} />
              <DetailRow label="Decided At" value={new Date(selectedLog.createdAt).toLocaleString()} icon={Calendar} />
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200">
              <ActionButton icon={Eye} label="Close" onClick={() => setSelectedLog(null)} color="slate" />
            </div>
          </div>
        )}
      </Modal>

      {/* Approve Dialog — choose resolution + reason after calling the parent */}
      {approveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => { if (!processing) { setApproveTarget(null); } }} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Approve Refund</h2>
            <p className="text-sm text-slate-600 mb-4">
              Call <span className="font-medium text-slate-900">{approveTarget.parent?.name || "the parent"}</span> first to confirm whether they want to continue with aGrade. Then choose what happens to <span className="font-medium text-slate-900">{approveTarget.name}</span>&apos;s tuition request.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => setApproveResolution("vacant")}
                disabled={!!processing}
                className={`w-full text-left p-4 rounded-lg border-2 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                  approveResolution === "vacant" ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start gap-3">
                  <RotateCcw size={18} className={approveResolution === "vacant" ? "text-blue-600" : "text-slate-400"} />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Reset to Vacant</p>
                    <p className="text-xs text-slate-500 mt-0.5">Parent still wants a tutor — reopen this request so other teachers can apply.</p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => setApproveResolution("delete")}
                disabled={!!processing}
                className={`w-full text-left p-4 rounded-lg border-2 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                  approveResolution === "delete" ? "border-red-500 bg-red-50" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start gap-3">
                  <Trash2 size={18} className={approveResolution === "delete" ? "text-red-600" : "text-slate-400"} />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Delete Request Permanently</p>
                    <p className="text-xs text-slate-500 mt-0.5">Parent does not want to continue with aGrade — close and remove this tuition request for good.</p>
                  </div>
                </div>
              </button>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={approveReason}
                onChange={(e) => setApproveReason(e.target.value)}
                placeholder="e.g. Confirmed with parent — they will look for a new tutor"
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                disabled={!!processing}
                autoFocus
              />
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setApproveTarget(null); setApproveReason(""); }} disabled={!!processing} className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40 cursor-pointer">Cancel</button>
              <button
                onClick={handleApprove}
                disabled={!!processing || !approveReason.trim()}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-40 cursor-pointer ${
                  approveResolution === "delete" ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {processing ? "Processing..." : approveResolution === "delete" ? "Approve & Delete" : "Approve & Set Vacant"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Dialog — refund money is denied; listing resolution is a separate choice */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => { if (!processing) { setRejectTarget(null); } }} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Reject Refund Request</h2>
            <p className="text-sm text-slate-600 mb-4">
              The platform fee will <span className="font-medium text-slate-900">not</span> be refunded for <span className="font-medium text-slate-900">{rejectTarget.name}</span>. Separately, choose what happens to the tuition listing.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => setRejectResolution("keep")}
                disabled={!!processing}
                className={`w-full text-left p-4 rounded-lg border-2 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                  rejectResolution === "keep" ? "border-slate-500 bg-slate-50" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start gap-3">
                  <CheckCircle size={18} className={rejectResolution === "keep" ? "text-slate-700" : "text-slate-400"} />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Keep As Is (default)</p>
                    <p className="text-xs text-slate-500 mt-0.5">No refund, no change — teacher keeps the assignment, request stays fulfilled.</p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => setRejectResolution("vacant")}
                disabled={!!processing}
                className={`w-full text-left p-4 rounded-lg border-2 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                  rejectResolution === "vacant" ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start gap-3">
                  <RotateCcw size={18} className={rejectResolution === "vacant" ? "text-blue-600" : "text-slate-400"} />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Reset to Vacant</p>
                    <p className="text-xs text-slate-500 mt-0.5">No refund given, but the teacher is leaving anyway — reopen for other teachers.</p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => setRejectResolution("delete")}
                disabled={!!processing}
                className={`w-full text-left p-4 rounded-lg border-2 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                  rejectResolution === "delete" ? "border-red-500 bg-red-50" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start gap-3">
                  <Trash2 size={18} className={rejectResolution === "delete" ? "text-red-600" : "text-slate-400"} />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Delete Request Permanently</p>
                    <p className="text-xs text-slate-500 mt-0.5">No refund given, and the parent doesn't want to continue — close and remove this tuition request.</p>
                  </div>
                </div>
              </button>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Refund policy not applicable, insufficient grounds"
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                disabled={!!processing}
                autoFocus
              />
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setRejectTarget(null); setRejectReason(""); setRejectResolution("keep"); }} disabled={!!processing} className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40 cursor-pointer">Cancel</button>
              <button
                onClick={handleReject}
                disabled={!!processing || !rejectReason.trim()}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-40 cursor-pointer ${
                  rejectResolution === "delete" ? "bg-red-600 hover:bg-red-700" : rejectResolution === "vacant" ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-700 hover:bg-slate-800"
                }`}
              >
                {processing ? "Processing..." : rejectResolution === "delete" ? "Reject & Delete" : rejectResolution === "vacant" ? "Reject & Set Vacant" : "Reject Refund"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <Loading />
      ) : tab === "pending" ? (
        pending.length === 0 ? <EmptyState message="No pending refund requests" /> : (
          <DataTable
            columns={[
              { key: "name", header: "Tuition", render: (r) => (
                <div>
                  <span className="font-medium text-slate-900">{r.name}</span>
                  <p className="text-slate-400 text-xs flex items-center gap-1"><MapPin size={11} />{r.location?.split(",")[0] || "—"}</p>
                </div>
              )},
              { key: "parent", header: "Parent", render: (r) => (
                <div>
                  <span className="text-slate-900 font-medium">{r.parent?.name || "—"}</span>
                  <p className="text-slate-400 text-xs flex items-center gap-1">{r.parent?.phoneNumber ? (<><Phone size={11} />{r.parent.phoneNumber}</>) : "—"}</p>
                </div>
              )},
              { key: "requestedBy", header: "Requested By", render: (r) => (
                <div>
                  <span className="text-slate-900 font-medium">{r.refund?.requestedBy?.name || "—"}</span>
                  <p className="text-slate-400 text-xs">{r.refund?.requestedBy?.email}</p>
                </div>
              )},
              { key: "reason", header: "Reason", render: (r) => (
                <span className="text-slate-600 text-xs max-w-65 block whitespace-normal">{r.refund?.reason || r.refund?.reasons || "—"}</span>
              )},
              { key: "requestedAt", header: "Requested At", render: (r) => (
                <span className="inline-flex items-center gap-1 text-slate-500 text-xs"><Calendar size={12} />{r.refund?.requestedAt ? new Date(r.refund.requestedAt).toLocaleDateString() : "—"}</span>
              )},
              { key: "actions", header: "", render: (r) => (
                <div className="flex gap-1.5 justify-end">
                  <ActionButton icon={Eye} label="View" onClick={() => handleView(r)} color="blue" />
                  <ActionButton icon={CheckCircle} label="Approve" onClick={() => { setApproveTarget(r); setApproveResolution("vacant"); setApproveReason(""); }} disabled={processing === r._id} color="emerald" />
                  <ActionButton icon={XCircle} label="Reject" onClick={() => { setRejectTarget(r); setRejectReason(""); setRejectResolution("keep"); }} disabled={processing === r._id} color="red" />
                </div>
              )},
            ]}
            data={pending}
          />
        )
      ) : tab === "approved" ? (
        approvedLogs.length === 0 ? <EmptyState message="No approved refunds yet" /> : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tuition</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Teacher</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Resolution</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Admin Reason</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Approved At</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {approvedLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3.5 text-sm">
                      <span className="font-medium text-slate-900">{log.details?.tuition?.name || "—"}</span>
                      {log.details?.tuition?.location && <p className="text-slate-400 text-xs flex items-center gap-1"><MapPin size={11} />{log.details.tuition.location.split(",")[0]}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-600">{log.details?.teacher?.name || "—"}</td>
                    <td className="px-5 py-3.5 text-xs">
                      <span className={`inline-flex px-2 py-0.5 rounded-full font-medium ${log.details?.resolution === "delete" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                        {log.details?.resolution === "delete" ? "Deleted" : "Vacant"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-600 max-w-65 whitespace-normal">{log.details?.adminReason || "—"}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1"><Calendar size={12} />{new Date(log.createdAt).toLocaleDateString()}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <ActionButton icon={Eye} label="View" onClick={() => setSelectedLog(log)} color="blue" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        rejectedLogs.length === 0 ? <EmptyState message="No rejected refund requests" /> : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tuition</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Teacher</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Listing</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Admin Reason</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Rejected At</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rejectedLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3.5 text-sm">
                      <span className="font-medium text-slate-900">{log.details?.tuition?.name || "—"}</span>
                      {log.details?.tuition?.location && <p className="text-slate-400 text-xs flex items-center gap-1"><MapPin size={11} />{log.details.tuition.location.split(",")[0]}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-600">{log.details?.teacher?.name || "—"}</td>
                    <td className="px-5 py-3.5 text-xs">
                      <span className={`inline-flex px-2 py-0.5 rounded-full font-medium ${
                        log.details?.resolution === "delete" ? "bg-red-100 text-red-700" : log.details?.resolution === "vacant" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                      }`}>
                        {log.details?.resolution === "delete" ? "Deleted" : log.details?.resolution === "vacant" ? "Vacant" : "Kept As Is"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-600 max-w-65 whitespace-normal">{log.details?.adminReason || "—"}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1"><Calendar size={12} />{new Date(log.createdAt).toLocaleString()}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <ActionButton icon={Eye} label="View" onClick={() => setSelectedLog(log)} color="blue" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      <ImageLightbox src={lightboxSrc || ""} open={!!lightboxSrc} onClose={closeLightbox} />
    </div>
  );
}
