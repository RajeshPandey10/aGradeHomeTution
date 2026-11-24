"use client";

import { memo } from "react";
import { FileText, ImageIcon } from "lucide-react";
import { dayIndex, formatDayCount, formatShortDate } from "@/lib/nepalTime";
import type { PostPayment } from "@/services/postPaymentService";
import type { PostPaymentStatus } from "@/lib/enums";

/** Days the teacher still owes for: unsettled records only. */
export const isUnsettled = (status: PostPaymentStatus) => status === "pending" || status === "blacklisted";

/**
 * Countdown to the due day, recomputed against `today` (YYYY-MM-DD) so it
 * rolls over at midnight: positive = days left, 0 = due today, negative =
 * days exceeded. Null when nothing is owed.
 */
export function liveDaysLeft(pp: Pick<PostPayment, "status" | "dueDate">, today: string): number | null {
  if (!isUnsettled(pp.status)) return null;
  return dayIndex(pp.dueDate) - dayIndex(`${today}T00:00:00+05:45`);
}

/**
 * The return-days cell: "4 days" in green while there's time, "2 days" in
 * red once the due day has passed (with "exceeded"), amber on the due day.
 */
export const ReturnDaysBadge = memo(function ReturnDaysBadge({
  pp,
  today,
  compact = false,
}: {
  pp: Pick<PostPayment, "status" | "dueDate" | "returnDays">;
  today: string;
  compact?: boolean;
}) {
  const left = liveDaysLeft(pp, today);
  const sub = `of ${pp.returnDays}d · due ${formatShortDate(pp.dueDate).replace(/ \d{4}$/, "")}`;

  if (left === null) {
    const settled =
      pp.status === "converted" ? "Paid" : pp.status === "rejected" ? "Rejected" : "Not started";
    return (
      <div>
        <span className="text-xs font-medium text-slate-500">{settled}</span>
        {!compact && <p className="text-[11px] text-slate-400">{formatDayCount(pp.returnDays)} given</p>}
      </div>
    );
  }

  const exceeded = left < 0;
  const dueToday = left === 0;
  const cls = exceeded
    ? "bg-red-100 text-red-700 ring-red-200"
    : dueToday
      ? "bg-amber-100 text-amber-800 ring-amber-200"
      : "bg-emerald-100 text-emerald-700 ring-emerald-200";
  const label = dueToday ? "Due today" : formatDayCount(left);
  return (
    <div>
      <span
        className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset tabular-nums ${cls}`}
        title={exceeded ? `Payment is ${formatDayCount(left)} late` : dueToday ? "Payment is due today" : `${formatDayCount(left)} left to pay`}
      >
        {label}
        {!dueToday && <span className="font-normal opacity-80">{exceeded ? "exceeded" : "left"}</span>}
      </span>
      {!compact && <p className="mt-0.5 whitespace-nowrap text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
});

export const SourceBadge = memo(function SourceBadge({ source }: { source: string }) {
  const cls =
    source === "Aarambha"
      ? "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200"
      : "bg-sky-50 text-sky-700 ring-sky-200";
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}>
      {source}
    </span>
  );
});

export const isPdf = (agreement?: { mimeType?: string | null; url?: string } | null) =>
  !!agreement && (agreement.mimeType === "application/pdf" || /\.pdf($|\?)/i.test(agreement.url || ""));

export const AgreementIcon = ({ agreement, size = 14 }: { agreement?: PostPayment["agreement"]; size?: number }) =>
  isPdf(agreement) ? <FileText size={size} /> : <ImageIcon size={size} />;

/** Small square icon button with a tooltip, for dense table rows. */
export const IconAction = memo(function IconAction({
  icon: Icon,
  label,
  onClick,
  tone,
  disabled,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  onClick: () => void;
  tone: "blue" | "amber" | "emerald" | "red" | "dark" | "slate" | "violet";
  disabled?: boolean;
}) {
  const tones: Record<string, string> = {
    blue: "text-blue-600 border-blue-200 hover:bg-blue-50",
    amber: "text-amber-600 border-amber-200 hover:bg-amber-50",
    emerald: "text-emerald-600 border-emerald-200 hover:bg-emerald-50",
    red: "text-red-600 border-red-200 hover:bg-red-50",
    dark: "text-zinc-800 border-zinc-300 hover:bg-zinc-100",
    slate: "text-slate-600 border-slate-200 hover:bg-slate-50",
    violet: "text-violet-600 border-violet-200 hover:bg-violet-50",
  };
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${tones[tone]}`}
    >
      <Icon size={15} />
    </button>
  );
});

/** Label + value in detail views; hidden when there's no value. */
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  if (children === null || children === undefined || children === "") return null;
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{label}</p>
      <div className="mt-0.5 break-words text-sm text-slate-900">{children}</div>
    </div>
  );
}
