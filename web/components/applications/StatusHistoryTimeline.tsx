import { STATUS_DOT_CLASSES, STATUS_LABEL } from "@/lib/status";
import { formatDateTime } from "@/lib/format";
import type { StatusEvent } from "@/lib/types";
import { EmptyState } from "@/components/ui/EmptyState";

export function StatusHistoryTimeline({ events }: { events: StatusEvent[] }) {
  if (events.length === 0) {
    return <EmptyState title="No status history yet" />;
  }

  const sorted = [...events].sort(
    (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime(),
  );

  return (
    <ol className="space-y-0">
      {sorted.map((event, i) => (
        <li key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
          {i !== sorted.length - 1 && (
            <span className="absolute left-[5px] top-3 h-full w-px bg-neutral-200" aria-hidden />
          )}
          <span
            className={`relative z-10 mt-1.5 h-3 w-3 shrink-0 rounded-full ${STATUS_DOT_CLASSES[event.status]}`}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-neutral-900">{STATUS_LABEL[event.status]}</p>
            {event.note && <p className="mt-0.5 text-sm text-neutral-600">{event.note}</p>}
            <p className="mt-0.5 text-xs text-neutral-400">{formatDateTime(event.changedAt)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
