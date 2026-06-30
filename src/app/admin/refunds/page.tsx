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
  AlertTriangle,
  ImageIcon,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { parentService, ParentProfile } from "@/services/parentService";
import { useToast } from "@/hooks/useToast";
import { useRealtimeRefresh } from "@/lib/socket";
import { PageHeader, DataTable } from "@/components/admin/DataTable";
import { ActionButton, ActionButtonSolid, Loading, EmptyState } from "@/components/admin/UI";
import { Modal } from "@/components/admin/Modal";
import api from "@/lib/axios";

interface RejectedRefundLog {
  _id: string;
  performedBy: { _id: string; name: string; email: string } | null;
  targetId: string;
  details?: { reason?: string };
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

type Tab = "pending" | "approved" | "rejected";
type Resolution = "vacant" | "delete";

export default function RefundsPage() {
  const [requests, setRequests] = useState<ParentProfile[]>([]);
  const [rejectedLogs, setRejectedLogs] = useState<RejectedRefundLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("pending");
  const [selected, setSelected] = useState<ParentProfile | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ParentProfile | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [approveTarget, setApproveTarget] = useState<ParentProfile | null>(null);
  const [approveResolution, setApproveResolution] = useState<Resolution>("vacant");
  const toast = useToast();

  const fetchAll = useCallback(async () => {
    try {
      const [requestsRes, logsRes] = await Promise.all([
        parentService.getRequests(),
        api.get("/api/admin/audit-logs", { params: { action: "refund_rejected", limit: 50 } }),
      ]);
      setRequests(requestsRes.data || []);
      setRejectedLogs(logsRes.data.data?.logs || []);
    } catch {
      toast.error("Failed to load refund requests");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useRealtimeRefresh(fetchAll, ["request:available", "request:fulfilled", "parent-request:status-updated", "parent-request:deleted"]);

  const pending = requests.filter((r) => r.refund?.requestedBy && !r.refund?.refundedBy);
  const approved = requests.filter((r) => r.refund?.refundedBy);

  const handleView = useCallback(async (r: ParentProfile) => {
    try {
      const res = await parentService.getRequestDetail(r._id);
      setSelected(res.data);
    } catch {
      setSelected(r);
    }
  }, []);

  const handleApprove = useCallback(async () => {
    if (!approveTarget) return;
    setProcessing(approveTarget._id);
    try {
      await parentService.approveRefund(approveTarget._id, approveResolution);
      toast.success(
        approveResolution === "delete"
          ? "Refund approved — tuition request closed permanently"
          : "Refund approved — request reset to vacant",
      );
      setApproveTarget(null);
      setSelected(null);
      fetchAll();
    } catch {
      toast.error("Failed to approve refund");
    } finally {
      setProcessing(null);
    }
  }, [approveTarget, approveResolution, fetchAll, toast]);

  const handleReject = useCallback(async () => {
    if (!rejectTarget) return;
    setProcessing(rejectTarget._id);
    try {
      await parentService.rejectRefund(rejectTarget._id, rejectReason.trim() || undefined);
      toast.success("Refund request rejected");
      setRejectTarget(null);
      setRejectReason("");
      setSelected(null);
      fetchAll();
    } catch {
      toast.error("Failed to reject refund");
    } finally {
      setProcessing(null);
    }
  }, [rejectTarget, rejectReason, fetchAll, toast]);

  const tabs: { label: string; value: Tab; count: number }[] = [
    { label: "Pending", value: "pending", count: pending.length },
    { label: "Approved", value: "approved", count: approved.length },
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

      {/* Detail Modal */}
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
              <>
                <SectionHeader title="Teacher" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <DetailRow label="Name" value={selected.assignedTeacher.name} icon={User} />
                  <DetailRow label="Email" value={selected.assignedTeacher.email} icon={Mail} />
                  <DetailRow label="Phone" value={selected.assignedTeacher.phoneNumber} icon={Phone} />
                  {selected.teacherProfile?.gender && <DetailRow label="Gender" value={selected.teacherProfile.gender} />}
                </div>
              </>
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
                  {selected.refund.qrImage && (
                    <div>
                      <span className="font-medium text-slate-400 text-xs uppercase tracking-wider flex items-center gap-1"><ImageIcon size={12} /> QR Code</span>
                      <img src={selected.refund.qrImage} alt="Refund QR" className="mt-1 w-40 h-40 object-contain rounded-lg border border-amber-200" />
                    </div>
                  )}
                </div>
              </>
            )}

            {selected.refund?.refundedBy && (
              <>
                <SectionHeader title="Refund Resolution" />
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <DetailRow label="Reason" value={selected.refund.reason || selected.refund.reasons} />
                  <DetailRow label="Refunded By" value={selected.refund.refundedBy?.name} icon={User} />
                  <DetailRow label="Refunded At" value={selected.refund.refundedAt ? new Date(selected.refund.refundedAt).toLocaleString() : undefined} icon={Calendar} />
                </div>
              </>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4 border-t border-slate-200">
              <ActionButton icon={Eye} label="Close" onClick={() => setSelected(null)} color="slate" />
              {selected.refund?.requestedBy && !selected.refund?.refundedBy && (
                <>
                  <ActionButtonSolid icon={CheckCircle} label="Approve Refund" onClick={() => { setApproveTarget(selected); setApproveResolution("vacant"); }} disabled={processing === selected._id} color="emerald" />
                  <ActionButtonSolid icon={XCircle} label="Reject Refund" onClick={() => { setRejectTarget(selected); setRejectReason(""); }} disabled={processing === selected._id} color="red" />
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Approve Dialog — choose resolution after calling the parent */}
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
            <div className="flex gap-3 mt-5">
              <button onClick={() => setApproveTarget(null)} disabled={!!processing} className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40 cursor-pointer">Cancel</button>
              <button
                onClick={handleApprove}
                disabled={!!processing}
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

      {/* Reject Dialog */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => { if (!processing) { setRejectTarget(null); } }} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Reject Refund Request</h2>
            <p className="text-sm text-slate-600 mb-4">
              Rejecting the refund for <span className="font-medium text-slate-900">{rejectTarget.name}</span>. The request will stay fulfilled.
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Reason (optional)</label>
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
              <button onClick={() => { setRejectTarget(null); setRejectReason(""); }} disabled={!!processing} className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40 cursor-pointer">Cancel</button>
              <button onClick={handleReject} disabled={!!processing} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-40 cursor-pointer">{processing ? "Rejecting..." : "Reject Refund"}</button>
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
                  <ActionButton icon={CheckCircle} label="Approve" onClick={() => { setApproveTarget(r); setApproveResolution("vacant"); }} disabled={processing === r._id} color="emerald" />
                  <ActionButton icon={XCircle} label="Reject" onClick={() => { setRejectTarget(r); setRejectReason(""); }} disabled={processing === r._id} color="red" />
                </div>
              )},
            ]}
            data={pending}
          />
        )
      ) : tab === "approved" ? (
        approved.length === 0 ? <EmptyState message="No approved refunds yet" /> : (
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
              { key: "requestedBy", header: "Requested By", render: (r) => <span className="text-slate-600 text-xs">{r.refund?.requestedBy?.name || "Admin initiated"}</span> },
              { key: "refundedBy", header: "Refunded By", render: (r) => <span className="text-slate-900 text-xs font-medium">{r.refund?.refundedBy?.name || "—"}</span> },
              { key: "reason", header: "Reason", render: (r) => <span className="text-slate-600 text-xs max-w-65 block whitespace-normal">{r.refund?.reason || r.refund?.reasons || "—"}</span> },
              { key: "refundedAt", header: "Refunded At", render: (r) => (
                <span className="inline-flex items-center gap-1 text-slate-500 text-xs"><Calendar size={12} />{r.refund?.refundedAt ? new Date(r.refund.refundedAt).toLocaleDateString() : "—"}</span>
              )},
              { key: "actions", header: "", render: (r) => (
                <div className="flex gap-1.5 justify-end">
                  <ActionButton icon={Eye} label="View" onClick={() => handleView(r)} color="blue" />
                </div>
              )},
            ]}
            data={approved}
          />
        )
      ) : (
        rejectedLogs.length === 0 ? <EmptyState message="No rejected refund requests" /> : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tuition</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Rejected By</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Reason</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Rejected At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rejectedLogs.map((log) => {
                  const req = requests.find((r) => r._id === log.targetId);
                  return (
                    <tr key={log._id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3.5 text-sm">
                        <span className="font-medium text-slate-900">{req?.name || "Request deleted"}</span>
                        {req?.location && <p className="text-slate-400 text-xs flex items-center gap-1"><MapPin size={11} />{req.location.split(",")[0]}</p>}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-600">{log.performedBy?.name || "—"}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-600 max-w-65 whitespace-normal">
                        {log.details?.reason || <span className="text-slate-300">No reason given</span>}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1"><Calendar size={12} />{new Date(log.createdAt).toLocaleString()}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
