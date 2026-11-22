"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { CheckCircle, X } from "lucide-react";
import { Modal } from "@/components/admin/Modal";
import {
  Field,
  StudentsSection,
  TuitionFieldsSection,
  inputClass,
  resizeStudents,
  studentsFromRequest,
  studentsPayload,
  tuitionFieldsFromRequest,
  tuitionFieldsPayload,
  validateTuition,
  type Student,
  type TuitionFieldValues,
} from "@/components/admin/TuitionFields";
import { useToast } from "@/hooks/useToast";
import { getErrorMessage } from "@/lib/errors";
import { parentService, type ParentProfile } from "@/services/parentService";

const LocationPicker = dynamic(() => import("@/components/admin/LocationPicker"), {
  ssr: false,
});

type EditForm = TuitionFieldValues & {
  name: string;
  phone: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  students: Student[];
  salary: string;
  /** "start-end" pairs separated by commas, as stored (e.g. "4:00 PM-5:00 PM"). */
  timeSlots: string;
  requirements: string;
};

const formFromRequest = (r: ParentProfile): EditForm => ({
  ...tuitionFieldsFromRequest(r),
  name: r.name || "",
  phone: r.phone || "",
  location: r.location || "",
  latitude: r.latitude ?? null,
  longitude: r.longitude ?? null,
  students: studentsFromRequest(r),
  salary: r.salary || "",
  timeSlots: r.timeSlots?.map((s) => `${s.start}-${s.end}`).join(", ") || "",
  requirements: r.requirements || "",
});

const parseTimeSlots = (value: string) =>
  value
    .split(",")
    .map((s) => {
      const [start, end] = s.trim().split("-");
      return { start: start?.trim() || "", end: end?.trim() || "" };
    })
    .filter((s) => s.start && s.end);

export default function EditParentRequestModal({
  request,
  onClose,
  onSaved,
}: {
  /** The request being edited; null closes the modal. */
  request: ParentProfile | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<EditForm | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(request ? formFromRequest(request) : null);
    setErrors({});
  }, [request]);

  const clearErrors = (keys: string[]) =>
    setErrors((e) => {
      if (!keys.some((k) => e[k])) return e;
      const next = { ...e };
      keys.forEach((k) => delete next[k]);
      return next;
    });

  const update = useCallback(<K extends keyof EditForm>(key: K, value: EditForm[K]) => {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }, []);

  const updateTuition = useCallback((patch: Partial<TuitionFieldValues>) => {
    setForm((f) =>
      f
        ? {
            ...f,
            ...patch,
            students: patch.numberOfStudents
              ? resizeStudents(f.students, Number(patch.numberOfStudents))
              : f.students,
          }
        : f,
    );
    clearErrors(Object.keys(patch));
  }, []);

  const updateStudent = useCallback((index: number, patch: Partial<Student>) => {
    setForm((f) =>
      f
        ? { ...f, students: f.students.map((s, i) => (i === index ? { ...s, ...patch } : s)) }
        : f,
    );
    clearErrors(Object.keys(patch).map((k) => `students.${index}.${k}`));
  }, []);

  const handleSave = async () => {
    if (!request || !form) return;
    const found = validateTuition(form, form.students);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      toast.error("Fill in the highlighted fields");
      return;
    }

    setSaving(true);
    try {
      await parentService.update(request._id, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        location: form.location.trim(),
        ...(form.latitude != null && form.longitude != null
          ? { latitude: form.latitude, longitude: form.longitude }
          : {}),
        ...tuitionFieldsPayload(form),
        ...studentsPayload(form.students),
        salary: form.salary.trim(),
        timeSlots: parseTimeSlots(form.timeSlots),
        requirements: form.requirements.trim(),
      });
      toast.success("Parent request updated");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to update parent request"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={!!request} onClose={onClose} title="Edit Parent Request" wide>
      {form && (
        <div className="space-y-5 text-sm max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Name">
              <input
                className={inputClass()}
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
              />
            </Field>
            <Field label="Phone">
              <input
                className={inputClass()}
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
              />
            </Field>
          </div>
          <div className="space-y-2">
            <Field label="Location">
              <textarea
                className={inputClass()}
                rows={2}
                value={form.location}
                onChange={(e) => update("location", e.target.value)}
              />
            </Field>
            <LocationPicker
              latitude={form.latitude}
              longitude={form.longitude}
              onChange={({ label, latitude, longitude }) =>
                setForm((f) => (f ? { ...f, location: label, latitude, longitude } : f))
              }
            />
          </div>

          <TuitionFieldsSection value={form} errors={errors} onChange={updateTuition} />
          <StudentsSection students={form.students} errors={errors} onChange={updateStudent} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Salary">
              <input
                className={inputClass()}
                value={form.salary}
                onChange={(e) => update("salary", e.target.value)}
              />
            </Field>
            <Field
              label="Time slots"
              hint="e.g. 4:00 PM-5:00 PM, 6:00 PM-7:00 PM"
              className="sm:col-span-2"
            >
              <input
                className={inputClass()}
                value={form.timeSlots}
                onChange={(e) => update("timeSlots", e.target.value)}
              />
            </Field>
          </div>
          <Field label="Requirements">
            <textarea
              className={inputClass()}
              rows={4}
              placeholder="Add any special learning requirements, preferences, or notes"
              value={form.requirements}
              onChange={(e) => update("requirements", e.target.value)}
            />
          </Field>

          <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40"
            >
              <X size={16} /> Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-40"
            >
              <CheckCircle size={16} /> {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
