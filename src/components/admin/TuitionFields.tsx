"use client";

// Form pieces shared by the create and edit parent-request modals, so both
// write the same canonical values (src/lib/enums.ts) in the same shape the
// parent app sends: one entry per student in board/level/grade/subjects/medium.

import {
  BOARDS,
  DAYS_PER_WEEK,
  DURATIONS,
  LEVELS,
  MEDIUMS,
  SHORT_TERM_DAYS,
  STUDENT_COUNTS,
  TEACHER_GENDERS,
  TUITION_TYPES,
  labelFor,
  matchValue,
  type Board,
  type Duration,
  type Medium,
  type TeacherGender,
  type TuitionType,
} from "@/lib/enums";
import type { CreateParentRequestPayload, ParentProfile } from "@/services/parentService";

export const inputClass = (invalid?: boolean) =>
  `w-full rounded-lg border px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 ${
    invalid ? "border-red-300 focus:ring-red-500" : "border-slate-300 focus:ring-blue-500"
  }`;

export function Field({
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

export function Select<V extends string>({
  value,
  onChange,
  options,
  placeholder = "Select",
  invalid,
}: {
  value: V | "";
  onChange: (value: V | "") => void;
  options: readonly { value: V; label: string }[];
  placeholder?: string;
  invalid?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as V | "")}
      className={inputClass(invalid)}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ── Tuition-wide fields ─────────────────────────────────────────────────

export type TuitionFieldValues = {
  tuitionType: TuitionType | "";
  duration: Duration | "";
  /** Only for a Short Term tuition. */
  numberOfDays: string;
  daysPerWeek: string;
  teacherGender: TeacherGender | "";
  numberOfStudents: string;
};

export const emptyTuitionFields = (): TuitionFieldValues => ({
  tuitionType: "",
  duration: "",
  numberOfDays: "",
  daysPerWeek: "",
  teacherGender: "",
  numberOfStudents: "1",
});

const firstNumber = (value: string | number | null | undefined) =>
  String(value ?? "").match(/\d+/)?.[0];

/** Prefill from a stored request; values are matched case-insensitively. */
export function tuitionFieldsFromRequest(r: ParentProfile): TuitionFieldValues {
  const duration = matchValue("duration", r.duration) ?? "";
  return {
    tuitionType: matchValue("tuitionType", r.tuitionType) ?? "",
    duration,
    numberOfDays:
      duration === "Short Term"
        ? (matchValue("numberOfDays", firstNumber(r.numberOfDays)) ?? "")
        : "",
    daysPerWeek: matchValue("daysPerWeek", firstNumber(r.daysPerWeek)) ?? "",
    teacherGender: matchValue("teacherGender", r.teacherGender) ?? "",
    numberOfStudents: String(studentCount(r)),
  };
}

export function tuitionFieldsPayload(f: TuitionFieldValues) {
  return {
    tuitionType: f.tuitionType as TuitionType,
    duration: f.duration as Duration,
    // Cleared for Long Term so a stale day count doesn't linger.
    numberOfDays: f.duration === "Short Term" ? Number(f.numberOfDays) : null,
    daysPerWeek: f.daysPerWeek,
    teacherGender: f.teacherGender as TeacherGender,
    numberOfStudents: f.numberOfStudents,
  } satisfies Partial<CreateParentRequestPayload>;
}

export function TuitionFieldsSection({
  value,
  errors,
  onChange,
}: {
  value: TuitionFieldValues;
  errors: Record<string, string>;
  /** Changing numberOfStudents should also resize the student list. */
  onChange: (patch: Partial<TuitionFieldValues>) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Field label="Tuition type" error={errors.tuitionType}>
        <Select
          value={value.tuitionType}
          onChange={(tuitionType) => onChange({ tuitionType })}
          options={TUITION_TYPES}
          invalid={!!errors.tuitionType}
        />
      </Field>
      <Field label="Duration" error={errors.duration}>
        <Select
          value={value.duration}
          onChange={(duration) =>
            onChange(duration === "Short Term" ? { duration } : { duration, numberOfDays: "" })
          }
          options={DURATIONS}
          invalid={!!errors.duration}
        />
      </Field>
      {value.duration === "Short Term" && (
        <Field label="Number of days" error={errors.numberOfDays}>
          <Select
            value={value.numberOfDays}
            onChange={(numberOfDays) => onChange({ numberOfDays })}
            options={SHORT_TERM_DAYS}
            invalid={!!errors.numberOfDays}
          />
        </Field>
      )}
      <Field label="Days per week" error={errors.daysPerWeek}>
        <Select
          value={value.daysPerWeek}
          onChange={(daysPerWeek) => onChange({ daysPerWeek })}
          options={DAYS_PER_WEEK}
          invalid={!!errors.daysPerWeek}
        />
      </Field>
      <Field label="Teacher gender" error={errors.teacherGender}>
        <Select
          value={value.teacherGender}
          onChange={(teacherGender) => onChange({ teacherGender })}
          options={TEACHER_GENDERS}
          invalid={!!errors.teacherGender}
        />
      </Field>
      <Field label="Number of students">
        <Select
          value={value.numberOfStudents}
          onChange={(numberOfStudents) => onChange({ numberOfStudents: numberOfStudents || "1" })}
          options={STUDENT_COUNTS}
        />
      </Field>
    </div>
  );
}

// ── Per-student fields ──────────────────────────────────────────────────

const OTHER = "other";
const LEVEL_OPTIONS = [...LEVELS, { value: OTHER, label: "Other" }] as const;
type LevelChoice = (typeof LEVEL_OPTIONS)[number]["value"];

export type Student = {
  board: Board | "";
  /** The board's name when board is "other" (sent as specificBoard). */
  customBoard: string;
  level: LevelChoice | "";
  /** The level text when level is "other" (sent as the level itself). */
  customLevel: string;
  grade: string;
  /** One comma-separated string for this student, e.g. "Mathematics, Science". */
  subjects: string;
  medium: Medium | "";
};

export const emptyStudent = (): Student => ({
  board: "",
  customBoard: "",
  level: "",
  customLevel: "",
  grade: "",
  subjects: "",
  medium: "",
});

/** Grow or shrink the student list to `count`, keeping what's filled in. */
export const resizeStudents = (students: Student[], count: number) =>
  Array.from({ length: Math.max(1, count) }, (_, i) => students[i] || emptyStudent());

const MAX_STUDENTS = STUDENT_COUNTS.length;

function studentCount(r: ParentProfile) {
  const stated = Number(firstNumber(r.numberOfStudents)) || 0;
  const longest = Math.max(r.board?.length ?? 0, r.level?.length ?? 0, r.grade?.length ?? 0);
  return Math.min(Math.max(stated || longest, 1), MAX_STUDENTS);
}

/**
 * Student i's subjects. The old edit form split subjects into one entry per
 * subject; any entries beyond the student count fold into the last student
 * instead of being dropped.
 */
function subjectsFor(r: ParentProfile, i: number, count: number) {
  const subjects = r.subjects ?? [];
  return (i === count - 1 ? subjects.slice(i) : subjects.slice(i, i + 1))
    .map((s) => s.trim())
    .filter(Boolean)
    .join(", ");
}

/** Per-student rows from a stored request, matched case-insensitively. */
export function studentsFromRequest(r: ParentProfile): Student[] {
  const count = studentCount(r);
  const boards = r.board ?? [];
  const specific = r.specificBoard ?? [];
  // Older requests listed only the "other" boards' names, not one per student.
  const specificAligned = specific.length === boards.length;
  let otherSeen = 0;

  return Array.from({ length: count }, (_, i) => {
    const rawBoard = boards[i] ?? "";
    const board = matchValue("board", rawBoard) ?? (rawBoard.trim() ? OTHER : "");
    let customBoard = "";
    if (board === OTHER) {
      customBoard =
        (specificAligned ? specific[i] : specific[otherSeen]) ??
        (matchValue("board", rawBoard) ? "" : rawBoard);
      otherSeen += 1;
    }

    const rawLevel = r.level?.[i] ?? "";
    const levelId = matchValue("level", rawLevel);

    return {
      board,
      customBoard: customBoard.trim(),
      level: levelId ?? (rawLevel.trim() ? OTHER : ""),
      customLevel: levelId ? "" : rawLevel.trim(),
      grade: r.grade?.[i] ?? "",
      subjects: subjectsFor(r, i, count),
      medium: matchValue("medium", r.medium?.[i]) ?? "",
    };
  });
}

export function studentsPayload(students: Student[]) {
  return {
    board: students.map((s) => s.board),
    // Index-aligned with board; blank for students whose board isn't "other".
    specificBoard: students.map((s) => (s.board === OTHER ? s.customBoard.trim() : "")),
    level: students.map((s) => (s.level === OTHER ? s.customLevel.trim() : s.level)),
    grade: students.map((s) => s.grade.trim()),
    subjects: students.map((s) => s.subjects.trim()),
    medium: students.map((s) => s.medium),
  } satisfies Partial<CreateParentRequestPayload>;
}

/** Required-field errors for the tuition and student fields, keyed like the form. */
export function validateTuition(f: TuitionFieldValues, students: Student[]) {
  const errors: Record<string, string> = {};
  if (!f.tuitionType) errors.tuitionType = "Choose a tuition type";
  if (!f.duration) errors.duration = "Choose a duration";
  if (f.duration === "Short Term" && !f.numberOfDays)
    errors.numberOfDays = "Choose the number of days";
  if (!f.daysPerWeek) errors.daysPerWeek = "Choose days per week";
  if (!f.teacherGender) errors.teacherGender = "Choose a teacher gender";

  students.forEach((s, i) => {
    if (!s.board) errors[`students.${i}.board`] = "Choose a board";
    if (s.board === OTHER && !s.customBoard.trim())
      errors[`students.${i}.customBoard`] = "Name the board";
    if (!s.level) errors[`students.${i}.level`] = "Choose a level";
    if (s.level === OTHER && !s.customLevel.trim())
      errors[`students.${i}.customLevel`] = "Name the level";
    if (!s.grade.trim()) errors[`students.${i}.grade`] = "Enter the grade";
    if (!s.subjects.trim()) errors[`students.${i}.subjects`] = "Enter at least one subject";
    if (!s.medium) errors[`students.${i}.medium`] = "Choose a medium";
  });
  return errors;
}

export function StudentsSection({
  students,
  errors,
  onChange,
}: {
  students: Student[];
  errors: Record<string, string>;
  onChange: (index: number, patch: Partial<Student>) => void;
}) {
  const several = students.length > 1;
  return (
    <>
      {students.map((student, i) => {
        const err = (k: keyof Student) => errors[`students.${i}.${k}`];
        return (
          <div key={i} className={several ? "rounded-lg border border-slate-200 p-4" : ""}>
            {several && <p className="mb-3 text-xs font-semibold text-slate-700">Student {i + 1}</p>}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Board" error={err("board")}>
                <Select
                  value={student.board}
                  onChange={(board) => onChange(i, { board })}
                  options={BOARDS}
                  invalid={!!err("board")}
                />
              </Field>
              {student.board === OTHER && (
                <Field label="Which board" error={err("customBoard")}>
                  <input
                    className={inputClass(!!err("customBoard"))}
                    value={student.customBoard}
                    onChange={(e) => onChange(i, { customBoard: e.target.value })}
                  />
                </Field>
              )}
              <Field label="Level" error={err("level")}>
                <Select
                  value={student.level}
                  onChange={(level) => onChange(i, { level })}
                  options={LEVEL_OPTIONS}
                  invalid={!!err("level")}
                />
              </Field>
              {student.level === OTHER && (
                <Field label="Which level" error={err("customLevel")}>
                  <input
                    className={inputClass(!!err("customLevel"))}
                    value={student.customLevel}
                    onChange={(e) => onChange(i, { customLevel: e.target.value })}
                  />
                </Field>
              )}
              <Field label="Grade" error={err("grade")}>
                <input
                  className={inputClass(!!err("grade"))}
                  value={student.grade}
                  onChange={(e) => onChange(i, { grade: e.target.value })}
                  placeholder="e.g. 7"
                />
              </Field>
              <Field label="Medium" error={err("medium")}>
                <Select
                  value={student.medium}
                  onChange={(medium) => onChange(i, { medium })}
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
                  onChange={(e) => onChange(i, { subjects: e.target.value })}
                  placeholder="e.g. Math, Science"
                />
              </Field>
            </div>
          </div>
        );
      })}
    </>
  );
}

/** One readable line per student for detail views. */
export function describeStudents(r: ParentProfile) {
  const count = studentCount(r);
  return Array.from({ length: count }, (_, i) => {
    const board = r.board?.[i];
    const boardLabel =
      board === OTHER ? r.specificBoard?.[i] || labelFor("board", board) : labelFor("board", board);
    return {
      board: boardLabel,
      level: labelFor("level", r.level?.[i]),
      grade: r.grade?.[i] ?? "",
      medium: labelFor("medium", r.medium?.[i]),
      subjects: subjectsFor(r, i, count),
    };
  });
}
