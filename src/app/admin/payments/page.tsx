"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Eye,
  Mail,
  RotateCcw,
  DollarSign,
  MapPin,
  User,
  Clock,
  BookOpen,
  Percent,
} from "lucide-react";
import { useRealtimeRefresh } from "@/lib/socket";
import {
  parentService,
  ParentProfile,
  populatedUser,
} from "@/services/parentService";
import api from "@/lib/axios";
import { localDayRange, toLocalDate } from "@/lib/datetime";
import { labelFor } from "@/lib/enums";
import { useToast } from "@/hooks/useToast";
import { PageHeader, DataTable } from "@/components/admin/DataTable";
import {
  ActionButton,
  ActionButtonSolid,
  Loading,
  EmptyState,
  StatusBadge,
} from "@/components/admin/UI";
import { Modal } from "@/components/admin/Modal";
import { SearchInput } from "@/components/admin/SearchInput";
import { matchesSearch } from "@/lib/search";
import { getErrorMessage } from "@/lib/errors";

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

// A teacher has asked for a refund and it is waiting on an admin.
const isRefundRequested = (r: ParentProfile) =>
  r.status === "fulfilled" && !!r.refund?.requestedBy;

// Approving a refund wipes the request's refund details, so completed refunds
// are counted from the audit log instead of from the requests.
const COMPLETED_REFUND_ACTIONS = ["refund_approved", "refund_executed"];

async function countCompletedRefunds(range?: {
  startDate: string;
  endDate: string;
}) {
  const totals = await Promise.all(
    COMPLETED_REFUND_ACTIONS.map(async (action) => {
      const res = await api.get<{ data?: { total?: number } }>(
        "/api/admin/audit-logs",
        { params: { action, limit: 1, ...range } },
      );
      return res.data.data?.total ?? 0;
    }),
  );
  return totals.reduce((sum, total) => sum + total, 0);
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-600 border-b border-slate-200 pb-1 pt-3">
      {title}
    </h3>
  );
}

export default function PaymentsPage() {
  const [requests, setRequests] = useState<ParentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ParentProfile | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [refundTarget, setRefundTarget] = useState<ParentProfile | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [search, setSearch] = useState("");
  const [refundCounts, setRefundCounts] = useState<{
    overall: number;
    onDate: number | null;
  } | null>(null);
  const toast = useToast();

  const fetchAll = useCallback(async () => {
    try {
      const res = await parentService.getRequests();
      const paymentRequests = (res.data || [])
        // Bookings under review are paid too; they count as revenue once accepted
        .filter((r) => r.status === "fulfilled" || r.status === "under_review" || r.refund?.refundedAt)
        .sort((a, b) => {
          const aDate = a.paymentSlip?.paidAt || a.createdAt || "";
          const bDate = b.paymentSlip?.paidAt || b.createdAt || "";
          return new Date(bDate).getTime() - new Date(aDate).getTime();
        });
      setRequests(paymentRequests);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load payments"));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchRefundCounts = useCallback(async () => {
    try {
      const [overall, onDate] = await Promise.all([
        countCompletedRefunds(),
        selectedDate ? countCompletedRefunds(localDayRange(selectedDate)) : null,
      ]);
      setRefundCounts({ overall, onDate });
    } catch {
      setRefundCounts(null); // the card shows "—"
    }
  }, [selectedDate]);

  const refresh = useCallback(() => {
    fetchAll();
    fetchRefundCounts();
  }, [fetchAll, fetchRefundCounts]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);
  useEffect(() => {
    fetchRefundCounts();
  }, [fetchRefundCounts]);
  useRealtimeRefresh(refresh, ["request:fulfilled", "request:available", "request:under-review"]);

  const handleView = useCallback(async (r: ParentProfile) => {
    try {
      const res = await parentService.getRequestDetail(r._id);
      setSelected(res.data);
    } catch {
      setSelected(r);
    }
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
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to refund request"));
    } finally {
      setProcessing(null);
    }
  }, [refundTarget, refundReason, refresh, toast]);

  const totalRevenue = requests
    .filter((r) => r.status === "fulfilled")
    .reduce((sum, r) => sum + (r.payment?.payable || 0), 0);
  const totalFulfilled = requests.filter(
    (r) => r.status === "fulfilled",
  ).length;
  const refundsAwaiting = requests.filter(isRefundRequested).length;
  const dateRequests = selectedDate
    ? requests.filter(
        (r) => toLocalDate(r.paymentSlip?.paidAt || r.createdAt) === selectedDate,
      )
    : requests;
  const dateRevenue = dateRequests
    .filter((r) => r.status === "fulfilled")
    .reduce((sum, r) => sum + (r.payment?.payable || 0), 0);
  const dateFulfilled = dateRequests.filter(
    (r) => r.status === "fulfilled",
  ).length;
  // Search narrows the table only; the summary cards above stay on the date filter.
  const filtered = dateRequests.filter((r) =>
    matchesSearch(search, [
      r.name,
      r.location,
      r.status,
      r.refund?.refundedAt && "refunded",
      isRefundRequested(r) && "refund requested",
      r.parent?.name,
      r.parent?.email,
      r.parent?.phoneNumber,
      r.assignedTeacher?.name,
      r.assignedTeacher?.email,
      r.assignedTeacher?.phoneNumber,
      r.teacherProfile?.name,
      r.teacherProfile?.phone,
      r.paymentSlip?.paymentRef,
      r.paymentSlip?.medium,
      r.paymentSlip?.paymentAmount,
      r.payment?.couponCode,
      r.payment?.grossAmount,
      r.payment?.payable,
      r.payment?.total,
    ]),
  );

  return (
    <div>
      <PageHeader
        title="Payments"
        subtitle="View all payment transactions and invoices"
      />

      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <label
            htmlFor="payment-date"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5"
          >
            Filter by payment date
          </label>
          <input
            id="payment-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {selectedDate && (
          <button
            type="button"
            onClick={() => setSelectedDate("")}
            className="px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
          >
            Show all dates
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            {selectedDate ? "Selected Date Revenue" : "Overall Revenue"}
          </p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            Rs. {(selectedDate ? dateRevenue : totalRevenue).toLocaleString()}
          </p>
          {selectedDate && (
            <p className="text-xs text-slate-400 mt-1">
              Overall: Rs. {totalRevenue.toLocaleString()}
            </p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            {selectedDate ? "Selected Date Fulfilled" : "Overall Fulfilled"}
          </p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {selectedDate ? dateFulfilled : totalFulfilled}
          </p>
          {selectedDate && (
            <p className="text-xs text-slate-400 mt-1">
              Overall: {totalFulfilled}
            </p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            {selectedDate ? "Refunded on Selected Date" : "Overall Refunded"}
          </p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {(selectedDate ? refundCounts?.onDate : refundCounts?.overall) ?? "—"}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Completed refunds, from the audit log
            {selectedDate && refundCounts && ` · Overall: ${refundCounts.overall}`}
          </p>
          {refundsAwaiting > 0 && (
            <p className="text-xs text-amber-600 mt-1">
              {refundsAwaiting} refund{" "}
              {refundsAwaiting === 1 ? "request" : "requests"} awaiting approval
            </p>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Payment Details"
        wide
      >
        {selected && (
          <div className="space-y-3 text-sm max-h-[75vh] overflow-y-auto pr-1">
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={selected.status} kind="requestStatus" />
              {selected.refund?.refundedAt && <StatusBadge status="refunded" />}
              {isRefundRequested(selected) && (
                <StatusBadge status="refund_requested" />
              )}
              {selected.platformFeePercent != null && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                  <Percent size={12} /> {selected.platformFeePercent}% fee
                </span>
              )}
            </div>

            <SectionHeader title="Tuition Details" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DetailRow label="Name" value={selected.name} icon={User} />
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
              <DetailRow
                label="Subjects"
                value={selected.subjects?.join("; ")}
                icon={BookOpen}
              />
            </div>

            {selected.parent && (
              <>
                <SectionHeader title="Parent" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <DetailRow
                    label="Name"
                    value={selected.parent.name}
                    icon={User}
                  />
                  <DetailRow label="Email" value={selected.parent.email} />
                  <DetailRow
                    label="Phone"
                    value={selected.parent.phoneNumber}
                  />
                </div>
              </>
            )}

            {selected.assignedTeacher && (
              <>
                <SectionHeader title="Teacher" />
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
                    value={selected.assignedTeacher.phoneNumber}
                  />
                </div>
              </>
            )}
            {selected.teacherProfile && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DetailRow
                  label="Address"
                  value={selected.teacherProfile.address}
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

            {(selected.refund?.refundedAt || isRefundRequested(selected)) && (
              <>
                <SectionHeader
                  title={
                    selected.refund?.refundedAt ? "Refund Info" : "Refund Requested"
                  }
                />
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <DetailRow
                    label="Reason"
                    value={selected.refund?.reason || selected.refund?.reasons}
                  />
                  <DetailRow
                    label="Requested By"
                    value={populatedUser(selected.refund?.requestedBy)?.name}
                  />
                  <DetailRow
                    label="Requested At"
                    value={
                      selected.refund?.requestedAt
                        ? new Date(selected.refund.requestedAt).toLocaleString()
                        : undefined
                    }
                  />
                  <DetailRow
                    label="Refunded By"
                    value={populatedUser(selected.refund?.refundedBy)?.name}
                  />
                  <DetailRow
                    label="Refunded At"
                    value={
                      selected.refund?.refundedAt
                        ? new Date(selected.refund.refundedAt).toLocaleString()
                        : undefined
                    }
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

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search tuition, teacher, parent, phone, payment ref…"
        shown={filtered.length}
        total={dateRequests.length}
      />

      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <EmptyState
          message={
            search.trim()
              ? `No payment transactions ${selectedDate ? "for this date " : ""}match "${search.trim()}"`
              : "No payment transactions for this date"
          }
        />
      ) : (
        <DataTable
          columns={[
            {
              key: "name",
              header: "Tuition",
              render: (r) => (
                <div>
                  <span className="font-medium text-slate-900">{r.name}</span>
                  <p className="text-slate-400 text-xs">
                    {r.location?.split(",")[0] || "—"}
                  </p>
                </div>
              ),
            },
            {
              key: "teacher",
              header: "Teacher",
              render: (r) =>
                r.assignedTeacher ? (
                  <div>
                    <span className="text-slate-900 text-xs font-medium">
                      {r.assignedTeacher.name}
                    </span>
                    <p className="text-slate-400 text-xs">
                      {r.assignedTeacher.email}
                    </p>
                  </div>
                ) : (
                  <span className="text-slate-300">—</span>
                ),
            },
            {
              key: "parent",
              header: "Parent",
              render: (r) =>
                r.parent ? (
                  <div>
                    <span className="text-slate-900 text-xs font-medium">
                      {r.parent.name}
                    </span>
                    <p className="text-slate-400 text-xs">{r.parent.email}</p>
                  </div>
                ) : (
                  <span className="text-slate-300">—</span>
                ),
            },
            {
              key: "amount",
              header: "Amount",
              render: (r) => (
                <div>
                  <span className="font-semibold text-slate-900">
                    Rs.{" "}
                    {r.paymentSlip?.paymentAmount || r.payment?.payable || 0}
                  </span>
                  <p className="text-slate-400 text-xs">
                    {r.paymentSlip?.medium || "—"}
                  </p>
                </div>
              ),
            },
            {
              key: "fee",
              header: "Platform Fee",
              render: (r) => (
                <div>
                  <span className="text-indigo-600 font-medium">
                    Rs. {r.payment?.payable || 0}
                  </span>
                  <p className="text-slate-400 text-xs">
                    {r.payment?.percentage || 0}%
                  </p>
                </div>
              ),
            },
            {
              key: "date",
              header: "Date",
              render: (r) => (
                <span className="text-slate-500 text-xs">
                  {r.paymentSlip?.paidAt
                    ? new Date(r.paymentSlip.paidAt).toLocaleDateString()
                    : "—"}
                </span>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (r) => (
                <div className="flex gap-1">
                  <StatusBadge status={r.status} kind="requestStatus" />
                  {r.refund?.refundedAt && <StatusBadge status="refunded" />}
                  {isRefundRequested(r) && (
                    <StatusBadge status="refund_requested" />
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
                  {r.status === "fulfilled" && (
                    <>
                      <ActionButton
                        icon={Mail}
                        label="Invoice"
                        onClick={() => handleResendInvoice(r._id)}
                        disabled={processing === r._id}
                        color="blue"
                      />
                      <ActionButton
                        icon={RotateCcw}
                        label="Refund"
                        onClick={() => {
                          setRefundTarget(r);
                          setRefundReason("");
                        }}
                        disabled={processing === r._id}
                        color="red"
                      />
                    </>
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
