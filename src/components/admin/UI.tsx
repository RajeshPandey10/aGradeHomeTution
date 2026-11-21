import { memo } from "react";

const colors: Record<string, string> = {
  verified: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  in_review: "bg-amber-100 text-amber-700",
  unverified: "bg-slate-100 text-slate-600",
  pending: "bg-amber-100 text-amber-700",
  vacant: "bg-blue-100 text-blue-700",
  ongoing: "bg-purple-100 text-purple-700",
  under_review: "bg-orange-100 text-orange-700",
  not_submitted: "bg-slate-100 text-slate-600",
  fulfilled: "bg-emerald-100 text-emerald-700",
  // lock history actions
  paid: "bg-orange-100 text-orange-700",
  approved: "bg-emerald-100 text-emerald-700",
  declined: "bg-red-100 text-red-700",
  refunded: "bg-orange-100 text-orange-700",
  new: "bg-blue-100 text-blue-700",
  read: "bg-slate-100 text-slate-600",
  replied: "bg-emerald-100 text-emerald-700",
};

export const StatusBadge = memo(function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] || "bg-slate-100 text-slate-700"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
});

export const ActionButton = memo(function ActionButton({
  icon: Icon,
  label,
  onClick,
  color = "blue",
  disabled,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  onClick: () => void;
  color?: "blue" | "red" | "emerald" | "amber" | "slate" | "purple";
  disabled?: boolean;
}) {
  const colorClasses: Record<string, string> = {
    blue: "text-blue-600 hover:bg-blue-50 border-blue-200",
    red: "text-red-600 hover:bg-red-50 border-red-200",
    emerald: "text-emerald-600 hover:bg-emerald-50 border-emerald-200",
    amber: "text-amber-600 hover:bg-amber-50 border-amber-200",
    slate: "text-slate-600 hover:bg-slate-50 border-slate-200",
    purple: "text-purple-600 hover:bg-purple-50 border-purple-200",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${colorClasses[color]}`}
    >
      <Icon size={14} />
      {label}
    </button>
  );
});

export const ActionButtonSolid = memo(function ActionButtonSolid({
  icon: Icon,
  label,
  onClick,
  color = "blue",
  disabled,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  onClick: () => void;
  color?: "blue" | "red" | "emerald" | "amber" | "orange";
  disabled?: boolean;
}) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-600 hover:bg-blue-700 text-white",
    red: "bg-red-600 hover:bg-red-700 text-white",
    emerald: "bg-emerald-600 hover:bg-emerald-700 text-white",
    amber: "bg-amber-600 hover:bg-amber-700 text-white",
    orange: "bg-orange-600 hover:bg-orange-700 text-white",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${colorClasses[color]}`}
    >
      <Icon size={16} />
      {label}
    </button>
  );
});

export const EmptyState = memo(function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-16">
      <p className="text-slate-400 text-sm">{message}</p>
    </div>
  );
});

export const Loading = memo(function Loading() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
});

/** A teacher's photo, or their initials when they haven't uploaded one. */
export const TeacherAvatar = memo(function TeacherAvatar({
  name,
  src,
  size = 36,
}: {
  name?: string | null;
  /** Already resolved with getImageUrl. */
  src?: string | null;
  size?: number;
}) {
  const initials =
    (name || "?")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "?";
  const style = { width: size, height: size };
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name ? `${name}'s photo` : "Teacher photo"}
      style={style}
      className="rounded-full object-cover shrink-0 bg-slate-100 border border-slate-200"
    />
  ) : (
    <span
      style={{ ...style, fontSize: Math.round(size * 0.36) }}
      className="rounded-full shrink-0 inline-flex items-center justify-center bg-blue-100 text-blue-700 font-semibold"
      aria-hidden
    >
      {initials}
    </span>
  );
});
