"use client";

import { useEffect, useState, useCallback } from "react";
import { Eye, Mail, RotateCcw, DollarSign, MapPin, User, Clock, BookOpen, Percent } from "lucide-react";
import { useRealtimeRefresh } from "@/lib/socket";
import { parentService, ParentProfile } from "@/services/parentService";
import { useToast } from "@/hooks/useToast";
import { PageHeader, DataTable } from "@/components/admin/DataTable";
import { ActionButton, ActionButtonSolid, Loading, EmptyState, StatusBadge } from "@/components/admin/UI";
import { Modal } from "@/components/admin/Modal";

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

export default function PaymentsPage() {
  const [requests, setRequests] = useState<ParentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ParentProfile | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [refundTarget, setRefundTarget] = useState<ParentProfile | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const toast = useToast();

  const fetchAll = useCallback(async () => {
    try {
      const res = await parentService.getRequests();
      const paymentRequests = (res.data || []).filter(
        (r) => r.status === "fulfilled" || r.refund?.reason
      ).sort((a, b) => {
        const aDate = a.paymentSlip?.paidAt || a.createdAt || "";
        const bDate = b.paymentSlip?.paidAt || b.createdAt || "";
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      });
      setRequests(paymentRequests);
    } catch {
      toast.error("Failed to load payments");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useRealtimeRefresh(fetchAll, ["request:fulfilled", "request:available"]);

  const handleView = useCallback(async (r: ParentProfile) => {
    try {
      const res = await parentService.getRequestDetail(r._id);
      setSelected(res.data);
    } catch {
      setSelected(r);
    }
  }, []);

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

  const totalRevenue = requests
    .filter((r) => r.status === "fulfilled")
    .reduce((sum, r) => sum + (r.payment?.payable || 0), 0);
  const totalFulfilled = requests.filter((r) => r.status === "fulfilled").length;
  const totalRefunded = requests.filter((r) => r.refund?.reason).length;

  return (
    <div>
      <PageHeader title="Payments" subtitle="View all payment transactions and invoices" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Revenue</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">Rs. {totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Fulfilled</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{totalFulfilled}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Refunded</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{totalRefunded}</p>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Payment Details" wide>
        {selected && (
          <div className="space-y-3 text-sm max-h-[75vh] overflow-y-auto pr-1">
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={selected.status} />
              {selected.refund?.reason && <StatusBadge status="refunded" />}
              {selected.platformFeePercent != null && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                  <Percent size={12} /> {selected.platformFeePercent}% fee
                </span>
              )}
            </div>

            <SectionHeader title="Tuition Details" />
            <div className="grid grid-cols-2 gap-3">
              <DetailRow label="Name" value={selected.name} icon={User} />
              <DetailRow label="Location" value={selected.location} icon={MapPin} />
              <DetailRow label="Salary" value={selected.salary ? `Rs. ${selected.salary}` : undefined} icon={DollarSign} />
              <DetailRow label="Duration" value={selected.duration} icon={Clock} />
              <DetailRow label="Tuition Type" value={selected.tuitionType} />
              <DetailRow label="Subjects" value={selected.subjects?.join(", ")} icon={BookOpen} />
            </div>

            {selected.parent && (
              <>
                <SectionHeader title="Parent" />
                <div className="grid grid-cols-2 gap-3">
                  <DetailRow label="Name" value={selected.parent.name} icon={User} />
                  <DetailRow label="Email" value={selected.parent.email} />
                  <DetailRow label="Phone" value={selected.parent.phoneNumber} />
                </div>
              </>
            )}

            {selected.assignedTeacher && (
              <>
                <SectionHeader title="Teacher" />
                <div className="grid grid-cols-2 gap-3">
                  <DetailRow label="Name" value={selected.assignedTeacher.name} icon={User} />
                  <DetailRow label="Email" value={selected.assignedTeacher.email} />
                  <DetailRow label="Phone" value={selected.assignedTeacher.phoneNumber} />
                </div>
              </>
            )}
            {selected.teacherProfile && (
              <div className="grid grid-cols-2 gap-3">
                <DetailRow label="Address" value={selected.teacherProfile.address} />
                <DetailRow label="Qualification" value={selected.teacherProfile.academicQualification} />
                <DetailRow label="Experience" value={selected.teacherProfile.experience} />
              </div>
            )}

            {selected.payment && selected.payment.grossAmount > 0 && (
              <>
                <SectionHeader title="Payment Breakdown" />
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-3">
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
                  <div className="grid grid-cols-2 gap-3">
                    <DetailRow label="Amount Paid" value={`Rs. ${selected.paymentSlip.paymentAmount}`} icon={DollarSign} />
                    <DetailRow label="Medium" value={selected.paymentSlip.medium} />
                    <DetailRow label="Reference" value={selected.paymentSlip.paymentRef} />
                    <DetailRow label="Paid At" value={selected.paymentSlip.paidAt ? new Date(selected.paymentSlip.paidAt).toLocaleString() : undefined} />
                  </div>
                </div>
              </>
            )}

            {selected.refund?.reason && (
              <>
                <SectionHeader title="Refund Info" />
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <DetailRow label="Reason" value={selected.refund.reason} />
                  <DetailRow label="Refunded By" value={selected.refund.refundedBy?.name} />
                  <DetailRow label="Refunded At" value={selected.refund.refundedAt ? new Date(selected.refund.refundedAt).toLocaleString() : undefined} />
                </div>
              </>
            )}

            <div className="flex gap-3 justify-end pt-4 border-t border-slate-200 flex-wrap">
              <ActionButton icon={Eye} label="Close" onClick={() => setSelected(null)} color="slate" />
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

      {loading ? <Loading /> : requests.length === 0 ? <EmptyState message="No payment transactions yet" /> : (
        <DataTable
          columns={[
            { key: "name", header: "Tuition", render: (r) => (
              <div>
                <span className="font-medium text-slate-900">{r.name}</span>
                <p className="text-slate-400 text-xs">{r.location?.split(",")[0] || "—"}</p>
              </div>
            )},
            { key: "teacher", header: "Teacher", render: (r) => r.assignedTeacher ? (
              <div>
                <span className="text-slate-900 text-xs font-medium">{r.assignedTeacher.name}</span>
                <p className="text-slate-400 text-xs">{r.assignedTeacher.email}</p>
              </div>
            ) : <span className="text-slate-300">—</span> },
            { key: "parent", header: "Parent", render: (r) => r.parent ? (
              <div>
                <span className="text-slate-900 text-xs font-medium">{r.parent.name}</span>
                <p className="text-slate-400 text-xs">{r.parent.email}</p>
              </div>
            ) : <span className="text-slate-300">—</span> },
            { key: "amount", header: "Amount", render: (r) => (
              <div>
                <span className="font-semibold text-slate-900">Rs. {r.paymentSlip?.paymentAmount || r.payment?.payable || 0}</span>
                <p className="text-slate-400 text-xs">{r.paymentSlip?.medium || "—"}</p>
              </div>
            )},
            { key: "fee", header: "Platform Fee", render: (r) => (
              <div>
                <span className="text-indigo-600 font-medium">Rs. {r.payment?.payable || 0}</span>
                <p className="text-slate-400 text-xs">{r.payment?.percentage || 0}%</p>
              </div>
            )},
            { key: "date", header: "Date", render: (r) => (
              <span className="text-slate-500 text-xs">
                {r.paymentSlip?.paidAt ? new Date(r.paymentSlip.paidAt).toLocaleDateString() : "—"}
              </span>
            )},
            { key: "status", header: "Status", render: (r) => (
              <div className="flex gap-1">
                <StatusBadge status={r.status} />
                {r.refund?.reason && <StatusBadge status="refunded" />}
              </div>
            )},
            { key: "actions", header: "", render: (r) => (
              <div className="flex gap-1.5 justify-end">
                <ActionButton icon={Eye} label="View" onClick={() => handleView(r)} color="blue" />
                {r.status === "fulfilled" && (
                  <>
                    <ActionButton icon={Mail} label="Invoice" onClick={() => handleResendInvoice(r._id)} disabled={processing === r._id} color="blue" />
                    <ActionButton icon={RotateCcw} label="Refund" onClick={() => { setRefundTarget(r); setRefundReason(""); }} disabled={processing === r._id} color="red" />
                  </>
                )}
              </div>
            )},
          ]}
          data={requests}
        />
      )}
    </div>
  );
}
