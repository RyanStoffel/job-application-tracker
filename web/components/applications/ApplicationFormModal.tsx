"use client";

import { useState, type FormEvent } from "react";
import { ApiError, createApplication } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { InlineError } from "@/components/ui/ErrorState";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/status";
import type { Application, Status } from "@/lib/types";

interface Props {
  onClose: () => void;
  onCreated: (application: Application) => void;
}

export function ApplicationFormModal({ onClose, onCreated }: Props) {
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [locationText, setLocationText] = useState("");
  const [salaryText, setSalaryText] = useState("");
  const [appliedAt, setAppliedAt] = useState("");
  const [currentStatus, setCurrentStatus] = useState<Status>("saved");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const created = await createApplication({
        companyName: companyName.trim(),
        jobTitle: jobTitle.trim(),
        sourceUrl: sourceUrl.trim() || null,
        locationText: locationText.trim() || null,
        salaryText: salaryText.trim() || null,
        appliedAt: appliedAt || null,
        currentStatus,
      });
      onCreated(created);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create application.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 px-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-neutral-900">Add application</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <InlineError message={error} />}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-neutral-900">Company *</label>
              <input
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="mt-1.5 block w-full rounded-md px-3 py-2 text-sm text-neutral-900 ring-1 ring-inset ring-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-neutral-900">Title *</label>
              <input
                required
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="mt-1.5 block w-full rounded-md px-3 py-2 text-sm text-neutral-900 ring-1 ring-inset ring-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-900">Listing URL</label>
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://…"
              className="mt-1.5 block w-full rounded-md px-3 py-2 text-sm text-neutral-900 ring-1 ring-inset ring-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-neutral-900">Location</label>
              <input
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
                className="mt-1.5 block w-full rounded-md px-3 py-2 text-sm text-neutral-900 ring-1 ring-inset ring-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-neutral-900">Salary</label>
              <input
                value={salaryText}
                onChange={(e) => setSalaryText(e.target.value)}
                className="mt-1.5 block w-full rounded-md px-3 py-2 text-sm text-neutral-900 ring-1 ring-inset ring-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-neutral-900">Applied on</label>
              <input
                type="date"
                value={appliedAt}
                onChange={(e) => setAppliedAt(e.target.value)}
                className="mt-1.5 block w-full rounded-md px-3 py-2 text-sm text-neutral-900 ring-1 ring-inset ring-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-neutral-900">Status</label>
              <select
                value={currentStatus}
                onChange={(e) => setCurrentStatus(e.target.value as Status)}
                className="mt-1.5 block w-full rounded-md px-3 py-2 text-sm text-neutral-900 ring-1 ring-inset ring-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              >
                {STATUS_ORDER.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABEL[status]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Adding…" : "Add application"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
