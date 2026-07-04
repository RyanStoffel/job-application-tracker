"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { AppShell } from "@/components/layout/AppShell";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { ApplicationEditForm } from "@/components/applications/ApplicationEditForm";
import { StatusTransitionControl } from "@/components/applications/StatusTransitionControl";
import { StatusHistoryTimeline } from "@/components/applications/StatusHistoryTimeline";
import { NotesSection } from "@/components/applications/NotesSection";
import { ApiError, deleteApplication, getApplication } from "@/lib/api";
import { formatLocationSummary, formatSalaryRange } from "@/lib/format";
import type { ApplicationDetail } from "@/lib/types";

function ApplicationDetailContent({ id }: { id: string }) {
  const router = useRouter();
  const [detail, setDetail] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getApplication(id)
      .then(setDetail)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Failed to load this application.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    // Fetch-on-mount: no data-fetching library (SWR/React Query) is in scope for this MVP.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function handleDelete() {
    if (!window.confirm("Delete this application? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await deleteApplication(id);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete application.");
      setDeleting(false);
    }
  }

  if (loading) return <FullPageSpinner />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!detail) return null;

  const locationSummary = formatLocationSummary(detail) ?? detail.locationText;
  const salarySummary = formatSalaryRange(detail) ?? detail.salaryText;
  const summaryLine = [locationSummary, salarySummary].filter(Boolean).join(" · ");

  return (
    <div className="space-y-10">
      <div>
        <Link href="/dashboard" className="text-sm font-medium text-neutral-500 hover:text-neutral-900">
          ← Back to dashboard
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {detail.companyLogoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={detail.companyLogoUrl}
                alt=""
                className="h-12 w-12 shrink-0 rounded-md border border-neutral-200 bg-white object-contain"
              />
            )}
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
                {detail.jobTitle}
              </h1>
              <p className="mt-1 text-lg text-neutral-600">{detail.companyName}</p>
              {summaryLine && <p className="mt-1 text-sm text-neutral-500">{summaryLine}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={detail.currentStatus} />
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </div>
        {detail.duplicateOfId && (
          <Link
            href={`/applications/${detail.duplicateOfId}`}
            className="mt-3 inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800"
          >
            Possible repost — you tracked a similar application before ↗
          </Link>
        )}
        {detail.sourceUrl && (
          <a
            href={detail.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-neutral-900 underline underline-offset-2"
          >
            View original listing ↗
          </a>
        )}
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Details
        </h2>
        <ApplicationEditForm application={detail} onSaved={(updated) => setDetail({ ...detail, ...updated })} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Status
        </h2>
        <StatusTransitionControl
          applicationId={detail.id}
          currentStatus={detail.currentStatus}
          onUpdated={setDetail}
        />
        <div className="mt-6">
          <StatusHistoryTimeline events={detail.statusHistory} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Notes
        </h2>
        <NotesSection
          applicationId={detail.id}
          notes={detail.notes}
          onNotesChange={(notes) => setDetail({ ...detail, notes })}
        />
      </section>
    </div>
  );
}

export default function ApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  return (
    <AuthGuard>
      <AppShell>{id && <ApplicationDetailContent id={id} />}</AppShell>
    </AuthGuard>
  );
}
