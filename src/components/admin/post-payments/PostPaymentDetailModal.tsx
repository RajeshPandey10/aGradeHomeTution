"use client";

import {
  Ban,
  BadgeCheck,
  Eye,
  KeyRound,
  MapPin,
  Pencil,
  Trash2,
  Undo2,
  XCircle,
} from "lucide-react";
import { Modal } from "@/components/admin/Modal";
import { StatusBadge, TeacherAvatar } from "@/components/admin/UI";
import { getImageUrl } from "@/lib/image";
import { formatRs } from "@/lib/money";
import { formatDayCount, formatShortDate, formatTime } from "@/lib/nepalTime";
import type { PostPayment } from "@/services/postPaymentService";
import { AgreementIcon, Field, ReturnDaysBadge, SourceBadge } from "./bits";

export type PostPaymentAction = "convert" | "reject" | "blacklist" | "pending" | "edit" | "delete" | "activate";

const HISTORY_LABEL: Record<string, string> = {
  created: "Recorded",
  held: "Held as draft",
  activated: "Access granted",
  edited: "Edited",
  converted: "Converted",
  rejected: "Rejected",
  blacklisted: "Blacklisted",
  pending: "Moved back to pending",
};

function Btn({
  icon: Icon,
  label,
  onClick,
  cls,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  onClick: () => void;
  cls: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${cls}`}
    >
      <Icon size={15} /> {label}
    </button>
  );
}

/** Actions an admin can take on a record in this status. */
export function actionsFor(pp: PostPayment): PostPaymentAction[] {
  if (pp.status === "draft") return ["activate", "edit", "delete"];
  const decisions: PostPaymentAction[] = (["convert", "reject", "blacklist"] as const).filter(
    (a) => !(
      (a === "convert" && pp.status === "converted") ||
      (a === "reject" && pp.status === "rejected") ||
      (a === "blacklist" && pp.status === "blacklisted")
    ),
  );
  return [...decisions, ...(pp.status !== "pending" ? (["pending"] as const) : []), "edit", "delete"];
}

export function PostPaymentDetailModal({
  pp,
  today,
  onClose,
  onAction,
  onViewTeacher,
  onViewRequest,
  onViewAgreement,
}: {
  pp: PostPayment | null;
  today: string;
  onClose: () => void;
  onAction: (action: PostPaymentAction, pp: PostPayment) => void;
  onViewTeacher: (pp: PostPayment) => void;
  onViewRequest: (pp: PostPayment) => void;
  onViewAgreement: (pp: PostPayment) => void;
}) {
  if (!pp) return null;
  const name = pp.teacherProfile?.name || pp.teacher.name || pp.teacherSnapshot?.name || "Teacher";
  const phone = pp.teacher.phoneNumber || pp.teacherProfile?.phone || pp.teacherSnapshot?.phoneNumber;
  const tuition = pp.tuitionRequest || pp.tuitionSnapshot;
  const actions = actionsFor(pp);

  return (
    <Modal open onClose={onClose} title="Post payment" wide>
      <div className="space-y-5 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={pp.status} kind="postPaymentStatus" />
          <SourceBadge source={pp.source} />
          {pp.warningAcknowledged && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
              Given despite unsettled payments
            </span>
          )}
          <span className="text-xs text-slate-400">
            Recorded {formatShortDate(pp.recordedAt)}, {formatTime(pp.recordedAt)}
            {pp.createdBy?.name ? ` by ${pp.createdBy.name}` : ""}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onViewTeacher(pp)}
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 text-left hover:border-blue-300 hover:bg-blue-50/40"
          >
            <TeacherAvatar name={name} src={getImageUrl(pp.teacherProfile?.profilePicture)} size={44} />
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Teacher</p>
              <p className="truncate font-medium text-slate-900">{name}</p>
              <p className="truncate text-xs text-slate-500">{[phone, pp.teacher.email].filter(Boolean).join(" · ")}</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => onViewRequest(pp)}
            disabled={!pp.tuitionRequest}
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 text-left hover:border-blue-300 hover:bg-blue-50/40 disabled:cursor-default disabled:hover:border-slate-200 disabled:hover:bg-transparent"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <Eye size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                Tuition {pp.tuitionRequest ? "" : "(request deleted)"}
              </p>
              <p className="truncate font-medium text-slate-900">{tuition?.name || "—"}</p>
              <p className="flex items-center gap-1 truncate text-xs text-slate-500">
                <MapPin size={11} /> {tuition?.location?.split(",")[0] || "—"}
                {!pp.requestLinked && pp.status !== "draft" && pp.tuitionRequest && " · no longer assigned"}
              </p>
            </div>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-4">
          <Field label="Commission">
            {pp.commissionPercent}% <span className="text-slate-500">of {formatRs(pp.baseSalary)}</span>
          </Field>
          <Field label="Commission amount"><span className="font-semibold">{formatRs(pp.commissionAmount)}</span></Field>
          <Field label="Partial paid">{pp.partialPaidAmount ? formatRs(pp.partialPaidAmount) : "None"}</Field>
          <Field label="Still owed">
            <span className={pp.outstanding ? "font-semibold text-red-700" : ""}>{formatRs(pp.outstanding)}</span>
          </Field>
          <Field label="Return days">{formatDayCount(pp.returnDays)}</Field>
          <Field label="Due date">{formatShortDate(pp.dueDate)}</Field>
          <Field label="Countdown"><ReturnDaysBadge pp={pp} today={today} compact /></Field>
          <Field label="Agreement">
            {pp.agreement ? (
              <button type="button" onClick={() => onViewAgreement(pp)} className="inline-flex cursor-pointer items-center gap-1 text-blue-600 hover:underline">
                <AgreementIcon agreement={pp.agreement} /> View
              </button>
            ) : (
              <span className="text-slate-400">Not attached</span>
            )}
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Collected", value: pp.collected, cls: "text-emerald-700" },
            { label: "Pending", value: pp.pending, cls: "text-amber-700" },
            { label: "Bad debt", value: pp.badDebt, cls: "text-red-700" },
            { label: "Deducted", value: pp.deducted, cls: "text-slate-500" },
          ].map((t) => (
            <div key={t.label} className="rounded-xl border border-slate-200 px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{t.label}</p>
              <p className={`font-semibold tabular-nums ${t.cls}`}>{formatRs(t.value)}</p>
            </div>
          ))}
        </div>

        {pp.status === "rejected" && pp.rejectionReason && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-red-500">Rejection reason</p>
            <p className="mt-0.5 whitespace-pre-wrap text-red-900">{pp.rejectionReason}</p>
            {pp.decidedAt && (
              <p className="mt-1 text-xs text-red-500">
                {formatShortDate(pp.decidedAt)}, {formatTime(pp.decidedAt)}
                {pp.decidedBy?.name ? ` · ${pp.decidedBy.name}` : ""}
              </p>
            )}
          </div>
        )}

        {!!pp.history?.length && (
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-blue-600">History</h4>
            <ol className="relative space-y-3 border-l border-slate-200 pl-4">
              {[...pp.history].reverse().map((h, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-blue-500" />
                  <p className="font-medium text-slate-800">{HISTORY_LABEL[h.action] || h.action}</p>
                  <p className="text-xs text-slate-500">
                    {formatShortDate(h.at)}, {formatTime(h.at)}
                    {h.by?.name ? ` · ${h.by.name}` : ""}
                    {h.note ? ` · ${h.note}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
          {actions.includes("delete") && (
            <Btn icon={Trash2} label="Delete" onClick={() => onAction("delete", pp)} cls="border border-red-200 text-red-600 hover:bg-red-50 sm:mr-auto" />
          )}
          {actions.includes("edit") && (
            <Btn icon={Pencil} label="Edit" onClick={() => onAction("edit", pp)} cls="border border-slate-300 text-slate-700 hover:bg-slate-50" />
          )}
          {actions.includes("pending") && (
            <Btn icon={Undo2} label="Back to pending" onClick={() => onAction("pending", pp)} cls="border border-slate-300 text-slate-700 hover:bg-slate-50" />
          )}
          {actions.includes("blacklist") && (
            <Btn icon={Ban} label="Blacklist" onClick={() => onAction("blacklist", pp)} cls="bg-zinc-900 text-white hover:bg-zinc-800" />
          )}
          {actions.includes("reject") && (
            <Btn icon={XCircle} label="Reject" onClick={() => onAction("reject", pp)} cls="bg-red-600 text-white hover:bg-red-700" />
          )}
          {actions.includes("convert") && (
            <Btn icon={BadgeCheck} label="Converted" onClick={() => onAction("convert", pp)} cls="bg-emerald-600 text-white hover:bg-emerald-700" />
          )}
          {actions.includes("activate") && (
            <Btn icon={KeyRound} label="Give access" onClick={() => onAction("activate", pp)} cls="bg-violet-600 text-white hover:bg-violet-700" />
          )}
        </div>
      </div>
    </Modal>
  );
}
