"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail, RefreshCw } from "lucide-react";
import {
  emailSenderService,
  EmailSenderStatus,
} from "@/services/emailSenderService";
import { useToast } from "@/hooks/useToast";
import { DataTable, PageHeader } from "@/components/admin/DataTable";
import { ActionButton, EmptyState, Loading } from "@/components/admin/UI";

const formatDate = (date: string | null) => {
  if (!date) return "-";
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusStyles: Record<EmailSenderStatus["status"], string> = {
  available: "bg-emerald-100 text-emerald-700",
  cooldown: "bg-orange-100 text-orange-700",
  failed: "bg-red-100 text-red-700",
};

export default function EmailSendersPage() {
  const [senders, setSenders] = useState<EmailSenderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const toast = useToast();

  const fetchSenders = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        setSenders(await emailSenderService.getStatuses());
      } catch {
        toast.error("Failed to load email sender statuses");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    fetchSenders();
  }, [fetchSenders]);

  return (
    <div>
      <PageHeader
        title="Email Senders"
        subtitle="Monitor OTP email delivery and sender availability"
        action={
          <ActionButton
            icon={RefreshCw}
            label={refreshing ? "Refreshing..." : "Refresh"}
            onClick={() => fetchSenders(true)}
            disabled={loading || refreshing}
          />
        }
      />

      {loading ? (
        <Loading />
      ) : senders.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="flex justify-center pt-10">
            <Mail size={24} className="text-slate-300" />
          </div>
          <EmptyState message="No email sender statuses found" />
        </div>
      ) : (
        <DataTable
          columns={[
            {
              key: "email",
              header: "Sender",
              render: (sender) => (
                <div>
                  <p className="font-medium text-slate-900 whitespace-nowrap">
                    {sender.email}
                  </p>
                  <p className="text-xs text-slate-400 capitalize">
                    {sender.provider}
                  </p>
                </div>
              ),
            },
            {
              key: "priority",
              header: "Priority",
              render: (sender) => (
                <span className="font-semibold text-slate-700">
                  {sender.priority}
                </span>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (sender) => (
                <span
                  className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusStyles[sender.status]}`}
                >
                  {sender.status}
                </span>
              ),
            },
            {
              key: "emailsSent",
              header: "Sent",
              render: (sender) => (
                <span className="text-slate-700">{sender.emailsSent}</span>
              ),
            },
            {
              key: "emailsFailed",
              header: "Failed",
              render: (sender) => (
                <span className="text-slate-700">{sender.emailsFailed}</span>
              ),
            },
            {
              key: "rateLimitErrors",
              header: "Rate Limits",
              render: (sender) => (
                <span className="text-slate-700">{sender.rateLimitErrors}</span>
              ),
            },
            {
              key: "lastSuccessfulSend",
              header: "Last Success",
              render: (sender) => (
                <span className="text-xs text-slate-500 whitespace-nowrap">
                  {formatDate(sender.lastSuccessfulSend)}
                </span>
              ),
            },
            {
              key: "lastFailure",
              header: "Last Failure",
              render: (sender) => (
                <span className="text-xs text-slate-500 whitespace-nowrap">
                  {formatDate(sender.lastFailure)}
                </span>
              ),
            },
            {
              key: "cooldownUntil",
              header: "Cooldown Until",
              render: (sender) => (
                <span className="text-xs text-slate-500 whitespace-nowrap">
                  {formatDate(sender.cooldownUntil)}
                </span>
              ),
            },
          ]}
          data={senders}
        />
      )}
    </div>
  );
}
