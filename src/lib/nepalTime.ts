import { useEffect, useState } from "react";

/**
 * Calendar days in Nepal time (UTC+05:45, no daylight saving), matching the
 * backend's src/utils/nepalTime.js: "due in 3 days" and "one block per day"
 * mean the same thing whatever time zone the browser is in.
 */

const NPT_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

type DateLike = string | number | Date | null | undefined;

const time = (value: DateLike) => {
  if (value === null || value === undefined || value === "") return NaN;
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
};

/** Days since the epoch for the Nepal calendar date of `value`. */
export const dayIndex = (value: DateLike = Date.now()) =>
  Math.floor((time(value) + NPT_OFFSET_MS) / DAY_MS);

/** The Nepal calendar date as YYYY-MM-DD ("" for a missing/invalid date). */
export function dayKey(value: DateLike): string {
  const index = dayIndex(value);
  return Number.isFinite(index) ? new Date(index * DAY_MS).toISOString().slice(0, 10) : "";
}

export const todayKey = () => dayKey(Date.now());

/** YYYY-MM-DD `n` days before (negative: after) `key`. */
export function shiftDay(key: string, n: number): string {
  return new Date(Date.parse(`${key}T00:00:00Z`) - n * DAY_MS).toISOString().slice(0, 10);
}

/** Calendar days from today to `due`: positive = left, 0 = due today, negative = overdue. */
export const daysUntil = (due: DateLike, now: DateLike = Date.now()) => dayIndex(due) - dayIndex(now);

/** "1 day", "12 days", "1 month 3 days". */
export function formatDayCount(days: number): string {
  const n = Math.abs(Math.trunc(days));
  if (n < 30) return `${n} ${n === 1 ? "day" : "days"}`;
  const months = Math.floor(n / 30);
  const rest = n % 30;
  const m = `${months} ${months === 1 ? "month" : "months"}`;
  return rest ? `${m} ${rest} ${rest === 1 ? "day" : "days"}` : m;
}

const dayFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const shortDayFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const timeFormat = new Intl.DateTimeFormat("en-GB", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Kathmandu",
});

/** "Monday, 24 November 2026" for a YYYY-MM-DD key. */
export const formatDayHeading = (key: string) => dayFormat.format(new Date(`${key}T00:00:00Z`));

/** "24 Nov 2026" for a timestamp (Nepal date). */
export const formatShortDate = (value: DateLike) => {
  const key = dayKey(value);
  return key ? shortDayFormat.format(new Date(`${key}T00:00:00Z`)) : "—";
};

/** "3:45 pm" in Nepal time. */
export const formatTime = (value: DateLike) =>
  Number.isFinite(time(value)) ? timeFormat.format(new Date(time(value))) : "";

/** "Today", "Yesterday" or the full day heading. */
export function relativeDayLabel(key: string, today = todayKey()): string {
  if (key === today) return "Today";
  if (key === shiftDay(today, 1)) return "Yesterday";
  return formatDayHeading(key);
}

/**
 * Today's Nepal date, updated when the day changes so countdowns ("2 days
 * left" → "1 day left") roll over without a reload.
 */
export function useToday(): string {
  const [today, setToday] = useState(todayKey);
  useEffect(() => {
    const msToMidnight = (dayIndex() + 1) * DAY_MS - NPT_OFFSET_MS - Date.now();
    const timer = setTimeout(() => setToday(todayKey()), Math.max(1000, msToMidnight + 500));
    // Laptops sleep through midnight: re-check when the tab comes back.
    const onVisible = () => document.visibilityState === "visible" && setToday(todayKey());
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [today]);
  return today;
}
