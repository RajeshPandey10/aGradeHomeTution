"use client";

import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import { AlertTriangle, Ban, Loader2, Search, X } from "lucide-react";
import { TeacherAvatar } from "@/components/admin/UI";
import { buildSearchIndex, highlightParts, searchIndex } from "@/lib/fuzzySearch";
import { getImageUrl } from "@/lib/image";
import { formatRs } from "@/lib/money";
import type { TeacherOption } from "@/services/postPaymentService";

const Highlight = ({ text, query }: { text: string; query: string }) => (
  <>
    {highlightParts(text, query).map((part, i) =>
      part.hit ? (
        <mark key={i} className="rounded-sm bg-amber-100 px-px text-inherit">
          {part.text}
        </mark>
      ) : (
        <span key={i}>{part.text}</span>
      ),
    )}
  </>
);

export function OwesBadge({ unsettled }: { unsettled: TeacherOption["unsettled"] }) {
  if (!unsettled) return null;
  if (unsettled.blacklisted) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-900 px-2 py-0.5 text-[11px] font-medium text-white">
        <Ban size={11} /> Blacklisted
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
      <AlertTriangle size={11} /> Owes {formatRs(unsettled.owed)}
    </span>
  );
}

/**
 * Searchable picker over verified teachers. Ranking (src/lib/fuzzySearch.ts)
 * runs in memory on every keystroke: name, phone, email, address and
 * qualification, typo-tolerant, phone numbers matched digit-by-digit.
 */
export function TeacherPicker({
  options,
  value,
  onChange,
  disabled,
  invalid,
}: {
  options: TeacherOption[] | null;
  value: TeacherOption | null;
  onChange: (teacher: TeacherOption | null) => void;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const deferred = useDeferredValue(query);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const index = useMemo(
    () =>
      buildSearchIndex(
        options || [],
        (t) => t.name,
        (t) => [
          { value: t.name, weight: 1 },
          { value: t.accountName !== t.name ? t.accountName : "", weight: 0.9 },
          { value: t.email, weight: 0.6 },
          { value: t.address, weight: 0.45 },
          { value: t.academicQualification, weight: 0.35 },
        ],
        (t) => [t.phone],
      ),
    [options],
  );

  const results = useMemo(
    () => (deferred.trim() ? searchIndex(index, deferred, 8) : (options || []).slice(0, 8)),
    [index, deferred, options],
  );

  useEffect(() => setActive(0), [deferred]);

  const choose = (teacher: TeacherOption) => {
    onChange(teacher);
    setQuery("");
    setOpen(false);
  };

  if (value) {
    return (
      <div className={`flex items-center gap-3 rounded-lg border p-3 ${invalid ? "border-red-300" : "border-slate-300"} bg-white`}>
        <TeacherAvatar name={value.name} src={getImageUrl(value.profilePicture)} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium text-slate-900">{value.name}</p>
            <OwesBadge unsettled={value.unsettled} />
          </div>
          <p className="truncate text-xs text-slate-500">
            {[value.phone, value.email].filter(Boolean).join(" · ")}
          </p>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
            className="cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
          >
            Change
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          value={query}
          disabled={disabled || !options}
          placeholder={options ? `Search ${options.length} verified teachers by name, phone, email or area` : "Loading verified teachers…"}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((i) => Math.min(i + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (results[active]) choose(results[active]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          className={`w-full rounded-lg border bg-white py-2.5 pl-9 pr-9 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${invalid ? "border-red-300" : "border-slate-300"}`}
        />
        {!options && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />}
        {options && query && (
          <button
            type="button"
            aria-label="Clear"
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded p-1 text-slate-400 hover:bg-slate-100"
          >
            <X size={14} />
          </button>
        )}
      </div>
      {open && options && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {results.length === 0 ? (
            <li className="px-3 py-4 text-center text-sm text-slate-500">
              No verified teacher matches &ldquo;{query}&rdquo;
            </li>
          ) : (
            results.map((t, i) => (
              <li
                key={t.userId}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(t);
                }}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center gap-3 px-3 py-2 ${i === active ? "bg-blue-50" : ""}`}
              >
                <TeacherAvatar name={t.name} src={getImageUrl(t.profilePicture)} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-slate-900">
                      <Highlight text={t.name} query={deferred} />
                    </p>
                    <OwesBadge unsettled={t.unsettled} />
                  </div>
                  <p className="truncate text-xs text-slate-500">
                    <Highlight text={[t.phone, t.email, t.address].filter(Boolean).join(" · ")} query={deferred} />
                  </p>
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
