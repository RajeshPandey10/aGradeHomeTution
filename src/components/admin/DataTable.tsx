import Link from "next/link";
import { memo } from "react";
import { ChevronRight } from "lucide-react";

interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
}

export function DataTable<T extends { _id: string }>({
  columns,
  data,
  onRowClick,
}: {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
}) {
  if (data.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
      <table className="w-full min-w-[700px]">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/50">
            {columns.map((col) => (
              <th
                key={col.key}
                className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >
                {col.header}
              </th>
            ))}
            {onRowClick && <th className="w-10" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((item) => (
            <tr
              key={item._id}
              className={`group transition-colors ${onRowClick ? "cursor-pointer hover:bg-slate-50" : "hover:bg-slate-50/50"}`}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-5 py-3.5 text-sm">
                  {col.render(item)}
                </td>
              ))}
              {onRowClick && (
                <td className="pr-4 text-slate-300 group-hover:text-slate-500 transition-colors">
                  <ChevronRight size={16} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const StatCard = memo(function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
  description,
  hint,
  href,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  bg: string;
  /** Plain-words explanation of what the number counts. */
  description?: string;
  /** Something that needs attention, shown highlighted under the description. */
  hint?: string;
  /** Makes the whole card a link to the page behind the number. */
  href?: string;
}) {
  const body = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
        {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
        {hint && <p className="mt-1 text-xs font-medium text-amber-700">{hint}</p>}
      </div>
      <div className={`w-11 h-11 shrink-0 rounded-xl ${bg} flex items-center justify-center`}>
        <Icon size={22} className={color} />
      </div>
    </div>
  );
  const cardClass = "block h-full bg-white rounded-xl border border-slate-200 p-5 transition-shadow";
  return href ? (
    <Link href={href} className={`${cardClass} hover:border-slate-300 hover:shadow-sm`}>
      {body}
    </Link>
  ) : (
    <div className={`${cardClass} hover:shadow-sm`}>{body}</div>
  );
});

export const PageHeader = memo(function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-2">
      <div>
        <h1 className="text-lg sm:text-xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">{action}</div>}
    </div>
  );
});
