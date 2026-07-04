import { STATUS_DOT_CLASSES, STATUS_LABEL, STATUS_ORDER } from "@/lib/status";
import type { StatsByStatus } from "@/lib/types";

export function StatusBreakdown({ byStatus }: { byStatus: StatsByStatus }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {STATUS_ORDER.map((status) => (
        <div
          key={status}
          className="rounded-xl border border-neutral-200 px-4 py-4"
        >
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${STATUS_DOT_CLASSES[status]}`} />
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {STATUS_LABEL[status]}
            </span>
          </div>
          <p className="mt-3 text-3xl font-bold tracking-tight text-neutral-900">
            {byStatus[status] ?? 0}
          </p>
        </div>
      ))}
    </div>
  );
}
