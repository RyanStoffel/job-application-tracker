import type { Application, SalaryPeriod } from "./types";

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

const SALARY_PERIOD_SUFFIX: Record<SalaryPeriod, string> = {
  yearly: "/yr",
  monthly: "/mo",
  weekly: "/wk",
  hourly: "/hr",
};

/** Format the structured salary fields for display, e.g. "$140,000 – $180,000/yr". */
export function formatSalaryRange(app: Pick<Application, "salaryMin" | "salaryMax" | "salaryCurrency" | "salaryPeriod">): string | null {
  if (app.salaryMin == null && app.salaryMax == null) return null;

  const currencyPrefix = app.salaryCurrency === "USD" ? "$" : app.salaryCurrency === "EUR" ? "€" : app.salaryCurrency === "GBP" ? "£" : "";
  const format = (n: number) => `${currencyPrefix}${n.toLocaleString()}`;
  const suffix = app.salaryPeriod ? SALARY_PERIOD_SUFFIX[app.salaryPeriod] : "";

  if (app.salaryMin != null && app.salaryMax != null && app.salaryMin !== app.salaryMax) {
    return `${format(app.salaryMin)} – ${format(app.salaryMax)}${suffix}`;
  }
  return `${format(app.salaryMin ?? app.salaryMax ?? 0)}${suffix}`;
}

/** Format the structured location fields for display, e.g. "Austin, TX · Remote". */
export function formatLocationSummary(app: Pick<Application, "locationCity" | "locationRegion" | "locationCountry" | "isRemote">): string | null {
  const parts = [app.locationCity, app.locationRegion, app.locationCountry].filter((part): part is string => Boolean(part));
  const location = parts.join(", ");

  if (location && app.isRemote) return `${location} · Remote`;
  if (location) return location;
  if (app.isRemote) return "Remote";
  return null;
}

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
