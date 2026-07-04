import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/format";
import type { Application } from "@/lib/types";

export function ApplicationsTable({ applications }: { applications: Application[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200">
      <table className="min-w-full divide-y divide-neutral-200">
        <thead className="bg-neutral-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Company
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Title
            </th>
            <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500 md:table-cell">
              Location
            </th>
            <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500 sm:table-cell">
              Applied
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200 bg-white">
          {applications.map((app) => (
            <tr key={app.id} className="transition hover:bg-neutral-50">
              <td className="px-4 py-3">
                <Link
                  href={`/applications/${app.id}`}
                  className="text-sm font-semibold text-neutral-900 hover:underline"
                >
                  {app.companyName}
                </Link>
              </td>
              <td className="px-4 py-3 text-sm text-neutral-700">
                <Link href={`/applications/${app.id}`} className="block">
                  {app.jobTitle}
                </Link>
              </td>
              <td className="hidden px-4 py-3 text-sm text-neutral-500 md:table-cell">
                {app.locationText ?? "—"}
              </td>
              <td className="hidden px-4 py-3 text-sm text-neutral-500 sm:table-cell">
                {formatDate(app.appliedAt)}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={app.currentStatus} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
