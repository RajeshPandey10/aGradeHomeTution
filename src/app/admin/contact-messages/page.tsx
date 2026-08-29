"use client";

import { useEffect, useState, useCallback } from "react";
import { Reply, Trash2, Loader2, Mail, Phone } from "lucide-react";
import { contactService, ContactMessage } from "@/services/contactService";
import { useToast } from "@/hooks/useToast";
import { PageHeader, DataTable } from "@/components/admin/DataTable";
import { ActionButton, Loading, EmptyState, StatusBadge } from "@/components/admin/UI";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Modal } from "@/components/admin/Modal";

const STATUS_TABS = [
  { key: "", label: "All" },
  { key: "new", label: "New" },
  { key: "read", label: "Read" },
  { key: "replied", label: "Replied" },
] as const;

export default function ContactMessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [active, setActive] = useState<ContactMessage | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ContactMessage | null>(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await contactService.getAll(statusFilter || undefined);
      setMessages(res.data);
    } catch {
      toast.error("Failed to load contact messages");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openMessage = async (message: ContactMessage) => {
    setActive(message);
    setReplyText(message.reply || "");
    if (message.status === "new") {
      try {
        await contactService.getById(message._id); // marks as read server-side
        fetchData();
      } catch {
        // non-fatal
      }
    }
  };

  const handleReply = async () => {
    if (!active || !replyText.trim()) return;
    setSending(true);
    try {
      await contactService.reply(active._id, replyText.trim());
      toast.success("Reply sent");
      setActive(null);
      setReplyText("");
      fetchData();
    } catch {
      toast.error("Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await contactService.delete(deleteTarget._id);
      toast.success("Message deleted");
      setDeleteTarget(null);
      fetchData();
    } catch {
      toast.error("Failed to delete message");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader title="Contact Messages" subtitle="Messages submitted from the website contact form" />

      <div className="mb-5 flex gap-2 flex-wrap">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-3.5 py-1.5 text-sm font-medium rounded-full border transition-colors cursor-pointer ${
              statusFilter === tab.key
                ? "bg-blue-600 border-blue-600 text-white"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Message"
        message={`Delete the message from "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        confirmColor="red"
        loading={deleting}
      />

      <Modal open={!!active} onClose={() => setActive(null)} title="Contact Message">
        {active && (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-900">{active.name}</p>
                <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <Mail size={13} /> {active.email}
                </p>
                {active.phone && (
                  <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <Phone size={13} /> {active.phone}
                  </p>
                )}
              </div>
              <StatusBadge status={active.status} />
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                {active.subject}
              </p>
              <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3 whitespace-pre-wrap">
                {active.message}
              </p>
            </div>

            {active.reply && (
              <div>
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">
                  Previous Reply
                </p>
                <p className="text-sm text-slate-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3 whitespace-pre-wrap">
                  {active.reply}
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {active.reply ? "Send another reply" : "Reply"}
              </label>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={4}
                placeholder="Type your reply — this will be emailed to the sender"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={sending}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setActive(null)}
                disabled={sending}
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40 cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={handleReply}
                disabled={sending || !replyText.trim()}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-40 cursor-pointer inline-flex items-center justify-center gap-2"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Reply size={16} />}
                {sending ? "Sending..." : "Send Reply"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {loading ? <Loading /> : messages.length === 0 ? <EmptyState message="No contact messages yet" /> : (
        <DataTable
          columns={[
            { key: "name", header: "From", render: (m) => (
              <div>
                <p className="font-medium text-slate-900">{m.name}</p>
                <p className="text-xs text-slate-500">{m.email}</p>
              </div>
            )},
            { key: "subject", header: "Subject", render: (m) => <span className="text-slate-600">{m.subject}</span> },
            { key: "message", header: "Message", render: (m) => (
              <span className="text-slate-500 line-clamp-1 max-w-xs block">{m.message}</span>
            )},
            { key: "date", header: "Received", render: (m) => (
              <span className="text-slate-500">{new Date(m.createdAt).toLocaleDateString()}</span>
            )},
            { key: "status", header: "Status", render: (m) => <StatusBadge status={m.status} /> },
            { key: "actions", header: "", render: (m) => (
              <div className="flex gap-1.5 justify-end">
                <ActionButton icon={Reply} label="View / Reply" onClick={() => openMessage(m)} color="blue" />
                <ActionButton icon={Trash2} label="Delete" onClick={() => setDeleteTarget(m)} color="red" />
              </div>
            )},
          ]}
          data={messages}
        />
      )}
    </div>
  );
}
