import { matchesSearch } from "@/lib/search";
import type { PostPayment } from "@/services/postPaymentService";

/**
 * The Post Payments search box understands filters next to free text:
 *
 *   ram source:aarambha commission>=25 exceed>3
 *
 * Numeric keys take > < >= <= = (or ":" for =); text keys take ":".
 * Anything else is matched like the other admin searches (every word must
 * appear somewhere: teacher, phone, student, parent, location, reason…).
 */

type Op = ">" | "<" | ">=" | "<=" | "=";

type NumericKey = "commission" | "return" | "exceed" | "left" | "amount" | "partial" | "owed";
type TextKey = "source" | "status";
export type FilterKey = NumericKey | TextKey;

export interface QueryFilter {
  key: FilterKey;
  op: Op | ":";
  value: string;
  /** The text as typed, so a chip can remove it from the query. */
  raw: string;
  label: string;
}

const ALIASES: Record<string, FilterKey> = {
  source: "source", src: "source",
  status: "status", is: "status",
  commission: "commission", comm: "commission", com: "commission", pct: "commission",
  return: "return", returndays: "return", rd: "return", days: "return",
  exceed: "exceed", exceeded: "exceed", overdue: "exceed", late: "exceed",
  left: "left", due: "left", remaining: "left",
  amount: "amount", amt: "amount",
  partial: "partial", paid: "partial",
  owed: "owed", owes: "owed", outstanding: "owed",
};

const NUMERIC = new Set<FilterKey>(["commission", "return", "exceed", "left", "amount", "partial", "owed"]);

const NAMES: Record<FilterKey, string> = {
  source: "Source",
  status: "Status",
  commission: "Commission",
  return: "Return days",
  exceed: "Exceeded",
  left: "Days left",
  amount: "Commission Rs.",
  partial: "Partial paid",
  owed: "Still owed",
};

const SUFFIX: Partial<Record<FilterKey, string>> = {
  commission: "%",
  return: " days",
  exceed: " days",
  left: " days",
};

const opText: Record<Op, string> = { ">": ">", "<": "<", ">=": "≥", "<=": "≤", "=": "=" };

const TOKEN = /([a-z%]+)\s*(>=|<=|>|<|=|:)\s*("[^"]*"|[^\s"]+)|"([^"]*)"|(\S+)/gi;

export function parsePostPaymentQuery(query: string): { filters: QueryFilter[]; text: string } {
  const filters: QueryFilter[] = [];
  const words: string[] = [];
  for (const m of query.matchAll(TOKEN)) {
    const [raw, rawKey, rawOp, rawValue, quoted, word] = m;
    const key = rawKey ? ALIASES[rawKey.toLowerCase()] : undefined;
    if (key && rawOp && rawValue) {
      const value = rawValue.replace(/^"|"$/g, "");
      const numeric = NUMERIC.has(key);
      if (numeric && !Number.isFinite(Number(value.replace(/[,%]/g, "")))) {
        words.push(raw);
        continue;
      }
      const op = (numeric && rawOp === ":" ? "=" : rawOp) as Op | ":";
      const shown = numeric
        ? `${NAMES[key]} ${opText[op as Op] ?? "="} ${key === "amount" || key === "partial" || key === "owed" ? "Rs. " : ""}${value}${SUFFIX[key] ?? ""}`
        : `${NAMES[key]}: ${value}`;
      filters.push({ key, op, value, raw, label: shown });
    } else {
      words.push(quoted ?? word ?? raw);
    }
  }
  return { filters, text: words.join(" ") };
}

const compare = (actual: number, op: Op | ":", expected: number) => {
  switch (op) {
    case ">":
      return actual > expected;
    case "<":
      return actual < expected;
    case ">=":
      return actual >= expected;
    case "<=":
      return actual <= expected;
    default:
      return actual === expected;
  }
};

/**
 * Does `pp` pass every filter? `daysLeft` is the live countdown
 * (positive left, negative exceeded, null when nothing is owed).
 */
export function matchesPostPaymentFilters(pp: PostPayment, filters: QueryFilter[], daysLeft: number | null): boolean {
  return filters.every((f) => {
    if (f.key === "source") return pp.source.toLowerCase().startsWith(f.value.toLowerCase());
    if (f.key === "status") {
      const v = f.value.toLowerCase();
      if (v.startsWith("overdue") || v.startsWith("exceed")) return daysLeft !== null && daysLeft < 0;
      if (v.startsWith("hold") || v.startsWith("held")) return pp.status === "draft";
      return pp.status.startsWith(v);
    }
    const n = Number(f.value.replace(/[,%]/g, ""));
    switch (f.key) {
      case "commission":
        return compare(pp.commissionPercent, f.op, n);
      case "return":
        return compare(pp.returnDays, f.op, n);
      case "exceed":
        return daysLeft !== null && daysLeft < 0 && compare(-daysLeft, f.op, n);
      case "left":
        return daysLeft !== null && daysLeft >= 0 && compare(daysLeft, f.op, n);
      case "amount":
        return compare(pp.commissionAmount, f.op, n);
      case "partial":
        return compare(pp.partialPaidAmount || 0, f.op, n);
      case "owed":
        return compare(pp.outstanding || 0, f.op, n);
      default:
        return true;
    }
  });
}

/** Free-text part: teacher, phone, tuition, parent, place, source, reason. */
export function matchesPostPaymentText(pp: PostPayment, text: string): boolean {
  if (!text.trim()) return true;
  const request = pp.tuitionRequest;
  return matchesSearch(text, [
    pp.teacher?.name,
    pp.teacher?.email,
    pp.teacher?.phoneNumber,
    pp.teacherProfile?.name,
    pp.teacherProfile?.phone,
    pp.teacherSnapshot?.name,
    pp.teacherSnapshot?.phoneNumber,
    request?.name,
    request?.location,
    request?.parent?.name,
    request?.parent?.phoneNumber,
    pp.tuitionSnapshot?.name,
    pp.tuitionSnapshot?.location,
    pp.tuitionSnapshot?.parentName,
    pp.source,
    pp.status,
    pp.rejectionReason,
    pp.agreement?.originalName,
  ]);
}

/** One-click searches shown under the box. */
export const QUERY_SUGGESTIONS = [
  { label: "Overdue 3+ days", query: "exceed>=3" },
  { label: "Due within 2 days", query: "left<=2" },
  { label: "Aarambha", query: "source:aarambha" },
  { label: "Agrade", query: "source:agrade" },
  { label: "Commission ≥ 30%", query: "commission>=30" },
  { label: "Return ≤ 7 days", query: "return<=7" },
  { label: "Has partial payment", query: "partial>0" },
  { label: "Owes Rs. 5,000+", query: "owed>=5000" },
] as const;
