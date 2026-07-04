import { STATUS_LABEL, STATUS_ORDER } from "@/lib/status";
import type { ListApplicationsParams } from "@/lib/types";

interface Props {
  q: string;
  onQChange: (value: string) => void;
  status: ListApplicationsParams["status"] | "";
  onStatusChange: (value: ListApplicationsParams["status"] | "") => void;
  sort: NonNullable<ListApplicationsParams["sort"]>;
  onSortChange: (value: NonNullable<ListApplicationsParams["sort"]>) => void;
}

export function ApplicationFilters({
  q,
  onQChange,
  status,
  onStatusChange,
  sort,
  onSortChange,
}: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <input
        type="search"
        value={q}
        onChange={(e) => onQChange(e.target.value)}
        placeholder="Search company or title…"
        className="w-full rounded-md px-3 py-2 text-sm text-neutral-900 ring-1 ring-inset ring-neutral-300 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 sm:max-w-xs"
      />
      <select
        value={status}
        onChange={(e) => onStatusChange((e.target.value || "") as Props["status"])}
        className="rounded-md px-3 py-2 text-sm text-neutral-900 ring-1 ring-inset ring-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900"
      >
        <option value="">All statuses</option>
        {STATUS_ORDER.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value as NonNullable<ListApplicationsParams["sort"]>)}
        className="rounded-md px-3 py-2 text-sm text-neutral-900 ring-1 ring-inset ring-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900"
      >
        <option value="-createdAt">Newest first</option>
        <option value="createdAt">Oldest first</option>
        <option value="companyName">Company (A–Z)</option>
        <option value="-companyName">Company (Z–A)</option>
        <option value="currentStatus">Status</option>
      </select>
    </div>
  );
}
