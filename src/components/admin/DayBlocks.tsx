import { memo } from "react";
import { dayKey, formatDayHeading, shiftDay } from "@/lib/nepalTime";

export interface DayGroup<T> {
  /** YYYY-MM-DD, Nepal time; "" for items without a date. */
  key: string;
  items: T[];
}

/**
 * Groups items into one bucket per Nepal calendar day, newest day first
 * (or oldest first with `ascending`). Item order inside a day is kept, so
 * sort before grouping.
 */
export function groupByDay<T>(
  items: T[],
  getDate: (item: T) => string | Date | null | undefined,
  ascending = false,
): DayGroup<T>[] {
  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const key = dayKey(getDate(item));
    const bucket = buckets.get(key);
    if (bucket) bucket.push(item);
    else buckets.set(key, [item]);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => {
      if (!a) return 1; // undated last
      if (!b) return -1;
      return ascending ? a.localeCompare(b) : b.localeCompare(a);
    })
    .map(([key, groupItems]) => ({ key, items: groupItems }));
}

export interface DayStat {
  label: string;
  value: string;
  tone?: "emerald" | "amber" | "red" | "slate" | "blue" | "violet";
}

const toneClass: Record<NonNullable<DayStat["tone"]>, string> = {
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  slate: "bg-slate-50 text-slate-600 ring-slate-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
};

/**
 * One day's block: the date centred on a rule, then the day's figures
 * (collected revenue first), then the day's rows.
 */
export const DayBlock = memo(function DayBlock({
  day,
  today,
  count,
  countLabel,
  stats,
  children,
}: {
  day: string;
  today: string;
  count: number;
  /** e.g. ["post payment", "post payments"] */
  countLabel: [string, string];
  stats: DayStat[];
  children: React.ReactNode;
}) {
  const relative = !day
    ? "No date"
    : day === today
      ? "Today"
      : day === shiftDay(today, 1)
        ? "Yesterday"
        : null;
  return (
    <section aria-label={day ? formatDayHeading(day) : "No date"} className="rounded-2xl border border-slate-200 bg-white/60 p-3 sm:p-4">
      <header className="mb-3 flex flex-col items-center gap-2 text-center">
        <div className="flex w-full items-center gap-3">
          <span className="h-px flex-1 bg-linear-to-r from-transparent to-slate-300" />
          <h2 className="text-sm font-semibold tracking-wide text-slate-800 sm:text-base">
            {day ? formatDayHeading(day) : "Undated"}
          </h2>
          <span className="h-px flex-1 bg-linear-to-l from-transparent to-slate-300" />
        </div>
        <p className="text-xs text-slate-500">
          {relative && <span className="font-medium text-blue-600">{relative} · </span>}
          {count} {count === 1 ? countLabel[0] : countLabel[1]}
        </p>
        {stats.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5">
            {stats.map((stat) => (
              <span
                key={stat.label}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ring-1 ring-inset ${toneClass[stat.tone || "slate"]}`}
              >
                <span className="opacity-75">{stat.label}</span>
                <span className="font-semibold tabular-nums">{stat.value}</span>
              </span>
            ))}
          </div>
        )}
      </header>
      {children}
    </section>
  );
});
