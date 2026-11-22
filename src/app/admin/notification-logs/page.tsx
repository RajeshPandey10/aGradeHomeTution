"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, Target, Calendar, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { fcmService } from "@/services/fcmService";
import { PageHeader, DataTable } from "@/components/admin/DataTable";
import { ActionButton, Loading, EmptyState } from "@/components/admin/UI";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { SearchInput } from "@/components/admin/SearchInput";
import api from "@/lib/axios";
import { matchesSearch } from "@/lib/search";
import { getErrorMessage } from "@/lib/errors";

// One summary entry per broadcast the admins sent (not each recipient's copy).
interface NotificationLog {
  _id: string;
  sender: {
    _id: string;
    name: string;
    email: string;
  } | null;
  title?: string;
  message: string;
  target?: string;
  createdAt: string;
}

interface NotificationLogPage {
  logs: NotificationLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const PAGE_SIZE = 20;

export default function NotificationLogsPage() {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<NotificationLog | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const toast = useToast();

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: NotificationLogPage }>(
        "/api/admin/notification-logs",
        { params: { page, limit: PAGE_SIZE } },
      );
      const data = res.data.data;
      // Deleting the last entry on a page leaves it empty; step back one.
      if (data.logs.length === 0 && page > 1) {
        setPage(page - 1);
        return;
      }
      setLogs(data.logs);
      setTotal(data.total);
      setTotalPages(Math.max(1, data.totalPages));
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load notification logs"));
    } finally {
      setLoading(false);
    }
  }, [page, toast]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fcmService.delete(deleteTarget._id);
      toast.success("Notification deleted");
      setDeleteTarget(null);
      fetch();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to delete notification"));
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, fetch, toast]);

  const filtered = logs.filter((n) =>
    matchesSearch(search, [n.title, n.message, n.target, n.sender?.name]),
  );

  return (
    <div>
      <PageHeader
        title="Notification Logs"
        subtitle={`History of sent push notifications · ${total} total`}
      />

      <SearchInput value={search} onChange={setSearch} placeholder="Search this page: title, message, target…" shown={filtered.length} total={logs.length} />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Notification"
        message={`Are you sure you want to delete this notification?`}
        confirmLabel="Delete"
        confirmColor="red"
        loading={deleting}
      />

      {loading ? <Loading /> : filtered.length === 0 ? <EmptyState message={search.trim() ? `No notifications match "${search.trim()}"` : "No notification logs found"} /> : (
        <DataTable
          columns={[
            { key: "title", header: "Notification", render: (n) => (
              <div>
                <div className="flex items-center gap-1.5 text-slate-900 font-medium">
                  <Bell size={14} className="shrink-0 text-blue-500" />
                  {n.title || "Notification"}
                </div>
                <div className="text-slate-500 text-xs mt-0.5">{n.message}</div>
              </div>
            )},
            { key: "target", header: "Target", render: (n) => (
              <span className="inline-flex items-center gap-1 text-slate-600">
                <Target size={14} className="shrink-0 text-slate-400" />
                {n.target || "—"}
              </span>
            )},
            { key: "createdAt", header: "Sent At", render: (n) => (
              <span className="inline-flex items-center gap-1.5 text-slate-500">
                <Calendar size={14} />
                {new Date(n.createdAt).toLocaleString()}
              </span>
            )},
            { key: "sender", header: "Sent By", render: (n) => (
              <span className="text-slate-600">{n.sender?.name || "—"}</span>
            )},
            { key: "actions", header: "", render: (n) => (
              <div className="flex gap-1.5 justify-end">
                <ActionButton icon={Trash2} label="Delete" onClick={() => setDeleteTarget(n)} color="red" />
              </div>
            )},
          ]}
          data={filtered}
        />
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-5">
          <p className="text-sm text-slate-500">
            Page {page} of {totalPages} ({total} entries)
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft size={16} />
              Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
