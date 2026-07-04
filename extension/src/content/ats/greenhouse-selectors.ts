// Dedicated Greenhouse job-posting extractor (boards.greenhouse.io and
// job-boards.greenhouse.io) — see docs/PROJECT_PLAN.md Phase 2.
//
// Verified 2026-07-04 against live postings on job-boards.greenhouse.io
// (the current React/Remix job-board template — e.g. job-boards.greenhouse.io/gitlab/jobs/<id>):
//   - No schema.org JobPosting JSON-LD on this template.
//   - The page embeds a `window.__remixContext` state blob. One entry of
//     `state.loaderData` (keyed by a dynamic Remix route id, so we scan
//     values rather than hardcode the key) has a `jobPost` object with
//     `title`, `company_name`, `job_post_location`, `published_at`,
//     `pay_ranges`, `public_url` — richer and more reliable than anything
//     in the DOM, so it's tried first.
//   - `boardConfiguration.logo.url` (on the `root` loader entry) is the
//     company logo.
//   - Fallback (older/custom templates, or if the blob shape changes):
//     the `<title>` tag reliably follows "Job Application for {title} at
//     {company}", and `og:description` reliably holds the location
//     summary on this template (confirmed across multiple companies) —
//     NOT a real description, which only lives in the loader data.
// Classic `boards.greenhouse.io` template (pre-Remix migration) was not
// found live on any board sampled during this work (all sampled companies
// had already migrated or redirect to a custom-branded career site that
// embeds Greenhouse via its own API) — the JSON-LD/DOM fallback below is
// untested against that older template specifically.
import type { ExtractedListing } from "../../shared/types";
import { canonicalizeListingUrl } from "../../shared/url";
import { readJsonLdJobPosting, readJsonLdLogoUrl } from "../json-ld";

interface GreenhousePayRange {
  min?: string;
  max?: string;
}

interface GreenhouseJobPost {
  title?: string;
  company_name?: string;
  job_post_location?: string;
  published_at?: string;
  pay_ranges?: GreenhousePayRange[];
}

interface GreenhouseLoaderEntry {
  jobPost?: GreenhouseJobPost;
  boardConfiguration?: { logo?: { url?: string } };
}

function readRemixContext(): Record<string, GreenhouseLoaderEntry> | null {
  const ctx = (window as unknown as { __remixContext?: { state?: { loaderData?: unknown } } }).__remixContext;
  const loaderData = ctx?.state?.loaderData;
  if (!loaderData || typeof loaderData !== "object") return null;
  return loaderData as Record<string, GreenhouseLoaderEntry>;
}

function findJobPost(loaderData: Record<string, GreenhouseLoaderEntry>): GreenhouseJobPost | null {
  for (const entry of Object.values(loaderData)) {
    if (entry?.jobPost) return entry.jobPost;
  }
  return null;
}

function findLogoUrl(loaderData: Record<string, GreenhouseLoaderEntry>): string | null {
  for (const entry of Object.values(loaderData)) {
    const url = entry?.boardConfiguration?.logo?.url;
    if (url) return url;
  }
  return null;
}

function formatPayRange(payRanges: GreenhousePayRange[] | undefined): string | null {
  const range = payRanges?.[0];
  if (!range?.min && !range?.max) return null;
  if (range.min && range.max && range.min !== range.max) return `${range.min} - ${range.max}`;
  return range.min ?? range.max ?? null;
}

/** "Job Application for {title} at {company}" — this template's <title> tag. */
function splitTitleTag(raw: string): { title: string | null; company: string | null } {
  const match = raw.match(/^(?:Job Application for\s+)?(.+?)\s+at\s+(.+)$/i);
  if (!match) return { title: null, company: null };
  return { title: match[1]?.trim() ?? null, company: match[2]?.trim() ?? null };
}

export function extractGreenhouseListing(): ExtractedListing | null {
  try {
    const loaderData = readRemixContext();
    const jobPost = loaderData ? findJobPost(loaderData) : null;

    let title = jobPost?.title?.trim() || null;
    let companyName = jobPost?.company_name?.trim() || null;
    let locationText = jobPost?.job_post_location?.trim() || null;
    let postedAt = jobPost?.published_at || null;
    let salaryText = formatPayRange(jobPost?.pay_ranges);
    let companyLogoUrl = loaderData ? findLogoUrl(loaderData) : null;

    const jsonLd = readJsonLdJobPosting();
    title = title || jsonLd?.title?.trim() || null;
    companyName = companyName || jsonLd?.hiringOrganization?.name?.trim() || null;
    companyLogoUrl = companyLogoUrl || readJsonLdLogoUrl(jsonLd?.hiringOrganization?.logo);

    if (!title || !companyName) {
      const titleTag = document.querySelector("title")?.textContent?.trim();
      if (titleTag) {
        const split = splitTitleTag(titleTag);
        title = title || split.title;
        companyName = companyName || split.company;
      }
    }
    locationText = locationText || document.querySelector('meta[property="og:description"]')?.getAttribute("content")?.trim() || null;

    if (!title || !companyName) return null;

    const sourceUrl = canonicalizeListingUrl(window.location.href);
    if (!sourceUrl) return null;

    return {
      sourceUrl,
      companyName,
      jobTitle: title,
      locationText,
      salaryText,
      postedAt,
      companyLogoUrl,
    };
  } catch {
    // Extraction must never throw and break the host page.
    return null;
  }
}
