"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, HandCoins, Loader2, MapPin } from "lucide-react";
import { Modal } from "@/components/admin/Modal";
import { useToast } from "@/hooks/useToast";
import { fromLocalInput, toLocalInput } from "@/lib/datetime";
import { getErrorMessage } from "@/lib/errors";
import { optionsFor, type PostPaymentSource } from "@/lib/enums";
import { formatRs, parseSalary } from "@/lib/money";
import { formatDayCount, formatShortDate } from "@/lib/nepalTime";
import type { ParentProfile } from "@/services/parentService";
import {
  fieldErrorsFromError,
  postPaymentService,
  unsettledFromError,
  type PostPayment,
  type PostPaymentFields,
  type TeacherOption,
  type UnsettledInfo,
} from "@/services/postPaymentService";
import { AgreementDrop } from "./AgreementDrop";
import { TeacherPicker } from "./TeacherPicker";
import { UnsettledWarning } from "./UnsettledWarning";

// Verified teachers, shared by every form for a minute (the list is small and
// changes rarely; the "owes" badges refresh after each save).
let teacherCache: { at: number; promise: Promise<TeacherOption[]> } | null = null;
export function loadTeacherOptions(force = false) {
  if (force || !teacherCache || Date.now() - teacherCache.at > 60_000) {
    const promise = postPaymentService.teacherOptions().then((r) => r.data);
    promise.catch(() => {
      teacherCache = null;
    });
    teacherCache = { at: Date.now(), promise };
  }
  return teacherCache.promise;
}

const RETURN_DAY_PRESETS = [3, 5, 7, 10, 15, 30];

const inputClass = (invalid?: boolean) =>
  `w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${invalid ? "border-red-300" : "border-slate-300"}`;

function Label({ htmlFor, children, hint }: { htmlFor?: string; children: React.ReactNode; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-slate-700">
      {children}
      {hint && <span className="ml-1 font-normal text-slate-400">{hint}</span>}
    </label>
  );
}

const FieldError = ({ message }: { message?: string }) =>
  message ? <p className="mt-1 text-xs text-red-600">{message}</p> : null;

/** A TeacherOption for the teacher on an existing record (they may no longer be listed). */
const optionFromRecord = (pp: PostPayment): TeacherOption => ({
  userId: pp.teacher._id,
  profileId: pp.teacherProfile?._id || "",
  name: pp.teacherProfile?.name || pp.teacher.name || pp.teacherSnapshot?.name || "Teacher",
  email: pp.teacher.email,
  phone: pp.teacher.phoneNumber || pp.teacherProfile?.phone || null,
  profilePicture: pp.teacherProfile?.profilePicture || null,
  unsettled: null,
});

/**
 * Records a post payment for a parent request (create) or edits one (edit).
 * Before uploading anything it checks whether the teacher still owes on
 * earlier post payments, and if so shows the warning (Access / Hold) first.
 */
export function PostPayFormModal({
  open,
  onClose,
  request,
  editing,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  request?: ParentProfile | null;
  editing?: PostPayment | null;
  onSaved: (pp: PostPayment) => void;
}) {
  const toast = useToast();
  const isEdit = !!editing;
  const [options, setOptions] = useState<TeacherOption[] | null>(null);
  const [teacher, setTeacher] = useState<TeacherOption | null>(null);
  const [source, setSource] = useState<PostPaymentSource | "">("");
  const [commission, setCommission] = useState("");
  const [salary, setSalary] = useState("");
  const [returnDays, setReturnDays] = useState("");
  const [partial, setPartial] = useState("");
  const [recordedAt, setRecordedAt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [warning, setWarning] = useState<UnsettledInfo | null>(null);
  const [warningBusy, setWarningBusy] = useState<"access" | "hold" | null>(null);

  // Reset whenever the form opens for a request / record.
  useEffect(() => {
    if (!open) return;
    setErrors({});
    setFile(null);
    setProgress(null);
    setWarning(null);
    if (editing) {
      setTeacher(optionFromRecord(editing));
      setSource(editing.source);
      setCommission(String(editing.commissionPercent));
      setSalary(String(editing.baseSalary ?? ""));
      setReturnDays(String(editing.returnDays));
      setPartial(editing.partialPaidAmount ? String(editing.partialPaidAmount) : "");
      setRecordedAt(toLocalInput(editing.recordedAt));
    } else {
      setTeacher(null);
      setSource("");
      setCommission(request?.platformFeePercent != null ? String(request.platformFeePercent) : "");
      setSalary(String(parseSalary(request?.salary) || ""));
      setReturnDays("");
      setPartial("");
      setRecordedAt(toLocalInput(new Date().toISOString()));
    }
    let cancelled = false;
    loadTeacherOptions()
      .then((list) => {
        if (cancelled) return;
        setOptions(list);
        // Show the edited teacher's live "owes" badge when they're listed.
        if (editing) {
          const listed = list.find((t) => t.userId === editing.teacher._id);
          if (listed) setTeacher(listed);
        }
      })
      .catch((err) => !cancelled && toast.error(getErrorMessage(err, "Couldn't load verified teachers")));
    return () => {
      cancelled = true;
    };
  }, [open, editing, request, toast]);

  const salaryNum = Number(salary) || 0;
  const commissionNum = Number(commission);
  const partialNum = Number(partial) || 0;
  const commissionAmount = Math.round(salaryNum * (Number.isFinite(commissionNum) ? commissionNum : 0)) / 100;
  const daysNum = Number(returnDays);
  const recordedIso = fromLocalInput(recordedAt);
  const dueDate = useMemo(
    () =>
      recordedIso && Number.isInteger(daysNum) && returnDays !== ""
        ? new Date(new Date(recordedIso).getTime() + daysNum * 86400000).toISOString()
        : null,
    [recordedIso, daysNum, returnDays],
  );
  const teacherChanged = isEdit && teacher && teacher.userId !== editing!.teacher._id;

  const validate = () => {
    const next: Record<string, string> = {};
    if (!teacher) next.teacherId = "Choose a verified teacher.";
    if (!source) next.source = "Choose a source.";
    if (commission === "" || !Number.isFinite(commissionNum) || commissionNum < 0 || commissionNum > 100) {
      next.commissionPercent = "Enter a commission between 0 and 100.";
    }
    if (salary !== "" && (!Number.isFinite(Number(salary)) || Number(salary) < 0)) next.baseSalary = "Enter a valid salary.";
    if (returnDays === "" || !Number.isInteger(daysNum) || daysNum < 0) next.returnDays = "Enter whole days (0 or more).";
    if (partial !== "" && (!Number.isFinite(Number(partial)) || Number(partial) < 0)) {
      next.partialPaidAmount = "Enter 0 or more.";
    } else if (commissionAmount > 0 && partialNum > commissionAmount) {
      next.partialPaidAmount = `Can't be more than the commission (${formatRs(commissionAmount)}).`;
    }
    if (!recordedIso) next.recordedAt = "Enter the date and time.";
    if (!isEdit && !file) next.agreement = "Attach the agreement (PDF, JPG or PNG).";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const fields = (acknowledgeWarning = false): PostPaymentFields => ({
    teacherId: teacher?.userId,
    source,
    commissionPercent: commission,
    baseSalary: salary === "" ? undefined : salary,
    returnDays,
    partialPaidAmount: partial === "" ? 0 : partial,
    recordedAt: recordedIso,
    agreement: file,
    acknowledgeWarning,
  });

  const finish = (pp: PostPayment, message: string) => {
    toast.success(message);
    loadTeacherOptions(true).catch(() => {});
    setWarning(null);
    onSaved(pp);
    onClose();
  };

  /** Sends the form. Returns false when the server raised the unsettled warning. */
  const send = async (action: "submit" | "hold", acknowledge: boolean) => {
    setProgress(file ? 0 : null);
    try {
      if (isEdit) {
        const res = await postPaymentService.update(editing!._id, fields(acknowledge), file ? setProgress : undefined);
        finish(res.data, "Post payment updated");
      } else {
        const res = await postPaymentService.create(request!._id, fields(acknowledge), action, file ? setProgress : undefined);
        finish(
          res.data,
          action === "hold"
            ? "Saved as a draft. Grant access any time from Post Payments."
            : "Post payment recorded. The request is now fulfilled.",
        );
      }
      return true;
    } catch (err) {
      const unsettled = unsettledFromError(err);
      if (unsettled) {
        setWarning(unsettled);
        return false;
      }
      const fieldErrors = fieldErrorsFromError(err);
      if (Object.keys(fieldErrors).length) setErrors(fieldErrors);
      toast.error(getErrorMessage(err, "Couldn't save the post payment"));
      return true;
    } finally {
      setProgress(null);
    }
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      // Warn before uploading the file when the teacher still owes money.
      const needsCheck = !isEdit || (teacherChanged && editing!.status !== "draft");
      if (needsCheck && teacher) {
        const check = await postPaymentService.checkTeacher(teacher.userId, editing?._id).catch(() => null);
        if (check?.data.unsettled.length) {
          setWarning(check.data);
          return;
        }
      }
      await send("submit", false);
    } finally {
      setSaving(false);
    }
  };

  const handleAccess = async () => {
    setWarningBusy("access");
    await send("submit", true);
    setWarningBusy(null);
  };
  const handleHold = async () => {
    setWarningBusy("hold");
    await send("hold", false);
    setWarningBusy(null);
  };

  const busy = saving || !!warningBusy;
  const req = request;
  const tuitionName = isEdit ? editing!.tuitionRequest?.name || editing!.tuitionSnapshot?.name : req?.name;
  const tuitionPlace = isEdit
    ? editing!.tuitionRequest?.location || editing!.tuitionSnapshot?.location
    : req?.location;

  return (
    <>
      <Modal open={open} onClose={() => !busy && onClose()} title={isEdit ? "Edit post payment" : "Post-pay"} wide>
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-slate-50 px-4 py-3 text-sm">
            <HandCoins size={18} className="text-violet-600" />
            <span className="font-medium text-slate-900">{tuitionName || "Tuition"}</span>
            {tuitionPlace && (
              <span className="inline-flex items-center gap-1 text-slate-500">
                <MapPin size={13} /> {tuitionPlace.split(",")[0]}
              </span>
            )}
            {(req?.salary || editing?.tuitionSnapshot?.salary) && (
              <span className="text-slate-500">Salary Rs. {req?.salary || editing?.tuitionSnapshot?.salary}</span>
            )}
            {!isEdit && (
              <span className="text-xs text-slate-400 sm:ml-auto">Submitting marks this request fulfilled.</span>
            )}
          </div>

          <div>
            <Label>Teacher <span className="text-red-500">*</span></Label>
            <TeacherPicker options={options} value={teacher} onChange={setTeacher} invalid={!!errors.teacherId} disabled={busy} />
            <FieldError message={errors.teacherId} />
            {teacher?.unsettled && (!isEdit || teacherChanged) && (
              <p className="mt-1.5 flex items-start gap-1.5 text-xs text-amber-700">
                <AlertTriangle size={13} className="mt-px shrink-0" />
                This teacher has unsettled post payments. You&apos;ll see them and choose Access or Hold before saving.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="pp-source">Source <span className="text-red-500">*</span></Label>
              <select
                id="pp-source"
                value={source}
                disabled={busy}
                onChange={(e) => setSource(e.target.value as PostPaymentSource | "")}
                className={inputClass(!!errors.source)}
              >
                <option value="">Choose source</option>
                {optionsFor("postPaymentSource").map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <FieldError message={errors.source} />
            </div>

            <div>
              <Label htmlFor="pp-recorded" hint="(for future reference)">Record date &amp; time <span className="text-red-500">*</span></Label>
              <div className="flex gap-2">
                <input
                  id="pp-recorded"
                  type="datetime-local"
                  value={recordedAt}
                  disabled={busy}
                  onChange={(e) => setRecordedAt(e.target.value)}
                  className={inputClass(!!errors.recordedAt)}
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setRecordedAt(toLocalInput(new Date().toISOString()))}
                  className="shrink-0 cursor-pointer rounded-lg border border-slate-300 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Now
                </button>
              </div>
              <FieldError message={errors.recordedAt} />
            </div>

            <div>
              <Label htmlFor="pp-commission">Commission % <span className="text-red-500">*</span></Label>
              <div className="relative">
                <input
                  id="pp-commission"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={100}
                  step="0.5"
                  value={commission}
                  disabled={busy}
                  onChange={(e) => setCommission(e.target.value)}
                  className={`${inputClass(!!errors.commissionPercent)} pr-8`}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">%</span>
              </div>
              <FieldError message={errors.commissionPercent} />
            </div>

            <div>
              <Label htmlFor="pp-salary" hint="(commission is worked out on this)">Monthly salary</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">Rs.</span>
                <input
                  id="pp-salary"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={salary}
                  disabled={busy}
                  onChange={(e) => setSalary(e.target.value)}
                  className={`${inputClass(!!errors.baseSalary)} pl-10`}
                />
              </div>
              <FieldError message={errors.baseSalary} />
            </div>

            <div>
              <Label htmlFor="pp-return">Return days <span className="text-red-500">*</span></Label>
              <input
                id="pp-return"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={returnDays}
                disabled={busy}
                onChange={(e) => setReturnDays(e.target.value)}
                placeholder="Days to pay"
                className={inputClass(!!errors.returnDays)}
              />
              <div className="mt-1.5 flex flex-wrap gap-1">
                {RETURN_DAY_PRESETS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    disabled={busy}
                    onClick={() => setReturnDays(String(d))}
                    className={`cursor-pointer rounded-md px-2 py-0.5 text-xs font-medium ${returnDays === String(d) ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
              <FieldError message={errors.returnDays} />
            </div>

            <div>
              <Label htmlFor="pp-partial" hint="(optional)">Partial paid amount</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">Rs.</span>
                <input
                  id="pp-partial"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={partial}
                  disabled={busy}
                  onChange={(e) => setPartial(e.target.value)}
                  placeholder="0"
                  className={`${inputClass(!!errors.partialPaidAmount)} pl-10`}
                />
              </div>
              <FieldError message={errors.partialPaidAmount} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-xl border border-violet-100 bg-violet-50/60 p-4 sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-violet-500">Commission</p>
              <p className="text-lg font-semibold text-violet-900 tabular-nums">{formatRs(commissionAmount)}</p>
              <p className="text-xs text-violet-600/80">
                {Number.isFinite(commissionNum) ? commissionNum : 0}% of {formatRs(salaryNum)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-violet-500">To collect</p>
              <p className="text-lg font-semibold text-violet-900 tabular-nums">{formatRs(Math.max(commissionAmount - partialNum, 0))}</p>
              <p className="text-xs text-violet-600/80">{partialNum ? `${formatRs(partialNum)} paid up front` : "Nothing paid up front"}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-violet-500">Due</p>
              <p className="flex items-center gap-1.5 text-lg font-semibold text-violet-900">
                <CalendarClock size={16} /> {dueDate ? formatShortDate(dueDate) : "—"}
              </p>
              <p className="text-xs text-violet-600/80">{returnDays !== "" && Number.isInteger(daysNum) ? `${formatDayCount(daysNum)} after the record date` : "Set return days"}</p>
            </div>
          </div>

          <div>
            <Label>Agreement {isEdit ? <span className="font-normal text-slate-400">(optional, replaces the current one)</span> : <span className="text-red-500">*</span>}</Label>
            <AgreementDrop
              file={file}
              onChange={setFile}
              currentName={isEdit ? editing!.agreement?.originalName || (editing!.agreement ? "Agreement" : null) : null}
              invalid={!!errors.agreement}
              disabled={busy}
            />
            <FieldError message={errors.agreement} />
          </div>

          {progress !== null && (
            <div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full bg-blue-600 transition-[width]" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-1 text-xs text-slate-500">Uploading agreement… {progress}%</p>
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={busy || !options}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-40"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              {isEdit ? "Save changes" : "Record post payment"}
            </button>
          </div>
        </div>
      </Modal>

      <UnsettledWarning
        info={warning}
        mode={isEdit ? "edit" : "create"}
        busy={warningBusy}
        onAccess={handleAccess}
        onHold={handleHold}
        onClose={() => setWarning(null)}
      />
    </>
  );
}
