"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { AppShell } from "@/components/layout/AppShell";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { ApplicationFilters } from "@/components/applications/ApplicationFilters";
import { ApplicationsTable } from "@/components/applications/ApplicationsTable";
import { ApplicationFormModal } from "@/components/applications/ApplicationFormModal";
import { ApiError, listApplications } from "@/lib/api";
import type { Application, ListApplicationsParams } from "@/lib/types";

function DashboardContent() {
  const [applications, setApplications] = useState<Application[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<ListApplicationsParams["status"] | "">("");
  const [sort, setSort] = useState<NonNullable<ListApplicationsParams["sort"]>>("-createdAt");

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    listApplications({ q: q || undefined, status: status || undefined, sort })
      .then(setApplications)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Failed to load applications.");
      })
      .finally(() => setLoading(false));
  }, [q, status, sort]);

  useEffect(() => {
    const handle = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, sort]);

  const hasFilters = Boolean(q || status);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Dashboard</h1>
          <p className="mt-1 text-sm text-neutral-500">All of your tracked applications.</p>
        </div>
        <Button onClick={() => setShowForm(true)}>Add application</Button>
      </div>

      <ApplicationFilters
        q={q}
        onQChange={setQ}
        status={status}
        onStatusChange={setStatus}
        sort={sort}
        onSortChange={setSort}
      />

      {loading && <FullPageSpinner />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && applications && applications.length === 0 && !hasFilters && (
        <EmptyState
          title="No applications yet"
          description="Start tracking your job search by adding your first application."
          action={<Button onClick={() => setShowForm(true)}>Add application</Button>}
        />
      )}
      {!loading && !error && applications && applications.length === 0 && hasFilters && (
        <EmptyState
          title="No matching applications"
          description="Try adjusting your search or filters."
        />
      )}
      {!loading && !error && applications && applications.length > 0 && (
        <ApplicationsTable applications={applications} />
      )}

      {showForm && (
        <ApplicationFormModal
          onClose={() => setShowForm(false)}
          onCreated={(created) => {
            setShowForm(false);
            setApplications((prev) => (prev ? [created, ...prev] : [created]));
          }}
        />
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <AppShell>
        <DashboardContent />
      </AppShell>
    </AuthGuard>
  );
}
