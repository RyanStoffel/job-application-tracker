// Generic fallback job-listing extraction for sites that aren't LinkedIn
// (see content/linkedin-detector.ts / content/selectors.ts) and don't yet
// have a dedicated parser (Greenhouse/Lever/Workday/Ashby are tracked as
// Phase 2 follow-ups in docs/PROJECT_PLAN.md). Runs on `<all_urls>` (see
// manifest.json), so it is intentionally conservative: cheap to check, and
// gated so it only activates on pages that plausibly look like a job
// posting rather than firing on arbitrary pages.
//
// Strategy, in priority order:
//   1. schema.org `JobPosting` JSON-LD — most hosted ATS platforms and many
//      company career pages embed this for SEO; it's the most reliable
//      source when present (see content/json-ld.ts, shared with the
//      LinkedIn extractor).
//   2. Conservative meta-tag/DOM heuristics (og:title/h1 for title,
//      og:site_name for company) — no raw DOM-text scraping on arbitrary
//      sites, since that's too noisy/risky when we don't control the page.

import type { ExtractedListing } from "../shared/types";
import { canonicalizeListingUrl } from "../shared/url";
import { formatSalaryFromJsonLd, readJsonLdJobPosting, readJsonLdLogoUrl } from "./json-ld";

const JOB_URL_PATTERN = /\/(job|jobs|career|careers|position|posting|vacancy|vacancies)(\/|$)/i;

function queryAttr(selectors: string[], attr: string): string | null {
  for (const selector of selectors) {
    try {
      const el = document.querySelector(selector);
      const value = el?.getAttribute(attr)?.trim();
      if (value) return value;
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Cheap check for whether this page is plausibly a job listing at all,
 * before doing any real extraction work. Only a JobPosting JSON-LD block
 * unconditionally qualifies; a job-shaped URL additionally requires a
 * title signal (og:title or an h1) so we don't fire on e.g. a careers
 * landing page that just links out to individual postings.
 */
export function looksLikeJobPosting(): boolean {
  if (readJsonLdJobPosting()) return true;
  if (!JOB_URL_PATTERN.test(window.location.pathname)) return false;
  return Boolean(queryAttr(["meta[property='og:title']"], "content") || document.querySelector("h1"));
}

export function extractGenericListing(): ExtractedListing | null {
  try {
    if (!looksLikeJobPosting()) return null;

    const jsonLd = readJsonLdJobPosting();

    const title =
      jsonLd?.title?.trim() ||
      queryAttr(["meta[property='og:title']"], "content") ||
      document.querySelector("h1")?.textContent?.trim() ||
      null;

    const company =
      jsonLd?.hiringOrganization?.name?.trim() ||
      queryAttr(["meta[property='og:site_name']"], "content") ||
      null;

    if (!title || !company) {
      console.log("[job-tracker] generic extraction missing required fields", { title, company });
      return null;
    }

    const locationParts = [
      jsonLd?.jobLocation?.address?.addressLocality,
      jsonLd?.jobLocation?.address?.addressRegion,
    ].filter(Boolean);
    const locationText = locationParts.length > 0 ? locationParts.join(", ") : null;

    const salaryText = formatSalaryFromJsonLd(jsonLd?.baseSalary);

    // No DOM fallback for the logo on arbitrary sites (e.g. a favicon isn't
    // reliably the employer's logo) — only trust the structured JSON-LD value.
    const companyLogoUrl = readJsonLdLogoUrl(jsonLd?.hiringOrganization?.logo);

    const sourceUrl = canonicalizeListingUrl(window.location.href);
    if (!sourceUrl) return null;

    return {
      sourceUrl,
      companyName: company,
      jobTitle: title,
      locationText: locationText || null,
      salaryText: salaryText || null,
      postedAt: jsonLd?.datePosted ?? null,
      companyLogoUrl: companyLogoUrl || null,
    };
  } catch {
    // Extraction must never throw and break the host page.
    return null;
  }
}
