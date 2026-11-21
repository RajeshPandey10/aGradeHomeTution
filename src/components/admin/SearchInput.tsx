"use client";

import { Search, X } from "lucide-react";

/**
 * Search box for admin lists. Pass `total`/`shown` to display a result count
 * while a search is active.
 */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search",
  total,
  shown,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  total?: number;
  shown?: number;
  className?: string;
}) {
  const searching = value.trim().length > 0;
  return (
    <div className={`mb-4 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3 ${className}`}>
      <div className="relative w-full sm:max-w-md">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onChange("");
          }}
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-9 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 [&::-webkit-search-cancel-button]:hidden"
        />
        {searching && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={14} />
          </button>
        )}
      </div>
      {searching && typeof shown === "number" && (
        <span className="text-xs text-slate-500">
          {shown} {shown === 1 ? "match" : "matches"}
          {typeof total === "number" ? ` of ${total}` : ""}
        </span>
      )}
    </div>
  );
}
