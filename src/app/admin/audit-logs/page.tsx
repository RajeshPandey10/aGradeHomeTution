"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Shield,
  User,
  Calendar,
  Filter,
  ChevronLeft,
  ChevronRight,
  Search,
  Globe,
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { PageHeader, DataTable } from "@/components/admin/DataTable";
import { Loading, EmptyState } from "@/components/admin/UI";
import { Modal } from "@/components/admin/Modal";
import api from "@/lib/axios";

interface AuditLog {
  _id: string;
  action: string;
  performedBy: {
    _id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  performedBySnapshot?: {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
  } | null;
  role: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
  reason?: string | null;
  ip?: string;
  createdAt: string;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  teacher_approved: {
    label: "Teacher Approved",
    color: "bg-emerald-100 text-emerald-700",
  },
  teacher_rejected: {
    label: "Teacher Rejected",
    color: "bg-red-100 text-red-700",
  },
  teacher_status_changed: {
    label: "Teacher Status Changed",
    color: "bg-amber-100 text-amber-700",
  },
  teacher_deleted: {
    label: "Teacher Deleted",
    color: "bg-red-100 text-red-700",
  },
  request_approved: {
    label: "Request Approved",
    color: "bg-emerald-100 text-emerald-700",
  },
  request_fulfilled_by_admin: {
    label: "Request Fulfilled",
    color: "bg-blue-100 text-blue-700",
  },
  request_deleted: {
    label: "Request Deleted",
    color: "bg-red-100 text-red-700",
  },
  refund_requested: {
    label: "Refund Requested",
    color: "bg-orange-100 text-orange-700",
  },
  refund_approved: {
    label: "Refund Approved",
    color: "bg-emerald-100 text-emerald-700",
  },
  refund_executed: {
    label: "Refund Executed",
    color: "bg-purple-100 text-purple-700",
  },
  payment_manual_submitted: {
    label: "Manual Payment",
    color: "bg-blue-100 text-blue-700",
  },
  payment_esewa_verified: {
    label: "eSewa Payment",
    color: "bg-green-100 text-green-700",
  },
  account_deleted: {
    label: "Account Deleted",
    color: "bg-red-100 text-red-700",
  },
};

const ACTION_OPTIONS = [
  { value: "", label: "All Actions" },
  { value: "teacher_approved", label: "Teacher Approved" },
  { value: "teacher_rejected", label: "Teacher Rejected" },
  { value: "teacher_deleted", label: "Teacher Deleted" },
  { value: "request_approved", label: "Request Approved" },
  { value: "request_fulfilled_by_admin", label: "Request Fulfilled" },
  { value: "request_deleted", label: "Request Deleted" },
  { value: "refund_requested", label: "Refund Requested" },
  { value: "refund_approved", label: "Refund Approved" },
  { value: "refund_executed", label: "Refund Executed" },
  { value: "payment_manual_submitted", label: "Manual Payment" },
  { value: "payment_esewa_verified", label: "eSewa Payment" },
  { value: "account_deleted", label: "Account Deleted" },
];

const ROLE_OPTIONS = [
  { value: "", label: "All Roles" },
  { value: "admin", label: "Admin" },
  { value: "teacher", label: "Teacher" },
  { value: "parent", label: "Parent" },
];

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const toast = useToast();

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (actionFilter) params.action = actionFilter;
      if (roleFilter) params.role = roleFilter;

      const res = await api.get("/api/admin/audit-logs", { params });
      const data = res.data.data;
      setLogs(data.logs || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch {
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, roleFilter, toast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    setPage(1);
  }, [actionFilter, roleFilter]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getActionBadge = (action: string) => {
    const config = ACTION_LABELS[action] || {
      label: action.replace(/_/g, " "),
      color: "bg-slate-100 text-slate-700",
    };
    return (
      <span
        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}
      >
        {config.label}
      </span>
    );
  };

  return (
    <div>
      <PageHeader title="Audit Logs" subtitle={`${total} total log entries`} />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {ACTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <Loading />
      ) : logs.length === 0 ? (
        <EmptyState message="No audit logs found" />
      ) : (
        <>
          <DataTable
            columns={[
              {
                key: "action",
                header: "Action",
                render: (log) => getActionBadge(log.action),
              },
              {
                key: "performedBy",
                header: "Performed By",
                render: (log) => (
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center">
                      <User size={14} className="text-slate-500" />
                    </div>
                    <div>
                      <div className="text-slate-900 font-medium text-sm">
                        {log.performedBy?.name || "Unknown"}
                      </div>
                      <div className="text-slate-400 text-xs">
                        {log.performedBy?.email || "—"}
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                key: "role",
                header: "Role",
                render: (log) => (
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 capitalize">
                    {log.role}
                  </span>
                ),
              },
              {
                key: "target",
                header: "Target",
                render: (log) => (
                  <div className="text-xs text-slate-500">
                    {log.targetType ? (
                      <span className="capitalize">
                        {log.targetType.replace(/_/g, " ")}
                      </span>
                    ) : (
                      "—"
                    )}
                  </div>
                ),
              },
              {
                key: "ip",
                header: "IP",
                render: (log) => (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                    <Globe size={12} />
                    {log.ip || "—"}
                  </span>
                ),
              },
              {
                key: "createdAt",
                header: "Date",
                render: (log) => (
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                    <Calendar size={13} />
                    {formatDate(log.createdAt)}
                  </span>
                ),
              },
              {
                key: "details",
                header: "",
                render: (log) =>
                  log.details && Object.keys(log.details).length > 0 ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLog(log);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                    >
                      Details
                    </button>
                  ) : null,
              },
            ]}
            data={logs}
          />

          <Modal
            open={!!selectedLog}
            onClose={() => setSelectedLog(null)}
            title="Audit Log Details"
            wide
          >
            {selectedLog && (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-400">
                      Action
                    </p>
                    <div className="mt-1">
                      {getActionBadge(selectedLog.action)}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-400">
                      Performed by
                    </p>
                    <p className="mt-1 font-medium text-slate-900">
                      {selectedLog.performedBy?.name ||
                        selectedLog.performedBySnapshot?.name ||
                        "Deleted user"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {selectedLog.performedBy?.email ||
                        selectedLog.performedBySnapshot?.email ||
                        "No longer available"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-400">
                      Target
                    </p>
                    <p className="mt-1 capitalize text-slate-900">
                      {selectedLog.targetType?.replace(/_/g, " ") || "—"}
                    </p>
                    <p className="text-xs text-slate-500 break-all">
                      {selectedLog.targetId || "—"}
                    </p>
                  </div>
                </div>
                {selectedLog.reason && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                      Reason
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-slate-700">
                      {selectedLog.reason}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Recorded data
                  </p>
                  <pre className="max-h-[45vh] overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-700 whitespace-pre-wrap wrap-break-word">
                    {JSON.stringify(selectedLog.details || {}, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </Modal>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-5">
            <p className="text-sm text-slate-500">
              Page {page} of {totalPages} ({total} entries)
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft size={16} />
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
