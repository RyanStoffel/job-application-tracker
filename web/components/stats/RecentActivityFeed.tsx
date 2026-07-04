import Link from "next/link";
import { formatDateTime } from "@/lib/format";
import type { RecentActivityItem } from "@/lib/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function RecentActivityFeed({ items }: { items: RecentActivityItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No activity yet"
        description="Status changes on your applications will show up here."
      />
    );
  }

  return (
    <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-4 px-4 py-3">
          <StatusBadge status={item.status} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <Link
              href={`/applications/${item.applicationId}`}
              className="truncate text-sm font-semibold text-neutral-900 hover:underline"
            >
              {item.companyName} — {item.jobTitle}
            </Link>
            {item.note && <p className="truncate text-xs text-neutral-500">{item.note}</p>}
          </div>
          <span className="shrink-0 text-xs text-neutral-400">{formatDateTime(item.changedAt)}</span>
        </li>
      ))}
    </ul>
  );
}
