"use client";

import { useEffect, useState } from "react";
import { BookOpen, Clock, DollarSign, MapPin, Percent, User } from "lucide-react";
import { Modal } from "@/components/admin/Modal";
import { describeStudents } from "@/components/admin/TuitionFields";
import { EmptyState, Loading, StatusBadge } from "@/components/admin/UI";
import { getErrorMessage } from "@/lib/errors";
import { labelFor } from "@/lib/enums";
import { parentService, type ParentProfile } from "@/services/parentService";

function Row({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value?: string | number | null;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <span className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</span>
      <p className="mt-0.5 flex items-center gap-1.5 text-slate-900">
        {Icon && <Icon size={14} className="text-slate-400" />}
        {value}
      </p>
    </div>
  );
}

const Section = ({ title }: { title: string }) => (
  <h3 className="border-b border-slate-200 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-blue-600">{title}</h3>
);

/** The tuition request behind a post payment, as the Parent Requests page shows it. */
export function RequestQuickView({ requestId, onClose }: { requestId: string | null; onClose: () => void }) {
  const [request, setRequest] = useState<ParentProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!requestId) return;
    let cancelled = false;
    setRequest(null);
    setError(null);
    parentService
      .getRequestDetail(requestId)
      .then((res) => !cancelled && setRequest(res.data))
      .catch((err) => !cancelled && setError(getErrorMessage(err, "This request no longer exists")));
    return () => {
      cancelled = true;
    };
  }, [requestId]);

  return (
    <Modal open={!!requestId} onClose={onClose} title="Request Details" wide>
      {error ? (
        <EmptyState message={error} />
      ) : !request ? (
        <Loading />
      ) : (
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={request.status} kind="requestStatus" />
            {request.fulfillmentType === "postpaid" && <StatusBadge status="postpaid" label="Post-paid" />}
            {request.platformFeePercent != null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                <Percent size={12} /> {request.platformFeePercent}% fee
              </span>
            )}
            {request.createdAt && <span className="text-xs text-slate-400">Created {new Date(request.createdAt).toLocaleDateString()}</span>}
          </div>

          <Section title="Tuition Details" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Row label="Name" value={request.name} icon={User} />
            <Row label="Phone" value={request.phone} />
            <Row label="Location" value={request.location} icon={MapPin} />
            <Row label="Salary" value={request.salary ? `Rs. ${request.salary}` : undefined} icon={DollarSign} />
            <Row label="Duration" value={labelFor("duration", request.duration)} icon={Clock} />
            <Row label="Tuition Type" value={labelFor("tuitionType", request.tuitionType)} />
            <Row label="Days Per Week" value={request.daysPerWeek} />
            <Row label="Teacher Gender" value={labelFor("teacherGender", request.teacherGender)} />
            <Row label="Number of Students" value={request.numberOfStudents} />
          </div>
          {describeStudents(request).map((student, i, all) => (
            <div key={i} className="rounded-lg bg-slate-50 p-3">
              {all.length > 1 && <p className="mb-2 text-xs font-semibold text-slate-700">Student {i + 1}</p>}
              <Row label="Subjects" value={student.subjects} icon={BookOpen} />
              <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Row label="Board" value={student.board} />
                <Row label="Level" value={student.level} />
                <Row label="Grade" value={student.grade} />
                <Row label="Medium" value={student.medium} />
              </div>
            </div>
          ))}
          <Row label="Time Slots" value={request.timeSlots?.map((s) => `${s.start}-${s.end}`).join(", ")} />
          <Row label="Requirements" value={request.requirements} />

          {request.parent && (
            <>
              <Section title="Parent Info" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Row label="Name" value={request.parent.name} icon={User} />
                <Row label="Email" value={request.parent.email} />
                <Row label="Phone" value={request.parent.phoneNumber || "Not provided"} />
              </div>
            </>
          )}

          {request.assignedTeacher && (
            <>
              <Section title="Assigned Teacher" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Row label="Name" value={request.assignedTeacher.name} icon={User} />
                <Row label="Email" value={request.assignedTeacher.email} />
                <Row label="Phone" value={request.assignedTeacher.phoneNumber || request.teacherProfile?.phone || "Not provided"} />
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
