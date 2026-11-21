"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { CheckCircle, Plus, Trash2, X } from "lucide-react";
import { Modal } from "@/components/admin/Modal";
import { useToast } from "@/hooks/useToast";
import { getErrorMessage } from "@/services/api";
import {
  CreateParentRequestPayload,
  ParentAccount,
  parentService,
} from "@/services/parentService";

const LocationPicker = dynamic(() => import("@/components/admin/LocationPicker"), {
  ssr: false,
});

// Same option values the parent app sends, so admin-entered requests look
// identical to parent-submitted ones everywhere downstream.
const TUITION_TYPES = ["Physical", "Online"];
const DURATIONS = [
  { value: "Long term", label: "Long term" },
  { value: "Short term", label: "Short term" },
];
const SHORT_TERM_DAYS = ["7", "10", "15", "20", "25", "30"];
const DAYS_PER_WEEK = ["6", "5", "4", "3", "2", "1"];
const GENDERS = ["Any", "Male", "Female"];
const STUDENT_COUNTS = ["1", "2", "3", "4", "5"];
const BOARDS = [
  { value: "neb", label: "Nepal Education Board" },
  { value: "cbse", label: "CBSE" },
  { value: "cambridge", label: "IB" },
  { value: "other", label: "Other" },
];
const LEVELS = [
  { value: "PG", label: "PlayGroup (PG)" },
  { value: "school", label: "1-10" },
  { value: "higher", label: "11-12" },
  { value: "other", label: "Other" },
];
const MEDIUMS = ["English", "Nepali"];

type Student = {
  board: string;
  customBoard: string;
  level: string;
  customLevel: string;
  grade: string;
  subjects: string;
  medium: string;
};

type Slot = { start: string; end: string };

type FormState = {
  parentId: string;
  name: string;
  phone: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  tuitionType: string;
  duration: string;
  numberOfDays: string;
  daysPerWeek: string;
  teacherGender: string;
  numberOfStudents: string;
  students: Student[];
  slots: Slot[];
  salary: string;
  requirements: string;
  publish: boolean;
};

const emptyStudent = (): Student => ({
  board: "",
  customBoard: "",
  level: "",
  customLevel: "",
  grade: "",
  subjects: "",
  medium: "",
});

const initialForm = (): FormState => ({
  parentId: "",
  name: "",
  phone: "",
  location: "",
  latitude: null,
  longitude: null,
  tuitionType: "",
  duration: "",
  numberOfDays: "",
  daysPerWeek: "",
  teacherGender: "",
  numberOfStudents: "1",
  students: [emptyStudent()],
  slots: [{ start: "", end: "" }],
  salary: "",
  requirements: "",
  publish: true,
});

/** "14:05" → "2:05 PM", the format the parent app stores. */
function to12Hour(value: string) {
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return value;
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`;
}

const toMinutes = (value: string) => {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
};

function validate(form: FormState) {
  const errors: Record<string, string> = {};
  const required = (key: keyof FormState, message: string) => {
    if (!String(form[key] ?? "").trim()) errors[key] = message;
  };

  required("name", "Enter a name");
  required("phone", "Enter a phone number");
  if (form.phone.trim() && !/^\+?[\d\s-]{7,15}$/.test(form.phone.trim())) {
    errors.phone = "Use digits only, e.g. 9800000000";
  }
  required("location", "Enter the location or pick it on the map");
  required("tuitionType", "Choose a tuition type");
  required("duration", "Choose a duration");
  if (form.duration === "Short term") required("numberOfDays", "Choose the number of days");
  required("daysPerWeek", "Choose days per week");
  required("teacherGender", "Choose a teacher gender");
  required("salary", "Enter the salary");
  if (form.salary.trim() && !/\d/.test(form.salary)) errors.salary = "Salary needs an amount";

  form.students.forEach((s, i) => {
    if (!s.board) errors[`students.${i}.board`] = "Choose a board";
    if (s.board === "other" && !s.customBoard.trim())
      errors[`students.${i}.customBoard`] = "Name the board";
    if (!s.level) errors[`students.${i}.level`] = "Choose a level";
    if (s.level === "other" && !s.customLevel.trim())
      errors[`students.${i}.customLevel`] = "Name the level";
    if (!s.grade.trim()) errors[`students.${i}.grade`] = "Enter the grade";
    if (!s.subjects.trim()) errors[`students.${i}.subjects`] = "Enter at least one subject";
    if (!s.medium) errors[`students.${i}.medium`] = "Choose a medium";
  });

  const filledSlots = form.slots.filter((s) => s.start || s.end);
  if (filledSlots.length === 0) errors["slots.0"] = "Add at least one time slot";
  form.slots.forEach((s, i) => {
    if ((s.start && !s.end) || (!s.start && s.end)) {
      errors[`slots.${i}`] = "Set both start and end";
    } else if (s.start && s.end && toMinutes(s.end) <= toMinutes(s.start)) {
      errors[`slots.${i}`] = "End must be after start";
    }
  });

  return errors;
}

function toPayload(form: FormState): CreateParentRequestPayload {
  const students = form.students;
  return {
    ...(form.parentId ? { parentId: form.parentId } : {}),
    name: form.name.trim(),
    phone: form.phone.trim(),
    location: form.location.trim(),
    latitude: form.latitude,
    longitude: form.longitude,
    tuitionType: form.tuitionType,
    duration: form.duration,
    ...(form.duration === "Short term" ? { numberOfDays: Number(form.numberOfDays) } : {}),
    daysPerWeek: form.daysPerWeek,
    teacherGender: form.teacherGender,
    numberOfStudents: form.numberOfStudents,
    // One entry per student, index-aligned — the same shape the parent app sends.
    board: students.map((s) => s.board),
    specificBoard: students
      .filter((s) => s.board === "other")
      .map((s) => s.customBoard.trim())
      .filter(Boolean),
    level: students.map((s) => (s.level === "other" ? s.customLevel.trim() : s.level)),
    grade: students.map((s) => s.grade.trim()),
    subjects: students.map((s) => s.subjects.trim()),
    medium: students.map((s) => s.medium),
    timeSlots: form.slots
      .filter((s) => s.start && s.end)
      .map((s) => ({ start: to12Hour(s.start), end: to12Hour(s.end) })),
    salary: form.salary.trim(),
    requirements: form.requirements.trim() || undefined,
  };
}

const inputClass = (invalid?: boolean) =>
  `w-full rounded-lg border px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 ${
    invalid ? "border-red-300 focus:ring-red-500" : "border-slate-300 focus:ring-blue-500"
  }`;

function Field({
  label,
  error,
  hint,
  children,
  className = "",
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-400">
        {label}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-red-600">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-slate-400">{hint}</span>
      ) : null}
    </label>
  );
}

function Select({
  value,
  onChange,
  options,
  placeholder = "Select",
  invalid,
}: {
  value: string;
  onChange: (value: string) => void;
  options: (string | { value: string; label: string })[];
  placeholder?: string;
  invalid?: boolean;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass(invalid)}>
      <option value="">{placeholder}</option>
      {options.map((o) => {
        const { value: v, label } = typeof o === "string" ? { value: o, label: o } : o;
        return (
          <option key={v} value={v}>
            {label}
          </option>
        );
      })}
    </select>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="border-b border-slate-200 pb-1 text-xs font-semibold uppercase tracking-wider text-blue-600">
      {children}
    </h3>
  );
}

export default function CreateParentRequestModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const toast = useToast();
  // Lives outside <Modal> so a draft survives closing and reopening.
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [parents, setParents] = useState<ParentAccount[] | null>(null);
  const [pickerKey, setPickerKey] = useState(0);

  useEffect(() => {
    if (!open || parents) return;
    parentService
      .getAccounts()
      .then((res) =>
        setParents(
          [...(res.data || [])].sort((a, b) => (a.name || "").localeCompare(b.name || "")),
        ),
      )
      .catch(() => setParents([]));
  }, [open, parents]);

  const update = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      if (!e[key as string]) return e;
      const next = { ...e };
      delete next[key as string];
      return next;
    });
  }, []);

  const updateStudent = useCallback((index: number, patch: Partial<Student>) => {
    setForm((f) => ({
      ...f,
      students: f.students.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }));
    setErrors((e) => {
      const next = { ...e };
      Object.keys(patch).forEach((k) => delete next[`students.${index}.${k}`]);
      return next;
    });
  }, []);

  const updateSlot = useCallback((index: number, patch: Partial<Slot>) => {
    setForm((f) => ({
      ...f,
      slots: f.slots.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }));
    setErrors((e) => {
      if (!e[`slots.${index}`]) return e;
      const next = { ...e };
      delete next[`slots.${index}`];
      return next;
    });
  }, []);

  const setStudentCount = useCallback((count: string) => {
    const n = Number(count) || 1;
    setForm((f) => ({
      ...f,
      numberOfStudents: count,
      students: Array.from({ length: n }, (_, i) => f.students[i] || emptyStudent()),
    }));
  }, []);

  const linkParent = useCallback(
    (parentId: string) => {
      const parent = parents?.find((p) => p._id === parentId);
      setForm((f) => ({
        ...f,
        parentId,
        // Prefill contact details from the account, without overwriting typed ones.
        name: f.name || parent?.name || "",
        phone: f.phone || parent?.phoneNumber || "",
      }));
    },
    [parents],
  );

  const linkedParent = useMemo(
    () => parents?.find((p) => p._id === form.parentId),
    [parents, form.parentId],
  );

  const reset = () => {
    setForm(initialForm());
    setErrors({});
    setPickerKey((k) => k + 1);
  };

  const handleSubmit = async () => {
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      toast.error("Fill in the highlighted fields");
      return;
    }

    setSubmitting(true);
    try {
      const { data: created } = await parentService.create(toPayload(form));
      if (form.publish) {
        try {
          await parentService.approve(created._id);
          toast.success("Request created and published to teachers");
        } catch {
          toast.error("Request created, but publishing failed. Approve it from the list.");
        }
      } else {
        toast.success("Request saved as pending");
      }
      reset();
      onCreated();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New Parent Request" wide>
      <div className="max-h-[70vh] space-y-6 overflow-y-auto pr-1 text-sm">
        <section className="space-y-4">
          <SectionTitle>Contact</SectionTitle>
          <Field
            label="Parent account (optional)"
            hint={
              linkedParent
                ? `Shows in ${linkedParent.name}'s app and they get its notifications.`
                : "Leave unlinked for phone or walk-in requests."
            }
          >
            <Select
              value={form.parentId}
              onChange={linkParent}
              placeholder={parents === null ? "Loading parents…" : "Not linked"}
              options={(parents || []).map((p) => ({
                value: p._id,
                label: `${p.name} · ${p.phoneNumber || p.email}`,
              }))}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Name" error={errors.name}>
              <input
                className={inputClass(!!errors.name)}
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Parent / guardian name"
              />
            </Field>
            <Field label="Phone" error={errors.phone}>
              <input
                className={inputClass(!!errors.phone)}
                value={form.phone}
                inputMode="tel"
                onChange={(e) => update("phone", e.target.value)}
                placeholder="98XXXXXXXX"
              />
            </Field>
          </div>
        </section>

        <section className="space-y-4">
          <SectionTitle>Location</SectionTitle>
          <LocationPicker
            key={pickerKey}
            latitude={form.latitude}
            longitude={form.longitude}
            onChange={({ label, latitude, longitude }) => {
              setForm((f) => ({ ...f, location: label, latitude, longitude }));
              setErrors((e) => {
                if (!e.location) return e;
                const next = { ...e };
                delete next.location;
                return next;
              });
            }}
          />
          <Field
            label="Address"
            error={errors.location}
            hint="Filled in when you pick a place or click the map. Edit it if needed — this is what teachers see."
          >
            <textarea
              rows={2}
              className={inputClass(!!errors.location)}
              value={form.location}
              onChange={(e) => update("location", e.target.value)}
              placeholder="Pick a place above, or type the address"
            />
          </Field>
        </section>

        <section className="space-y-4">
          <SectionTitle>Tuition</SectionTitle>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Tuition type" error={errors.tuitionType}>
              <Select
                value={form.tuitionType}
                onChange={(v) => update("tuitionType", v)}
                options={TUITION_TYPES}
                invalid={!!errors.tuitionType}
              />
            </Field>
            <Field label="Duration" error={errors.duration}>
              <Select
                value={form.duration}
                onChange={(v) => update("duration", v)}
                options={DURATIONS}
                invalid={!!errors.duration}
              />
            </Field>
            {form.duration === "Short term" && (
              <Field label="Number of days" error={errors.numberOfDays}>
                <Select
                  value={form.numberOfDays}
                  onChange={(v) => update("numberOfDays", v)}
                  options={SHORT_TERM_DAYS.map((d) => ({ value: d, label: `${d} days` }))}
                  invalid={!!errors.numberOfDays}
                />
              </Field>
            )}
            <Field label="Days per week" error={errors.daysPerWeek}>
              <Select
                value={form.daysPerWeek}
                onChange={(v) => update("daysPerWeek", v)}
                options={DAYS_PER_WEEK}
                invalid={!!errors.daysPerWeek}
              />
            </Field>
            <Field label="Teacher gender" error={errors.teacherGender}>
              <Select
                value={form.teacherGender}
                onChange={(v) => update("teacherGender", v)}
                options={GENDERS}
                invalid={!!errors.teacherGender}
              />
            </Field>
            <Field label="Number of students">
              <Select
                value={form.numberOfStudents}
                onChange={setStudentCount}
                options={STUDENT_COUNTS}
                placeholder="Select"
              />
            </Field>
          </div>
        </section>

        <section className="space-y-4">
          <SectionTitle>{form.students.length > 1 ? "Students" : "Student"}</SectionTitle>
          {form.students.map((student, i) => {
            const err = (k: string) => errors[`students.${i}.${k}`];
            return (
              <div
                key={i}
                className={form.students.length > 1 ? "rounded-lg border border-slate-200 p-4" : ""}
              >
                {form.students.length > 1 && (
                  <p className="mb-3 text-xs font-semibold text-slate-700">Student {i + 1}</p>
                )}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Field label="Board" error={err("board")}>
                    <Select
                      value={student.board}
                      onChange={(v) => updateStudent(i, { board: v })}
                      options={BOARDS}
                      invalid={!!err("board")}
                    />
                  </Field>
                  {student.board === "other" && (
                    <Field label="Which board" error={err("customBoard")}>
                      <input
                        className={inputClass(!!err("customBoard"))}
                        value={student.customBoard}
                        onChange={(e) => updateStudent(i, { customBoard: e.target.value })}
                      />
                    </Field>
                  )}
                  <Field label="Level" error={err("level")}>
                    <Select
                      value={student.level}
                      onChange={(v) => updateStudent(i, { level: v })}
                      options={LEVELS}
                      invalid={!!err("level")}
                    />
                  </Field>
                  {student.level === "other" && (
                    <Field label="Which level" error={err("customLevel")}>
                      <input
                        className={inputClass(!!err("customLevel"))}
                        value={student.customLevel}
                        onChange={(e) => updateStudent(i, { customLevel: e.target.value })}
                      />
                    </Field>
                  )}
                  <Field label="Grade" error={err("grade")}>
                    <input
                      className={inputClass(!!err("grade"))}
                      value={student.grade}
                      onChange={(e) => updateStudent(i, { grade: e.target.value })}
                      placeholder="e.g. 7"
                    />
                  </Field>
                  <Field label="Medium" error={err("medium")}>
                    <Select
                      value={student.medium}
                      onChange={(v) => updateStudent(i, { medium: v })}
                      options={MEDIUMS}
                      invalid={!!err("medium")}
                    />
                  </Field>
                  <Field
                    label="Subjects"
                    error={err("subjects")}
                    hint="Separate with commas"
                    className="sm:col-span-3"
                  >
                    <input
                      className={inputClass(!!err("subjects"))}
                      value={student.subjects}
                      onChange={(e) => updateStudent(i, { subjects: e.target.value })}
                      placeholder="e.g. Math, Science"
                    />
                  </Field>
                </div>
              </div>
            );
          })}
        </section>

        <section className="space-y-4">
          <SectionTitle>Schedule & budget</SectionTitle>
          <div className="space-y-3">
            <span className="block text-xs font-medium uppercase tracking-wider text-slate-400">
              Preferred time slots
            </span>
            {form.slots.map((slot, i) => (
              <div key={i}>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    aria-label={`Slot ${i + 1} start`}
                    className={`${inputClass(!!errors[`slots.${i}`])} max-w-40`}
                    value={slot.start}
                    onChange={(e) => updateSlot(i, { start: e.target.value })}
                  />
                  <span className="text-slate-400">to</span>
                  <input
                    type="time"
                    aria-label={`Slot ${i + 1} end`}
                    className={`${inputClass(!!errors[`slots.${i}`])} max-w-40`}
                    value={slot.end}
                    onChange={(e) => updateSlot(i, { end: e.target.value })}
                  />
                  {i > 0 && (
                    <button
                      type="button"
                      aria-label="Remove time slot"
                      onClick={() =>
                        setForm((f) => ({ ...f, slots: f.slots.filter((_, j) => j !== i) }))
                      }
                      className="cursor-pointer rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                {errors[`slots.${i}`] && (
                  <p className="mt-1 text-xs text-red-600">{errors[`slots.${i}`]}</p>
                )}
              </div>
            ))}
            {form.slots.length < 2 && (
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, slots: [...f.slots, { start: "", end: "" }] }))}
                className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                <Plus size={14} /> Add a second slot
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Salary (Rs. per month)" error={errors.salary}>
              <input
                className={inputClass(!!errors.salary)}
                value={form.salary}
                inputMode="numeric"
                onChange={(e) => update("salary", e.target.value)}
                placeholder="e.g. 8000"
              />
            </Field>
          </div>
          <Field label="Requirements (optional)">
            <textarea
              rows={3}
              className={inputClass()}
              value={form.requirements}
              onChange={(e) => update("requirements", e.target.value)}
              placeholder="Special learning needs, preferences or notes for the teacher"
            />
          </Field>
        </section>

        <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={form.publish}
              onChange={(e) => update("publish", e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-blue-600"
            />
            <span>
              <span className="block font-medium text-slate-900">Publish now</span>
              <span className="block text-xs text-slate-500">
                Makes it live and notifies all teachers. Untick to save it as pending and
                approve later.
              </span>
            </span>
          </label>
        </section>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={reset}
            disabled={submitting}
            className="cursor-pointer text-sm font-medium text-slate-500 hover:text-slate-700 disabled:opacity-40"
          >
            Clear form
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40 sm:flex-none"
            >
              <X size={16} /> Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-40 sm:flex-none"
            >
              <CheckCircle size={16} />
              {submitting ? "Saving…" : form.publish ? "Create & publish" : "Save as pending"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
