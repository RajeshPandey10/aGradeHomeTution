"use client";

import { useEffect, useState } from "react";
import { Loader2, Trash2, XCircle } from "lucide-react";
import { formatRs } from "@/lib/money";
import type { PostPayment } from "@/services/postPaymentService";

function Shell({
  open,
  busy,
  onClose,
  icon,
  title,
  children,
  footer,
}: {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-black/40" onClick={() => !busy && onClose()} />
      <div className="relative mx-4 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start gap-3">
          {icon}
          <h2 className="pt-2 text-lg font-semibold text-slate-900">{title}</h2>
        </div>
        {children}
        <div className="mt-5 flex gap-3">{footer}</div>
      </div>
    </div>
  );
}

const ReopenToggle = ({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled: boolean;
}) => (
  <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 p-3 text-sm">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      disabled={disabled}
      className="mt-0.5 h-4 w-4 accent-blue-600"
    />
    <span>
      <span className="font-medium text-slate-800">Also make the tuition request vacant again</span>
      <span className="block text-xs text-slate-500">
        The teacher loses the assignment (and is told), and other teachers can apply.
      </span>
    </span>
  </label>
);

/** Reject: a reason is required; optionally reopens the request. */
export function RejectDialog({
  pp,
  busy,
  onClose,
  onConfirm,
}: {
  pp: PostPayment | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: (reason: string, reopenRequest: boolean) => void;
}) {
  const [reason, setReason] = useState("");
  const [reopen, setReopen] = useState(false);
  useEffect(() => {
    setReason("");
    setReopen(false);
  }, [pp?._id]);

  return (
    <Shell
      open={!!pp}
      busy={busy}
      onClose={onClose}
      title="Reject post payment"
      icon={
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
          <XCircle size={22} />
        </span>
      }
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className="flex-1 cursor-pointer rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason.trim(), reopen)}
            disabled={busy || !reason.trim()}
            className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40"
          >
            {busy && <Loader2 size={16} className="animate-spin" />} Reject
          </button>
        </>
      }
    >
      {pp && (
        <>
          <p className="mb-3 text-sm text-slate-600">
            {pp.status === "pending" && pp.pending > 0
              ? `${formatRs(pp.pending)} will be taken out of pending revenue.`
              : `${formatRs(pp.commissionAmount)} will no longer be counted.`}{" "}
            The reason stays on record for future reference.
          </p>
          <label htmlFor="reject-reason" className="mb-1 block text-sm font-medium text-slate-700">
            Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            id="reject-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={1000}
            autoFocus
            disabled={busy}
            placeholder="e.g. Parent cancelled the tuition after two days"
            className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          {pp.requestLinked && <ReopenToggle checked={reopen} onChange={setReopen} disabled={busy} />}
        </>
      )}
    </Shell>
  );
}

/** Delete: removes the record and its agreement file; optionally reopens the request. */
export function DeleteDialog({
  pp,
  busy,
  onClose,
  onConfirm,
}: {
  pp: PostPayment | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: (reason: string, reopenRequest: boolean) => void;
}) {
  const [reason, setReason] = useState("");
  const [reopen, setReopen] = useState(false);
  useEffect(() => {
    setReason("");
    setReopen(false);
  }, [pp?._id]);

  return (
    <Shell
      open={!!pp}
      busy={busy}
      onClose={onClose}
      title="Delete post payment"
      icon={
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
          <Trash2 size={20} />
        </span>
      }
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className="flex-1 cursor-pointer rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason.trim(), reopen)}
            disabled={busy}
            className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40"
          >
            {busy && <Loader2 size={16} className="animate-spin" />} Delete
          </button>
        </>
      }
    >
      {pp && (
        <>
          <p className="mb-3 text-sm text-slate-600">
            This deletes the record for{" "}
            <span className="font-medium text-slate-900">{pp.teacherProfile?.name || pp.teacher.name}</span> and its
            agreement file. It can&apos;t be undone; a copy is kept in the Audit Logs.
          </p>
          <label htmlFor="delete-reason" className="mb-1 block text-sm font-medium text-slate-700">
            Reason <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            id="delete-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            maxLength={1000}
            disabled={busy}
            className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          {pp.requestLinked && pp.status !== "draft" && <ReopenToggle checked={reopen} onChange={setReopen} disabled={busy} />}
        </>
      )}
    </Shell>
  );
}
