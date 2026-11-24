"use client";

import { useEffect, useState } from "react";
import { ExternalLink, FileText, Mail, MapPin, Phone } from "lucide-react";
import { Modal } from "@/components/admin/Modal";
import { EmptyState, Loading, StatusBadge, TeacherAvatar } from "@/components/admin/UI";
import { getErrorMessage } from "@/lib/errors";
import { getImageUrl } from "@/lib/image";
import { formatRs } from "@/lib/money";
import { formatShortDate, formatTime } from "@/lib/nepalTime";
import { postPaymentService, type PostPayment, type TeacherHistory } from "@/services/postPaymentService";
import { AgreementIcon, Field, ReturnDaysBadge, SourceBadge } from "./bits";

/**
 * A teacher's profile and every post payment they've had, with what they've
 * paid, owe and defaulted on. Opened by clicking a teacher anywhere on the
 * Post Payments page.
 */
export function TeacherHistoryModal({
  userId,
  today,
  onClose,
  onOpenRecord,
  onViewAgreement,
}: {
  userId: string | null;
  today: string;
  onClose: () => void;
  onOpenRecord?: (pp: PostPayment) => void;
  onViewAgreement: (pp: PostPayment) => void;
}) {
  const [data, setData] = useState<TeacherHistory | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setData(null);
    setError(null);
    postPaymentService
      .teacherHistory(userId)
      .then((res) => !cancelled && setData(res.data))
      .catch((err) => !cancelled && setError(getErrorMessage(err, "Couldn't load this teacher")));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const profile = data?.profile;
  const teacher = data?.teacher;
  const name = profile?.name || teacher?.name || "Teacher";
  const phone = teacher?.phoneNumber || profile?.phone;

  return (
    <Modal open={!!userId} onClose={onClose} title="Teacher details" wide>
      {error ? (
        <EmptyState message={error} />
      ) : !data ? (
        <Loading />
      ) : (
        <div className="space-y-5 text-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <TeacherAvatar name={name} src={getImageUrl(profile?.profilePicture)} size={64} />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold text-slate-900">{name}</h3>
                {profile?.status && <StatusBadge status={profile.status} kind="teacherStatus" />}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-600">
                {phone && (
                  <a href={`tel:${phone}`} className="inline-flex items-center gap-1 hover:text-blue-600">
                    <Phone size={13} /> {phone}
                  </a>
                )}
                {teacher?.email && (
                  <a href={`mailto:${teacher.email}`} className="inline-flex items-center gap-1 hover:text-blue-600">
                    <Mail size={13} /> {teacher.email}
                  </a>
                )}
                {profile?.address && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={13} /> {profile.address}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Post payments", value: String(data.totals.count), cls: "text-slate-900" },
              { label: "Collected", value: formatRs(data.totals.collected), cls: "text-emerald-700" },
              { label: "Pending", value: formatRs(data.totals.pending), cls: "text-amber-700" },
              { label: "Bad debt", value: formatRs(data.totals.badDebt), cls: "text-red-700" },
            ].map((t) => (
              <div key={t.label} className="rounded-xl border border-slate-200 p-3">
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{t.label}</p>
                <p className={`mt-0.5 text-base font-semibold tabular-nums ${t.cls}`}>{t.value}</p>
              </div>
            ))}
          </div>

          {profile && (
            <div className="grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
              <Field label="Gender">{profile.gender}</Field>
              <Field label="Qualification">{profile.academicQualification}</Field>
              <Field label="Experience">{profile.experience}</Field>
              <Field label="Account since">{teacher?.createdAt ? formatShortDate(teacher.createdAt) : null}</Field>
              <div className="sm:col-span-2">
                <Field label="About">{profile.about}</Field>
              </div>
              {profile.cv && (
                <a href={getImageUrl(profile.cv)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                  <FileText size={14} /> View CV <ExternalLink size={12} />
                </a>
              )}
            </div>
          )}

          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-blue-600">Post-payment history</h4>
            {data.records.length === 0 ? (
              <p className="text-slate-500">No post payments yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {data.records.map((pp) => (
                  <li key={pp._id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenRecord?.(pp)}
                          className="cursor-pointer truncate font-medium text-slate-900 hover:text-blue-600"
                        >
                          {pp.tuitionRequest?.name || pp.tuitionSnapshot?.name || "Tuition"}
                        </button>
                        <StatusBadge status={pp.status} kind="postPaymentStatus" />
                        <SourceBadge source={pp.source} />
                      </div>
                      <p className="text-xs text-slate-500">
                        {formatShortDate(pp.recordedAt)}, {formatTime(pp.recordedAt)} · {pp.commissionPercent}% ={" "}
                        {formatRs(pp.commissionAmount)}
                        {pp.partialPaidAmount ? ` · ${formatRs(pp.partialPaidAmount)} paid up front` : ""}
                      </p>
                      {pp.status === "rejected" && pp.rejectionReason && (
                        <p className="mt-0.5 text-xs text-red-600">Reason: {pp.rejectionReason}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <ReturnDaysBadge pp={pp} today={today} compact />
                      {pp.agreement && (
                        <button
                          type="button"
                          onClick={() => onViewAgreement(pp)}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                        >
                          <AgreementIcon agreement={pp.agreement} size={12} /> Agreement
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
