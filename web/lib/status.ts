import type { Status } from "./types";

export const STATUS_ORDER: Status[] = [
  "saved",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "ghosted",
];

export const STATUS_LABEL: Record<Status, string> = {
  saved: "Saved",
  applied: "Applied",
  interviewing: "Interviewing",
  rejected: "Rejected",
  ghosted: "Ghosted",
  offer: "Offer",
};

// Tailwind class groups per status. Kept intentionally limited so the
// palette stays legible and consistent wherever a badge appears.
export const STATUS_CLASSES: Record<Status, string> = {
  saved: "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-300",
  applied: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-300",
  interviewing: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-300",
  rejected: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-300",
  ghosted: "bg-neutral-100 text-neutral-500 ring-1 ring-inset ring-neutral-300",
  offer: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-300",
};

// Solid-dot color used in compact contexts (timeline, recent activity).
export const STATUS_DOT_CLASSES: Record<Status, string> = {
  saved: "bg-slate-400",
  applied: "bg-blue-500",
  interviewing: "bg-amber-500",
  rejected: "bg-rose-500",
  ghosted: "bg-neutral-400",
  offer: "bg-emerald-500",
};
