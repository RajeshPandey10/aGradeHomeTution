"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Ban,
  ChevronDown,
  ExternalLink,
  FileText,
  KeyRound,
  Loader2,
  PauseCircle,
  X,
} from "lucide-react";
import { TeacherAvatar } from "@/components/admin/UI";
import { getImageUrl } from "@/lib/image";
import { formatRs } from "@/lib/money";
import { formatDayCount, formatShortDate, formatTime, useToday } from "@/lib/nepalTime";
import type { PostPayment, UnsettledInfo } from "@/services/postPaymentService";
import { Field, SourceBadge, isPdf, liveDaysLeft } from "./bits";

function Countdown({ pp, today }: { pp: PostPayment; today: string }) {
  const left = liveDaysLeft(pp, today);
  if (left === null) return null;
  if (left > 0) {
    return (
      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        {formatDayCount(left)} remaining
      </span>
    );
  }
  if (left === 0) {
    return <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">Due today</span>;
  }
  return (
    <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
      Exceeded by {formatDayCount(left)}
    </span>
  );
}

function UnsettledCard({ pp, today }: { pp: PostPayment; today: string }) {
  const tuition = pp.tuitionRequest || pp.tuitionSnapshot;
  const agreementUrl = pp.agreement ? getImageUrl(pp.agreement.url) : "";
  return (
    <div className={`rounded-xl border p-4 ${pp.status === "blacklisted" ? "border-zinc-300 bg-zinc-50" : "border-amber-200 bg-amber-50/50"}`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900">{tuition?.name || "Tuition"}</p>
          <p className="truncate text-xs text-slate-500">{tuition?.location?.split(",")[0] || "—"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {pp.status === "blacklisted" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white">
              <Ban size={12} /> Blacklisted
            </span>
          )}
          <Countdown pp={pp} today={today} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label="Source"><SourceBadge source={pp.source} /></Field>
        <Field label="Commission">
          {pp.commissionPercent}% <span className="text-slate-500">· {formatRs(pp.commissionAmount)}</span>
        </Field>
        <Field label="Partial paid">{pp.partialPaidAmount ? formatRs(pp.partialPaidAmount) : "None"}</Field>
        <Field label="Return days">{formatDayCount(pp.returnDays)}</Field>
        <Field label="Date & time">
          {formatShortDate(pp.recordedAt)}, {formatTime(pp.recordedAt)}
        </Field>
        <Field label="Still owed">
          <span className="font-semibold text-red-700">{formatRs(pp.outstanding)}</span>
        </Field>
      </div>
      <div className="mt-3">
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Agreement</p>
        {pp.agreement ? (
          isPdf(pp.agreement) ? (
            <a href={agreementUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
              <FileText size={14} /> {pp.agreement.originalName || "Agreement.pdf"} <ExternalLink size={12} />
            </a>
          ) : (
            <a href={agreementUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block" title="Open full size">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={agreementUrl} alt="Agreement" className="h-20 rounded-md object-cover ring-1 ring-slate-200" />
            </a>
          )
        ) : (
          <p className="mt-0.5 text-sm text-slate-500">None attached</p>
        )}
      </div>
    </div>
  );
}

/**
 * Shown when a teacher who still owes on earlier post payments is chosen
 * again. Access grants the new one anyway (on record); Hold saves it as a
 * draft to grant later.
 */
export function UnsettledWarning({
  info,
  mode,
  busy,
  onAccess,
  onHold,
  onClose,
}: {
  info: UnsettledInfo | null;
  /** create/activate: Access + Hold. edit: Proceed + Cancel. */
  mode: "create" | "activate" | "edit";
  busy: "access" | "hold" | null;
  onAccess: () => void;
  onHold: () => void;
  onClose: () => void;
}) {
  const today = useToday();
  const [showProfile, setShowProfile] = useState(false);
  if (!info) return null;

  const { teacher, unsettled } = info;
  const profile = unsettled[0]?.teacherProfile;
  const name = teacher.profile?.name || teacher.name || "This teacher";
  const phone = teacher.phoneNumber || teacher.profile?.phone;
  const blacklisted = unsettled.some((u) => u.status === "blacklisted");
  const owed = unsettled.reduce((sum, u) => sum + (u.outstanding || 0), 0);

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center" role="alertdialog" aria-modal="true" aria-labelledby="unsettled-title">
      <div className="fixed inset-0 bg-black/50" onClick={() => !busy && onClose()} />
      <div className="relative mx-4 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className={`flex items-start gap-3 px-5 py-4 ${blacklisted ? "bg-zinc-900 text-white" : "bg-amber-50 text-amber-900"}`}>
          <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${blacklisted ? "bg-white/10" : "bg-amber-100"}`}>
            {blacklisted ? <Ban size={20} /> : <AlertTriangle size={20} className="text-amber-600" />}
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="unsettled-title" className="text-base font-semibold">
              {blacklisted
                ? `${name} is blacklisted for an unpaid post payment`
                : `${name} hasn't settled ${unsettled.length === 1 ? "a previous post payment" : `${unsettled.length} previous post payments`}`}
            </h2>
            <p className={`mt-0.5 text-sm ${blacklisted ? "text-zinc-300" : "text-amber-800"}`}>
              {formatRs(owed)} still owed. Review before giving another tuition.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={!!busy}
            aria-label="Close"
            className="cursor-pointer rounded-lg p-1 opacity-70 hover:opacity-100 disabled:opacity-30"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="rounded-xl border border-slate-200 p-3">
            <div className="flex items-center gap-3">
              <TeacherAvatar name={name} src={getImageUrl(profile?.profilePicture)} size={44} />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900">{name}</p>
                <p className="truncate text-xs text-slate-500">{[phone, teacher.email].filter(Boolean).join(" · ")}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowProfile((v) => !v)}
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
                aria-expanded={showProfile}
              >
                View <ChevronDown size={14} className={`transition-transform ${showProfile ? "rotate-180" : ""}`} />
              </button>
            </div>
            {showProfile && (
              <div className="mt-3 grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2">
                <Field label="Address">{profile?.address}</Field>
                <Field label="Gender">{profile?.gender}</Field>
                <Field label="Qualification">{profile?.academicQualification}</Field>
                <Field label="Experience">{profile?.experience}</Field>
                <div className="sm:col-span-2">
                  <Field label="About">{profile?.about}</Field>
                </div>
                {profile?.cv && (
                  <a href={getImageUrl(profile.cv)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
                    <FileText size={14} /> View CV <ExternalLink size={12} />
                  </a>
                )}
              </div>
            )}
          </div>

          {unsettled.map((pp) => (
            <UnsettledCard key={pp._id} pp={pp} today={today} />
          ))}
        </div>

        <div className="border-t border-slate-200 bg-slate-50 px-5 py-4">
          <p className="mb-3 text-xs text-slate-500">
            {mode === "edit"
              ? "Proceed to assign this teacher anyway. The earlier records stay as they are."
              : "Access assigns the tuition now and keeps a record that you were warned. Hold saves it as a draft you can grant later from Post Payments."}
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={mode === "edit" ? onClose : onHold}
              disabled={!!busy}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              {busy === "hold" ? <Loader2 size={16} className="animate-spin" /> : mode !== "edit" && <PauseCircle size={16} />}
              {mode === "edit" ? "Cancel" : mode === "activate" ? "Keep on hold" : "Hold (save as draft)"}
            </button>
            <button
              type="button"
              onClick={onAccess}
              disabled={!!busy}
              className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40 ${blacklisted ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"}`}
            >
              {busy === "access" ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
              {mode === "edit" ? "Proceed anyway" : "Give access"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
