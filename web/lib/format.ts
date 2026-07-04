const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Format an ISO date string for display. Falls back gracefully if absent.
 * Date-only values (e.g. "2026-07-01", no time component) are treated as
 * UTC and formatted without a local-timezone conversion, so they never
 * shift a day off in negative-UTC-offset timezones. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: DATE_ONLY_RE.test(value) ? "UTC" : undefined,
  });
}

/** Format an ISO date string with time, for timeline/activity entries. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Convert an ISO date string to yyyy-MM-dd for <input type="date">. */
export function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}
