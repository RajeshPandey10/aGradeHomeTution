"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/axios";
import { Bell, Target, Calendar, CheckCircle2, Circle } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { PageHeader, DataTable } from "@/components/admin/DataTable";
import { Loading, EmptyState } from "@/components/admin/UI";

interface NotificationLog {
  _id: string;
  recipient: string;
  sender: {
    _id: string;
    name: string;
    email: string;
  };
  title?: string;
  message: string;
  target?: string;
  isRead: boolean;
  createdAt: string;
  displayNo: number;
}

export default function NotificationLogsPage() {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const fetch = useCallback(async () => {
    try {
      const res = await api.get("/api/public/notifications");
      setLogs(res.data.data || []);
    } catch {
      toast.error("Failed to load notification logs");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div>
      <PageHeader title="Notification Logs" subtitle="History of sent push notifications" />

      {loading ? <Loading /> : logs.length === 0 ? <EmptyState message="No notification logs found" /> : (
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
            { key: "isRead", header: "Status", render: (n) => n.isRead ? (
              <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium"><CheckCircle2 size={14} /> Read</span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-600 text-xs font-medium"><Circle size={14} /> Unread</span>
            )},
          ]}
          data={logs}
        />
      )}
    </div>
  );
}
