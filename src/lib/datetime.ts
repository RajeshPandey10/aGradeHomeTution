const pad = (n: number) => String(n).padStart(2, "0");

const parse = (value: string | Date | null | undefined) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** The browser-local calendar date (`YYYY-MM-DD`) of a timestamp, or "". */
export function toLocalDate(value: string | Date | null | undefined): string {
  const date = parse(value);
  if (!date) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * An ISO/UTC timestamp as the `YYYY-MM-DDTHH:mm` value an
 * `<input type="datetime-local">` expects, in the browser's time zone.
 */
export function toLocalInput(iso: string | null | undefined): string {
  const date = parse(iso);
  if (!date) return "";
  return `${toLocalDate(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * A `datetime-local` value (local wall-clock time) as a full ISO timestamp,
 * or null when the field is empty.
 */
export function fromLocalInput(value: string): string | null {
  return parse(value)?.toISOString() ?? null;
}

/** The start and end of a local calendar day (`YYYY-MM-DD`) as ISO timestamps. */
export function localDayRange(day: string) {
  return {
    startDate: new Date(`${day}T00:00:00`).toISOString(),
    endDate: new Date(`${day}T23:59:59.999`).toISOString(),
  };
}
