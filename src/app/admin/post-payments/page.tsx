"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  BadgeCheck,
  Ban,
  CalendarRange,
  Eye,
  HandCoins,
  KeyRound,
  Layers,
  Pencil,
  Search,
  Sparkles,
  Trash2,
  Undo2,
  X,
  XCircle,
} from "lucide-react";
import { DataTable, PageHeader } from "@/components/admin/DataTable";
import { DayBlock, groupByDay } from "@/components/admin/DayBlocks";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { EmptyState, Loading, StatusBadge, TeacherAvatar } from "@/components/admin/UI";
import { AgreementViewer } from "@/components/admin/post-payments/AgreementViewer";
import { DeleteDialog, RejectDialog } from "@/components/admin/post-payments/DecisionDialogs";
import { PostPayFormModal } from "@/components/admin/post-payments/PostPayFormModal";
import {
  PostPaymentDetailModal,
  actionsFor,
  type PostPaymentAction,
} from "@/components/admin/post-payments/PostPaymentDetailModal";
import { RequestQuickView } from "@/components/admin/post-payments/RequestQuickView";
import { StatusGroupModal, type GroupStatus } from "@/components/admin/post-payments/StatusGroupModal";
import { TeacherHistoryModal } from "@/components/admin/post-payments/TeacherHistoryModal";
import { UnsettledWarning } from "@/components/admin/post-payments/UnsettledWarning";
import {
  AgreementIcon,
  IconAction,
  ReturnDaysBadge,
  SourceBadge,
  liveDaysLeft,
} from "@/components/admin/post-payments/bits";
import { useToast } from "@/hooks/useToast";
import { getErrorMessage } from "@/lib/errors";
import { getImageUrl } from "@/lib/image";
import { formatRs, formatRsCompact } from "@/lib/money";
import { formatShortDate, formatTime, shiftDay, useToday } from "@/lib/nepalTime";
import {
  QUERY_SUGGESTIONS,
  matchesPostPaymentFilters,
  matchesPostPaymentText,
  parsePostPaymentQuery,
} from "@/lib/postPaymentQuery";
import { useRealtimeRefresh } from "@/lib/socket";
import {
  postPaymentService,
  unsettledFromError,
  type PostPayment,
  type UnsettledInfo,
} from "@/services/postPaymentService";
import type { PostPaymentSource } from "@/lib/enums";

// ── Filters ────────────────────────────────────────────────────────────────

const RANGES = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "2d", label: "Last 2 days" },
  { value: "7d", label: "Last 7 days" },
  { value: "10d", label: "Last 10 days" },
  { value: "custom", label: "Custom" },
] as const;
type Range = (typeof RANGES)[number]["value"];

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "overdue", label: "Overdue" },
  { value: "converted", label: "Converted" },
  { value: "rejected", label: "Rejected" },
  { value: "blacklisted", label: "Blacklisted" },
  { value: "draft", label: "Drafts" },
] as const;
type StatusTab = (typeof STATUS_TABS)[number]["value"];

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "overdue", label: "Most overdue" },
  { value: "due", label: "Due soonest" },
  { value: "returnAsc", label: "Return days: short → long" },
  { value: "returnDesc", label: "Return days: long → short" },
  { value: "commissionDesc", label: "Commission %: high → low" },
  { value: "commissionAsc", label: "Commission %: low → high" },
  { value: "amountDesc", label: "Amount: high → low" },
  { value: "owedDesc", label: "Still owed: high → low" },
  { value: "teacher", label: "Teacher A → Z" },
] as const;
type SortKey = (typeof SORTS)[number]["value"];

const time = (iso: string) => new Date(iso).getTime();
const teacherName = (pp: PostPayment) => pp.teacherProfile?.name || pp.teacher.name || pp.teacherSnapshot?.name || "";
// Settled records sort after unsettled ones on the countdown sorts.
const countdown = (pp: PostPayment, today: string) => liveDaysLeft(pp, today) ?? Number.POSITIVE_INFINITY;

const comparators: Record<SortKey, (today: string) => (a: PostPayment, b: PostPayment) => number> = {
  newest: () => (a, b) => time(b.recordedAt) - time(a.recordedAt),
  oldest: () => (a, b) => time(a.recordedAt) - time(b.recordedAt),
  overdue: (t) => (a, b) => countdown(a, t) - countdown(b, t),
  due: (t) => (a, b) => {
    const da = countdown(a, t);
    const db = countdown(b, t);
    // Not-yet-due first (soonest), then overdue, then settled
    const rank = (d: number) => (d === Number.POSITIVE_INFINITY ? 2 : d < 0 ? 1 : 0);
    return rank(da) - rank(db) || (rank(da) === 1 ? db - da : da - db);
  },
  returnAsc: () => (a, b) => a.returnDays - b.returnDays,
  returnDesc: () => (a, b) => b.returnDays - a.returnDays,
  commissionDesc: () => (a, b) => b.commissionPercent - a.commissionPercent,
  commissionAsc: () => (a, b) => a.commissionPercent - b.commissionPercent,
  amountDesc: () => (a, b) => b.commissionAmount - a.commissionAmount,
  owedDesc: () => (a, b) => (b.outstanding || 0) - (a.outstanding || 0),
  teacher: () => (a, b) => teacherName(a).localeCompare(teacherName(b), "en", { sensitivity: "base" }),
};

interface Summary {
  total: number;
  pending: number;
  converted: number;
  rejected: number;
  blacklisted: number;
  drafts: number;
  overdue: number;
  pendingRevenue: number;
  successfulRevenue: number;
  partialCollected: number;
  collectedRevenue: number;
  badDebt: number;
  deducted: number;
}

/** Same rules as the backend's summary (src/utils/postPaymentLedger.js), over the shown range. */
function summarize(list: PostPayment[], today: string): Summary {
  const s: Summary = {
    total: 0, pending: 0, converted: 0, rejected: 0, blacklisted: 0, drafts: 0, overdue: 0,
    pendingRevenue: 0, successfulRevenue: 0, partialCollected: 0, collectedRevenue: 0, badDebt: 0, deducted: 0,
  };
  for (const pp of list) {
    if (pp.status === "draft") {
      s.drafts++;
      continue;
    }
    s.total++;
    s[pp.status]++;
    s.pendingRevenue += pp.pending;
    s.badDebt += pp.badDebt;
    s.deducted += pp.deducted;
    s.collectedRevenue += pp.collected;
    if (pp.status === "converted") s.successfulRevenue += pp.collected;
    else s.partialCollected += pp.collected;
    if (pp.status === "pending" && (liveDaysLeft(pp, today) ?? 0) < 0) s.overdue++;
  }
  return s;
}

// ── Stats ──────────────────────────────────────────────────────────────────

function CountTile({
  label,
  value,
  share,
  icon: Icon,
  tone,
  hint,
  onClick,
}: {
  label: string;
  value: number;
  share?: number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tone: { text: string; bg: string; bar: string };
  hint?: React.ReactNode;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={`group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all ${onClick ? "cursor-pointer hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone.bg}`}>
          <Icon size={18} className={tone.text} />
        </span>
      </div>
      <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{value}</p>
      {share !== undefined && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${Math.round(share * 100)}%` }} />
        </div>
      )}
      <div className="mt-1.5 min-h-4 text-xs text-slate-500">
        {hint}
        {onClick && <span className="ml-1 text-blue-600 opacity-0 transition-opacity group-hover:opacity-100">View →</span>}
      </div>
    </Tag>
  );
}

function RevenuePanel({ s }: { s: Summary }) {
  const live = s.collectedRevenue + s.pendingRevenue + s.badDebt;
  const pct = (n: number) => (live ? (n / live) * 100 : 0);
  const segments = [
    { label: "Collected", value: s.collectedRevenue, cls: "bg-emerald-500" },
    { label: "Pending", value: s.pendingRevenue, cls: "bg-amber-400" },
    { label: "Bad debt", value: s.badDebt, cls: "bg-red-500" },
  ];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-amber-600">Pending revenue</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{formatRs(s.pendingRevenue)}</p>
          <p className="text-xs text-slate-500">
            Still to collect from {s.pending} pending
            {s.overdue > 0 && <span className="font-medium text-red-600"> · {s.overdue} overdue</span>}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-emerald-600">Successful revenue</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{formatRs(s.collectedRevenue)}</p>
          <p className="text-xs text-slate-500">
            {formatRs(s.successfulRevenue)} from conversions
            {s.partialCollected > 0 && ` + ${formatRs(s.partialCollected)} partial payments`}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-red-600">Bad debt</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{formatRs(s.badDebt)}</p>
          <p className="text-xs text-slate-500">
            Unpaid by {s.blacklisted} blacklisted
            {s.deducted > 0 && <span> · {formatRs(s.deducted)} removed by rejections</span>}
          </p>
        </div>
      </div>
      <div className="mt-4">
        <div className="flex h-3 overflow-hidden rounded-full bg-slate-100" role="img" aria-label="Where expected revenue stands">
          {segments.map((seg) =>
            seg.value > 0 ? (
              <div
                key={seg.label}
                className={`${seg.cls} h-full transition-[width] duration-500`}
                style={{ width: `${pct(seg.value)}%` }}
                title={`${seg.label}: ${formatRs(seg.value)} (${pct(seg.value).toFixed(0)}%)`}
              />
            ) : null,
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          {segments.map((seg) => (
            <span key={seg.label} className="inline-flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${seg.cls}`} />
              {seg.label} {pct(seg.value).toFixed(0)}%
            </span>
          ))}
          <span className="ml-auto">Expected from live records: {formatRs(live)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function PostPaymentsPage() {
  const toast = useToast();
  const today = useToday();
  const [records, setRecords] = useState<PostPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const [range, setRange] = useState<Range>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [source, setSource] = useState<PostPaymentSource | "">("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [grouped, setGrouped] = useState(true);
  const [search, setSearch] = useState("");

  const [detail, setDetail] = useState<PostPayment | null>(null);
  const [editing, setEditing] = useState<PostPayment | null>(null);
  const [teacherUserId, setTeacherUserId] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [agreementOf, setAgreementOf] = useState<PostPayment | null>(null);
  const [group, setGroup] = useState<GroupStatus | null>(null);
  const [confirm, setConfirm] = useState<{ pp: PostPayment; action: "convert" | "blacklist" | "pending" } | null>(null);
  const [rejecting, setRejecting] = useState<PostPayment | null>(null);
  const [deleting, setDeleting] = useState<PostPayment | null>(null);
  const [activation, setActivation] = useState<{ pp: PostPayment; info: UnsettledInfo } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const data = await postPaymentService.list();
      setRecords(data.records);
      // Keep an open detail view in step with the refreshed record
      setDetail((current) => (current ? data.records.find((r) => r._id === current._id) || null : null));
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load post payments"));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);
  useRealtimeRefresh(
    fetchAll,
    ["post-payment:created", "post-payment:updated", "post-payment:deleted", "parent-request:deleted"],
    300,
  );

  // ── Derived lists ────────────────────────────────────────────────────────
  const [from, to] = useMemo((): [string, string] => {
    switch (range) {
      case "today":
        return [today, today];
      case "2d":
        return [shiftDay(today, 1), today];
      case "7d":
        return [shiftDay(today, 6), today];
      case "10d":
        return [shiftDay(today, 9), today];
      case "custom":
        return [customFrom, customTo];
      default:
        return ["", ""];
    }
  }, [range, today, customFrom, customTo]);

  const inRange = useMemo(
    () => records.filter((pp) => (!from || pp.dayKey >= from) && (!to || pp.dayKey <= to)),
    [records, from, to],
  );
  const summary = useMemo(() => summarize(inRange, today), [inRange, today]);
  const query = useMemo(() => parsePostPaymentQuery(search), [search]);

  const tabCounts = useMemo(() => {
    const counts: Record<StatusTab, number> = { all: 0, pending: 0, overdue: 0, converted: 0, rejected: 0, blacklisted: 0, draft: 0 };
    for (const pp of inRange) {
      if (pp.status !== "draft") counts.all++;
      counts[pp.status]++;
      if ((liveDaysLeft(pp, today) ?? 0) < 0 && pp.status === "pending") counts.overdue++;
    }
    return counts;
  }, [inRange, today]);

  const shown = useMemo(() => {
    const list = inRange.filter((pp) => {
      if (statusTab === "all" && pp.status === "draft") return false;
      if (statusTab === "overdue" && !(pp.status === "pending" && (liveDaysLeft(pp, today) ?? 0) < 0)) return false;
      if (statusTab !== "all" && statusTab !== "overdue" && pp.status !== statusTab) return false;
      if (source && pp.source !== source) return false;
      return (
        matchesPostPaymentFilters(pp, query.filters, liveDaysLeft(pp, today)) &&
        matchesPostPaymentText(pp, query.text)
      );
    });
    return list.sort(comparators[sort](today));
  }, [inRange, statusTab, source, query, sort, today]);

  const blocks = useMemo(
    () => (grouped ? groupByDay(shown, (pp) => pp.recordedAt, sort === "oldest") : null),
    [grouped, shown, sort],
  );

  // ── Actions ──────────────────────────────────────────────────────────────
  const afterChange = useCallback(
    (updated?: PostPayment) => {
      if (updated) setRecords((list) => list.map((r) => (r._id === updated._id ? updated : r)));
      if (updated) setDetail((d) => (d && d._id === updated._id ? updated : d));
      fetchAll();
    },
    [fetchAll],
  );

  const activate = useCallback(
    async (pp: PostPayment, acknowledge: boolean) => {
      setBusy(pp._id);
      try {
        const res = await postPaymentService.activate(pp._id, acknowledge);
        toast.success("Access granted. The request is now fulfilled.");
        setActivation(null);
        afterChange(res.data);
      } catch (err) {
        const info = unsettledFromError(err);
        if (info) setActivation({ pp, info });
        else toast.error(getErrorMessage(err, "Couldn't grant access"));
      } finally {
        setBusy(null);
      }
    },
    [afterChange, toast],
  );

  const onAction = useCallback(
    (action: PostPaymentAction, pp: PostPayment) => {
      switch (action) {
        case "edit":
          setEditing(pp);
          break;
        case "reject":
          setRejecting(pp);
          break;
        case "delete":
          setDeleting(pp);
          break;
        case "activate":
          void activate(pp, false);
          break;
        default:
          setConfirm({ pp, action });
      }
    },
    [activate],
  );

  const decide = useCallback(
    async (pp: PostPayment, status: "converted" | "rejected" | "blacklisted" | "pending", reason?: string, reopenRequest?: boolean) => {
      setBusy(pp._id);
      try {
        const res = await postPaymentService.decide(pp._id, status, { reason, reopenRequest });
        toast.success(res.message || "Updated");
        setConfirm(null);
        setRejecting(null);
        afterChange(res.data);
      } catch (err) {
        toast.error(getErrorMessage(err, "Couldn't update the post payment"));
        fetchAll();
      } finally {
        setBusy(null);
      }
    },
    [afterChange, fetchAll, toast],
  );

  const remove = useCallback(
    async (pp: PostPayment, reason: string, reopenRequest: boolean) => {
      setBusy(pp._id);
      try {
        const res = await postPaymentService.remove(pp._id, { reason: reason || undefined, reopenRequest });
        toast.success(res.message || "Post payment deleted");
        setDeleting(null);
        setDetail(null);
        setRecords((list) => list.filter((r) => r._id !== pp._id));
        fetchAll();
      } catch (err) {
        toast.error(getErrorMessage(err, "Couldn't delete the post payment"));
      } finally {
        setBusy(null);
      }
    },
    [fetchAll, toast],
  );

  const confirmCopy = confirm && {
    convert: {
      title: "Mark as converted",
      message: `${teacherName(confirm.pp)} has paid. ${formatRs(Math.max(confirm.pp.commissionAmount, confirm.pp.partialPaidAmount))} counts as successful revenue${confirm.pp.pending ? ` (${formatRs(confirm.pp.pending)} moves out of pending)` : ""}.`,
      label: "Mark converted",
      color: "emerald" as const,
      status: "converted" as const,
    },
    blacklist: {
      title: "Blacklist this post payment",
      message: `${formatRs(confirm.pp.outstanding)} unpaid by ${teacherName(confirm.pp)} moves to bad debt. They'll be flagged if they're given another post payment.`,
      label: "Blacklist",
      color: "red" as const,
      status: "blacklisted" as const,
    },
    pending: {
      title: "Move back to pending",
      message: "This undoes the decision: the amounts count as pending again and the countdown resumes.",
      label: "Move to pending",
      color: "blue" as const,
      status: "pending" as const,
    },
  }[confirm.action];

  // ── Table ────────────────────────────────────────────────────────────────
  const columns = useMemo(
    () => [
      {
        key: "teacher",
        header: "Teacher",
        render: (pp: PostPayment) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setTeacherUserId(pp.teacher._id);
            }}
            className="flex cursor-pointer items-center gap-2.5 text-left"
          >
            <TeacherAvatar name={teacherName(pp)} src={getImageUrl(pp.teacherProfile?.profilePicture)} size={34} />
            <span className="min-w-0">
              <span className="block max-w-40 truncate font-medium text-slate-900 hover:text-blue-600">{teacherName(pp)}</span>
              <span className="block text-xs text-slate-400">{pp.teacher.phoneNumber || pp.teacherProfile?.phone || "—"}</span>
            </span>
          </button>
        ),
      },
      {
        key: "tuition",
        header: "Tuition",
        render: (pp: PostPayment) => {
          const t = pp.tuitionRequest || pp.tuitionSnapshot;
          return (
            <div className="max-w-44">
              <span className="block truncate text-slate-800">{t?.name || "—"}</span>
              <span className="block truncate text-xs text-slate-400">{t?.location?.split(",")[0] || "—"}</span>
            </div>
          );
        },
      },
      { key: "source", header: "Source", render: (pp: PostPayment) => <SourceBadge source={pp.source} /> },
      {
        key: "commission",
        header: "Commission",
        render: (pp: PostPayment) => (
          <div>
            <span className="font-semibold text-slate-900">{pp.commissionPercent}%</span>
            <span className="block text-xs text-slate-400">{formatRs(pp.commissionAmount)}</span>
          </div>
        ),
      },
      {
        key: "date",
        header: "Date",
        render: (pp: PostPayment) => (
          <div className="whitespace-nowrap text-xs">
            {!grouped && <span className="block text-slate-700">{formatShortDate(pp.recordedAt)}</span>}
            <span className="text-slate-500">{formatTime(pp.recordedAt)}</span>
          </div>
        ),
      },
      { key: "return", header: "Return days", render: (pp: PostPayment) => <ReturnDaysBadge pp={pp} today={today} /> },
      {
        key: "partial",
        header: "Partial",
        render: (pp: PostPayment) =>
          pp.partialPaidAmount ? <span className="font-medium text-emerald-700">{formatRs(pp.partialPaidAmount)}</span> : null,
      },
      {
        key: "agreement",
        header: "Agreement",
        render: (pp: PostPayment) =>
          pp.agreement ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setAgreementOf(pp);
              }}
              className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:border-blue-300 hover:text-blue-600"
            >
              <AgreementIcon agreement={pp.agreement} size={13} /> View
            </button>
          ) : (
            <span className="text-xs text-slate-300">None</span>
          ),
      },
      {
        key: "status",
        header: "Status",
        render: (pp: PostPayment) => (
          <div className="max-w-36">
            <StatusBadge status={pp.status} kind="postPaymentStatus" />
            {pp.status === "rejected" && pp.rejectionReason && (
              <p className="mt-0.5 truncate text-[11px] text-red-500" title={pp.rejectionReason}>
                {pp.rejectionReason}
              </p>
            )}
          </div>
        ),
      },
      {
        key: "actions",
        header: "",
        render: (pp: PostPayment) => {
          const actions = actionsFor(pp);
          const disabled = busy === pp._id;
          return (
            <div className="ml-auto flex max-w-36 flex-wrap justify-end gap-1">
              <IconAction icon={Eye} label="View request" tone="blue" onClick={() => setRequestId(pp.tuitionRequest?._id || null)} disabled={!pp.tuitionRequest} />
              {actions.includes("activate") && <IconAction icon={KeyRound} label="Give access" tone="violet" onClick={() => onAction("activate", pp)} disabled={disabled} />}
              {actions.includes("edit") && <IconAction icon={Pencil} label="Edit" tone="amber" onClick={() => onAction("edit", pp)} disabled={disabled} />}
              {actions.includes("convert") && <IconAction icon={BadgeCheck} label="Converted (paid)" tone="emerald" onClick={() => onAction("convert", pp)} disabled={disabled} />}
              {actions.includes("reject") && <IconAction icon={XCircle} label="Reject (with reason)" tone="red" onClick={() => onAction("reject", pp)} disabled={disabled} />}
              {actions.includes("blacklist") && <IconAction icon={Ban} label="Blacklist (bad debt)" tone="dark" onClick={() => onAction("blacklist", pp)} disabled={disabled} />}
              {actions.includes("pending") && <IconAction icon={Undo2} label="Move back to pending" tone="slate" onClick={() => onAction("pending", pp)} disabled={disabled} />}
              <IconAction icon={Trash2} label="Delete" tone="red" onClick={() => onAction("delete", pp)} disabled={disabled} />
            </div>
          );
        },
      },
    ],
    [busy, grouped, onAction, today],
  );

  const dayStats = (items: PostPayment[]) => {
    const s = summarize(items, today);
    return [
      { label: "Collected", value: formatRsCompact(s.collectedRevenue), tone: "emerald" as const },
      ...(s.pendingRevenue ? [{ label: "Pending", value: formatRsCompact(s.pendingRevenue), tone: "amber" as const }] : []),
      ...(s.badDebt ? [{ label: "Bad debt", value: formatRsCompact(s.badDebt), tone: "red" as const }] : []),
      ...(s.drafts ? [{ label: "On hold", value: String(s.drafts), tone: "slate" as const }] : []),
    ];
  };

  const filtersActive = statusTab !== "all" || !!source || !!search.trim();
  const rangeLabel = range === "all" ? "All time" : RANGES.find((r) => r.value === range)?.label;

  return (
    <div>
      <PageHeader
        title="Post Payments"
        subtitle="Tuitions given now and paid later — tracked until the commission arrives"
        action={
          <Link
            href="/admin/parent-requests"
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
          >
            <HandCoins size={16} /> New post-pay
          </Link>
        }
      />

      {/* Range */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex flex-wrap rounded-xl border border-slate-200 bg-white p-1">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => {
                setRange(r.value);
                if (r.value === "custom" && !customFrom) {
                  setCustomFrom(shiftDay(today, 29));
                  setCustomTo(today);
                }
              }}
              className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${range === r.value ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {r.value === "custom" && <CalendarRange size={12} className="-mt-0.5 mr-1 inline" />}
              {r.label}
            </button>
          ))}
        </div>
        {range === "custom" && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <input type="date" value={customFrom} max={customTo || undefined} onChange={(e) => setCustomFrom(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700" aria-label="From" />
            to
            <input type="date" value={customTo} min={customFrom || undefined} onChange={(e) => setCustomTo(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700" aria-label="To" />
          </div>
        )}
        <span className="text-xs text-slate-400">{rangeLabel === "Custom" ? `${from || "…"} → ${to || "…"}` : rangeLabel}</span>
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CountTile
          label="Post payments"
          value={summary.total}
          icon={HandCoins}
          tone={{ text: "text-violet-600", bg: "bg-violet-100", bar: "bg-violet-500" }}
          hint={
            <>
              {summary.overdue > 0 && <span className="font-medium text-red-600">{summary.overdue} overdue · </span>}
              {summary.pending} pending{summary.drafts ? ` · ${summary.drafts} on hold` : ""}
            </>
          }
          onClick={() => setGroup("pending")}
        />
        <CountTile
          label="Successful conversions"
          value={summary.converted}
          share={summary.total ? summary.converted / summary.total : 0}
          icon={BadgeCheck}
          tone={{ text: "text-emerald-600", bg: "bg-emerald-100", bar: "bg-emerald-500" }}
          hint={summary.total ? `${Math.round((summary.converted / summary.total) * 100)}% conversion rate` : "No records yet"}
          onClick={() => setGroup("converted")}
        />
        <CountTile
          label="Rejected"
          value={summary.rejected}
          share={summary.total ? summary.rejected / summary.total : 0}
          icon={XCircle}
          tone={{ text: "text-slate-600", bg: "bg-slate-100", bar: "bg-slate-400" }}
          hint={summary.deducted ? `${formatRs(summary.deducted)} deducted` : "Nothing deducted"}
          onClick={() => setGroup("rejected")}
        />
        <CountTile
          label="Blacklisted"
          value={summary.blacklisted}
          share={summary.total ? summary.blacklisted / summary.total : 0}
          icon={Ban}
          tone={{ text: "text-white", bg: "bg-zinc-900", bar: "bg-zinc-800" }}
          hint={summary.badDebt ? `${formatRs(summary.badDebt)} bad debt` : "No bad debt"}
          onClick={() => setGroup("blacklisted")}
        />
      </div>
      <div className="mb-6">
        <RevenuePanel s={summary} />
      </div>

      {/* Search + sort */}
      <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setSearch("")}
            placeholder="Search teacher, phone, student, place… or filter: source:aarambha  commission>25  exceed>=3  left<=2"
            aria-label="Search post payments"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-9 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 [&::-webkit-search-cancel-button]:hidden"
          />
          {search && (
            <button type="button" aria-label="Clear search" onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded p-1 text-slate-400 hover:bg-slate-100">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={source} onChange={(e) => setSource(e.target.value as PostPaymentSource | "")} aria-label="Source" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
            <option value="">All sources</option>
            <option value="Agrade">Agrade</option>
            <option value="Aarambha">Aarambha</option>
          </select>
          <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-700">
            <ArrowUpDown size={14} className="text-slate-400" />
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort" className="bg-transparent py-2 pr-1 focus:outline-none">
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => setGrouped((g) => !g)}
            aria-pressed={grouped}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium ${grouped ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-300 bg-white text-slate-600"}`}
          >
            <Layers size={14} /> {grouped ? "Day blocks" : "Single list"}
          </button>
        </div>
      </div>

      {/* Parsed filters / suggestions */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {query.filters.length > 0 ? (
          query.filters.map((f) => (
            <button
              key={f.raw}
              type="button"
              onClick={() => setSearch((s) => s.replace(f.raw, "").replace(/\s{2,}/g, " ").trim())}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700"
              title="Remove filter"
            >
              {f.label} <X size={12} />
            </button>
          ))
        ) : (
          <>
            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
              <Sparkles size={12} /> Try:
            </span>
            {QUERY_SUGGESTIONS.map((s) => (
              <button
                key={s.query}
                type="button"
                onClick={() => setSearch((cur) => `${cur} ${s.query}`.trim())}
                className="cursor-pointer rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 hover:border-blue-300 hover:text-blue-700"
              >
                {s.label}
              </button>
            ))}
          </>
        )}
      </div>

      {/* Status tabs */}
      <div className="mb-5 flex flex-wrap gap-1.5">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setStatusTab(tab.value)}
            className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${statusTab === tab.value ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            {tab.label}
            <span
              className={`ml-1.5 inline-flex min-w-4.5 justify-center rounded-full px-1 text-[10px] font-semibold ${
                statusTab === tab.value
                  ? "bg-white text-blue-700"
                  : tab.value === "overdue" && tabCounts.overdue
                    ? "bg-red-500 text-white"
                    : "bg-white text-slate-500"
              }`}
            >
              {tabCounts[tab.value]}
            </span>
          </button>
        ))}
        {filtersActive && (
          <span className="self-center text-xs text-slate-500">
            {shown.length} shown
            <button
              type="button"
              onClick={() => {
                setStatusTab("all");
                setSource("");
                setSearch("");
              }}
              className="ml-2 cursor-pointer text-blue-600 hover:underline"
            >
              Clear filters
            </button>
          </span>
        )}
      </div>

      {/* Records */}
      {loading ? (
        <Loading />
      ) : shown.length === 0 ? (
        <EmptyState
          message={
            records.length === 0
              ? "No post payments yet. Use Post-pay on a vacant parent request to record one."
              : "No post payments match these filters."
          }
        />
      ) : blocks ? (
        <div className="space-y-6">
          {blocks.map((block) => (
            <DayBlock
              key={block.key || "undated"}
              day={block.key}
              today={today}
              count={block.items.length}
              countLabel={["post payment", "post payments"]}
              stats={dayStats(block.items)}
            >
              <DataTable columns={columns} data={block.items} onRowClick={setDetail} />
            </DayBlock>
          ))}
        </div>
      ) : (
        <DataTable columns={columns} data={shown} onRowClick={setDetail} />
      )}

      {/* Modals — later ones stack on top of earlier ones */}
      <StatusGroupModal
        status={group}
        records={records}
        today={today}
        onClose={() => setGroup(null)}
        onViewTeacher={setTeacherUserId}
        onOpenRecord={(pp) => {
          setGroup(null);
          setDetail(pp);
        }}
      />
      <PostPaymentDetailModal
        pp={detail}
        today={today}
        onClose={() => setDetail(null)}
        onAction={onAction}
        onViewTeacher={(pp) => setTeacherUserId(pp.teacher._id)}
        onViewRequest={(pp) => setRequestId(pp.tuitionRequest?._id || null)}
        onViewAgreement={setAgreementOf}
      />
      <TeacherHistoryModal
        userId={teacherUserId}
        today={today}
        onClose={() => setTeacherUserId(null)}
        onOpenRecord={(pp) => {
          setTeacherUserId(null);
          setGroup(null);
          setDetail(records.find((r) => r._id === pp._id) || pp);
        }}
        onViewAgreement={setAgreementOf}
      />
      <RequestQuickView requestId={requestId} onClose={() => setRequestId(null)} />
      <PostPayFormModal open={!!editing} editing={editing} onClose={() => setEditing(null)} onSaved={(pp) => afterChange(pp)} />
      <ConfirmDialog
        open={!!confirm}
        onClose={() => !busy && setConfirm(null)}
        onConfirm={() => confirm && confirmCopy && decide(confirm.pp, confirmCopy.status)}
        title={confirmCopy?.title || ""}
        message={confirmCopy?.message || ""}
        confirmLabel={confirmCopy?.label}
        confirmColor={confirmCopy?.color}
        loading={!!confirm && busy === confirm.pp._id}
      />
      <RejectDialog
        pp={rejecting}
        busy={!!rejecting && busy === rejecting._id}
        onClose={() => setRejecting(null)}
        onConfirm={(reason, reopen) => rejecting && decide(rejecting, "rejected", reason, reopen)}
      />
      <DeleteDialog
        pp={deleting}
        busy={!!deleting && busy === deleting._id}
        onClose={() => setDeleting(null)}
        onConfirm={(reason, reopen) => deleting && remove(deleting, reason, reopen)}
      />
      <UnsettledWarning
        info={activation?.info || null}
        mode="activate"
        busy={activation && busy === activation.pp._id ? "access" : null}
        onAccess={() => activation && activate(activation.pp, true)}
        onHold={() => setActivation(null)}
        onClose={() => setActivation(null)}
      />
      <AgreementViewer
        agreement={agreementOf?.agreement || null}
        title={agreementOf ? `Agreement — ${teacherName(agreementOf)}` : undefined}
        onClose={() => setAgreementOf(null)}
      />
    </div>
  );
}
