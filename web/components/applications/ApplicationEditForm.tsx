"use client";

import { useState, type FormEvent } from "react";
import { ApiError, updateApplication } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { InlineError } from "@/components/ui/ErrorState";
import { toDateInputValue } from "@/lib/format";
import type { Application } from "@/lib/types";

export function ApplicationEditForm({
  application,
  onSaved,
}: {
  application: Application;
  onSaved: (application: Application) => void;
}) {
  const [companyName, setCompanyName] = useState(application.companyName);
  const [jobTitle, setJobTitle] = useState(application.jobTitle);
  const [locationText, setLocationText] = useState(application.locationText ?? "");
  const [salaryText, setSalaryText] = useState(application.salaryText ?? "");
  const [appliedAt, setAppliedAt] = useState(toDateInputValue(application.appliedAt));
  const [postedAt, setPostedAt] = useState(toDateInputValue(application.postedAt));
  const [companyLogoUrl, setCompanyLogoUrl] = useState(application.companyLogoUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const dirty =
    companyName !== application.companyName ||
    jobTitle !== application.jobTitle ||
    locationText !== (application.locationText ?? "") ||
    salaryText !== (application.salaryText ?? "") ||
    appliedAt !== toDateInputValue(application.appliedAt) ||
    postedAt !== toDateInputValue(application.postedAt) ||
    companyLogoUrl !== (application.companyLogoUrl ?? "");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      const updated = await updateApplication(application.id, {
        companyName: companyName.trim(),
        jobTitle: jobTitle.trim(),
        locationText: locationText.trim() || null,
        salaryText: salaryText.trim() || null,
        appliedAt: appliedAt || null,
        postedAt: postedAt || null,
        companyLogoUrl: companyLogoUrl.trim() || null,
      });
      onSaved(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save changes.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <InlineError message={error} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-semibold text-neutral-900">Company</label>
          <input
            required
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="mt-1.5 block w-full rounded-md px-3 py-2 text-sm text-neutral-900 ring-1 ring-inset ring-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-neutral-900">Title</label>
          <input
            required
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            className="mt-1.5 block w-full rounded-md px-3 py-2 text-sm text-neutral-900 ring-1 ring-inset ring-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>
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
          <label className="block text-sm font-semibold text-neutral-900">Posted on</label>
          <input
            type="date"
            value={postedAt}
            onChange={(e) => setPostedAt(e.target.value)}
            className="mt-1.5 block w-full rounded-md px-3 py-2 text-sm text-neutral-900 ring-1 ring-inset ring-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-neutral-900">Company logo URL</label>
          <input
            type="url"
            value={companyLogoUrl}
            onChange={(e) => setCompanyLogoUrl(e.target.value)}
            placeholder="https://…"
            className="mt-1.5 block w-full rounded-md px-3 py-2 text-sm text-neutral-900 ring-1 ring-inset ring-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={!dirty || submitting} variant="secondary">
          {submitting ? "Saving…" : "Save changes"}
        </Button>
        {success && <span className="text-sm font-medium text-emerald-600">Saved</span>}
      </div>
    </form>
  );
}
