"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/admin/Modal";
import { SearchInput } from "@/components/admin/SearchInput";
import { TeacherAvatar } from "@/components/admin/UI";
import { getImageUrl } from "@/lib/image";
import { formatRs } from "@/lib/money";
import { formatShortDate } from "@/lib/nepalTime";
import { matchesSearch } from "@/lib/search";
import type { PostPayment } from "@/services/postPaymentService";
import { ReturnDaysBadge, SourceBadge } from "./bits";

export type GroupStatus = "converted" | "rejected" | "blacklisted" | "pending";

const COPY: Record<GroupStatus, { title: string; amountLabel: string; amount: (pp: PostPayment) => number; tone: string }> = {
  converted: { title: "Converted teachers", amountLabel: "Collected", amount: (pp) => pp.collected, tone: "text-emerald-700" },
  rejected: { title: "Rejected post payments", amountLabel: "Deducted", amount: (pp) => pp.deducted, tone: "text-slate-600" },
  blacklisted: { title: "Blacklisted teachers", amountLabel: "Bad debt", amount: (pp) => pp.badDebt, tone: "text-red-700" },
  pending: { title: "Teachers with pending payments", amountLabel: "Pending", amount: (pp) => pp.pending, tone: "text-amber-700" },
};

/**
 * Every teacher with a post payment in one status (all time), with their
 * records and amounts. Clicking a teacher opens their full details.
 */
export function StatusGroupModal({
  status,
  records,
  today,
  onClose,
  onViewTeacher,
  onOpenRecord,
}: {
  status: GroupStatus | null;
  records: PostPayment[];
  today: string;
  onClose: () => void;
  onViewTeacher: (userId: string) => void;
  onOpenRecord: (pp: PostPayment) => void;
}) {
  const [search, setSearch] = useState("");

  const groups = useMemo(() => {
    if (!status) return [];
    const byTeacher = new Map<string, PostPayment[]>();
    for (const pp of records) {
      if (pp.status !== status) continue;
      const list = byTeacher.get(pp.teacher._id);
      if (list) list.push(pp);
      else byTeacher.set(pp.teacher._id, [pp]);
    }
    const copy = COPY[status];
    return [...byTeacher.values()]
      .map((list) => ({ teacherId: list[0].teacher._id, first: list[0], list, total: list.reduce((s, pp) => s + copy.amount(pp), 0) }))
      .sort((a, b) => b.total - a.total);
  }, [status, records]);

  if (!status) return null;
  const copy = COPY[status];
  const shown = groups.filter((g) =>
    matchesSearch(search, [
      g.first.teacherProfile?.name,
      g.first.teacher.name,
      g.first.teacher.phoneNumber,
      g.first.teacherProfile?.phone,
      g.first.teacher.email,
      g.list.map((pp) => [pp.tuitionRequest?.name, pp.tuitionSnapshot?.name, pp.rejectionReason, pp.source]),
    ]),
  );

  return (
    <Modal open onClose={onClose} title={`${copy.title} (${groups.length})`} wide>
      {groups.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">Nobody here yet.</p>
      ) : (
        <div className="space-y-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search teacher, phone, tuition, reason…" shown={shown.length} total={groups.length} />
          {shown.map(({ teacherId, first, list, total }) => {
            const name = first.teacherProfile?.name || first.teacher.name || first.teacherSnapshot?.name || "Teacher";
            const phone = first.teacher.phoneNumber || first.teacherProfile?.phone;
            return (
              <div key={teacherId} className="rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => onViewTeacher(teacherId)}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-t-xl p-3 text-left hover:bg-slate-50"
                >
                  <TeacherAvatar name={name} src={getImageUrl(first.teacherProfile?.profilePicture)} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">{name}</p>
                    <p className="truncate text-xs text-slate-500">{[phone, first.teacher.email].filter(Boolean).join(" · ")}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold tabular-nums ${copy.tone}`}>{formatRs(total)}</p>
                    <p className="text-[11px] text-slate-400">
                      {copy.amountLabel} · {list.length} {list.length === 1 ? "record" : "records"}
                    </p>
                  </div>
                </button>
                <ul className="divide-y divide-slate-100 border-t border-slate-100 text-sm">
                  {list.map((pp) => (
                    <li key={pp._id}>
                      <button
                        type="button"
                        onClick={() => onOpenRecord(pp)}
                        className="flex w-full cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-left hover:bg-blue-50/40"
                      >
                        <span className="min-w-0 flex-1 truncate text-slate-700">
                          {pp.tuitionRequest?.name || pp.tuitionSnapshot?.name || "Tuition"}
                          <span className="text-slate-400"> · {formatShortDate(pp.recordedAt)} · {pp.commissionPercent}%</span>
                        </span>
                        <SourceBadge source={pp.source} />
                        <ReturnDaysBadge pp={pp} today={today} compact />
                        {pp.rejectionReason && status === "rejected" && (
                          <span className="w-full text-xs text-red-600">Reason: {pp.rejectionReason}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
