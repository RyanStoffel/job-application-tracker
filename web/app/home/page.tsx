"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { AppShell } from "@/components/layout/AppShell";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { StatusBreakdown } from "@/components/stats/StatusBreakdown";
import { RecentActivityFeed } from "@/components/stats/RecentActivityFeed";
import { ApiError, getStatsSummary } from "@/lib/api";
import type { StatsSummary } from "@/lib/types";

function HomeContent() {
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getStatsSummary()
      .then(setSummary)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Failed to load stats.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // Fetch-on-mount: no data-fetching library (SWR/React Query) is in scope for this MVP.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  if (loading) return <FullPageSpinner />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!summary) return null;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Home</h1>
        <p className="mt-1 text-sm text-neutral-500">Your job search at a glance.</p>
      </div>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Total applications
          </h2>
          <span className="text-4xl font-bold tracking-tight text-neutral-900">{summary.total}</span>
        </div>
        <StatusBreakdown byStatus={summary.byStatus} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Recent activity
        </h2>
        <RecentActivityFeed items={summary.recentActivity} />
      </section>
    </div>
  );
}

export default function HomePage() {
  return (
    <AuthGuard>
      <AppShell>
        <HomeContent />
      </AppShell>
    </AuthGuard>
  );
}
