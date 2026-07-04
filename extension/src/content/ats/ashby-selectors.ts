// Dedicated Ashby job-posting extractor (jobs.ashbyhq.com) — see
// docs/PROJECT_PLAN.md Phase 2.
//
// Verified 2026-07-04 against a live posting (jobs.ashbyhq.com/openai/<uuid>):
//   - schema.org JobPosting JSON-LD is present and unusually complete:
//     title, hiringOrganization.name + .logo, jobLocation (structured
//     address), datePosted, and baseSalary (structured min/max/currency).
//   - No usable DOM fallback: Ashby renders with CSS-in-JS/hashed class
//     names (no stable selectors, similar to LinkedIn's SDUI markup), no
//     `<h1>`, and no `og:site_name` — so unlike the other three ATS
//     parsers there isn't a meaningful non-JSON-LD path. If JSON-LD is
//     ever missing (custom-domain Ashby embed, template change), this
//     extractor returns null rather than guess.
import type { ExtractedListing } from "../../shared/types";
import { canonicalizeListingUrl } from "../../shared/url";
import { formatSalaryFromJsonLd, readJsonLdJobPosting, readJsonLdLogoUrl } from "../json-ld";

export function extractAshbyListing(): ExtractedListing | null {
  try {
    const jsonLd = readJsonLdJobPosting();
    if (!jsonLd) return null;

    const title = jsonLd.title?.trim() || null;
    const companyName = jsonLd.hiringOrganization?.name?.trim() || null;
    if (!title || !companyName) return null;

    const locationParts = [
      jsonLd.jobLocation?.address?.addressLocality,
      jsonLd.jobLocation?.address?.addressRegion,
    ].filter(Boolean);
    const locationText = locationParts.length > 0 ? locationParts.join(", ") : null;

    const sourceUrl = canonicalizeListingUrl(window.location.href);
    if (!sourceUrl) return null;

    return {
      sourceUrl,
      companyName,
      jobTitle: title,
      locationText,
      salaryText: formatSalaryFromJsonLd(jsonLd.baseSalary),
      postedAt: jsonLd.datePosted ?? null,
      companyLogoUrl: readJsonLdLogoUrl(jsonLd.hiringOrganization?.logo),
    };
  } catch {
    // Extraction must never throw and break the host page.
    return null;
  }
}
