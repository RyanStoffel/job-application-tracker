"use client";

import { useState, type FormEvent } from "react";
import { ApiError, setApplicationStatus } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { InlineError } from "@/components/ui/ErrorState";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/status";
import type { ApplicationDetail, Status } from "@/lib/types";

interface Props {
  applicationId: string;
  currentStatus: Status;
  onUpdated: (detail: ApplicationDetail) => void;
}

export function StatusTransitionControl({ applicationId, currentStatus, onUpdated }: Props) {
  const [nextStatus, setNextStatus] = useState<Status>(currentStatus);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const detail = await setApplicationStatus(applicationId, {
        status: nextStatus,
        note: note.trim() || null,
      });
      onUpdated(detail);
      setNote("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update status.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <InlineError message={error} />}
      <div className="flex flex-col gap-3 sm:flex-row">
        <select
          value={nextStatus}
          onChange={(e) => setNextStatus(e.target.value as Status)}
          className="rounded-md px-3 py-2 text-sm text-neutral-900 ring-1 ring-inset ring-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900"
        >
          {STATUS_ORDER.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABEL[status]}
            </option>
          ))}
        </select>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note for this change (optional)"
          className="flex-1 rounded-md px-3 py-2 text-sm text-neutral-900 ring-1 ring-inset ring-neutral-300 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900"
        />
        <Button type="submit" disabled={submitting || nextStatus === currentStatus}>
          {submitting ? "Updating…" : "Update status"}
        </Button>
      </div>
    </form>
  );
}
