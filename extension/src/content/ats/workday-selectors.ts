// Dedicated Workday job-posting extractor (*.myworkdayjobs.com) — see
// docs/PROJECT_PLAN.md Phase 2.
//
// CONFIRMED LIVE 2026-07-04: manually verified against real
// *.myworkdayjobs.com job postings (PayPal, Blue Origin, University of
// Maryland tenants) with the unpacked extension loaded in a real browser —
// the banner appeared and extracted title/company/location correctly on
// all three. Every static HTTP fetch of a Workday job page during
// development returned an almost-empty SPA shell
// (`<div id="root"></div>` plus a loader script), since the actual job
// content is rendered entirely client-side after Workday's own JS bundle
// loads — that's why this couldn't be confirmed by fetch alone and needed
// a real browser pass. The `data-automation-id` selectors below matched as
// expected on all three tenants; still worth a re-check if a Workday
// front-end redesign ever changes them, same as any other DOM-based
// parser here.
//
// Deliberately NOT scraped: `data-automation-id="postedOn"` renders a
// relative string ("Posted 30+ Days Ago"), not a parseable date — sending
// that as `postedAt` would fail the API's date validation and block the
// whole capture (see api/.../common/util/DateParsing.java), which is
// exactly what Phase 2's "degrade gracefully" constraint rules out. Only
// JSON-LD's `datePosted` (already ISO-8601 when present) is trusted for
// `postedAt`; DOM-only postings leave it null.
import type { ExtractedListing } from "../../shared/types";
import { canonicalizeListingUrl } from "../../shared/url";
import { formatSalaryFromJsonLd, readJsonLdJobPosting, readJsonLdLogoUrl } from "../json-ld";

function queryText(selector: string): string | null {
  return document.querySelector(selector)?.textContent?.trim() || null;
}

/** Workday tenants don't reliably show the company name as page text, only via the brand logo. */
function companyNameFromLogoAlt(): string | null {
  const alt = document
    .querySelector('[data-automation-id="brandLogo"] img, header img')
    ?.getAttribute("alt")
    ?.trim();
  return alt || null;
}

export function extractWorkdayListing(): ExtractedListing | null {
  try {
    const jsonLd = readJsonLdJobPosting();

    const title = jsonLd?.title?.trim() || queryText('[data-automation-id="jobPostingHeader"]');
    const companyName =
      jsonLd?.hiringOrganization?.name?.trim() ||
      document.querySelector('meta[property="og:site_name"]')?.getAttribute("content")?.trim() ||
      companyNameFromLogoAlt();

    if (!title || !companyName) return null;

    const locationParts = [
      jsonLd?.jobLocation?.address?.addressLocality,
      jsonLd?.jobLocation?.address?.addressRegion,
    ].filter(Boolean);
    const locationText =
      (locationParts.length > 0 ? locationParts.join(", ") : null) ||
      queryText('[data-automation-id="locations"]');

    const companyLogoUrl =
      readJsonLdLogoUrl(jsonLd?.hiringOrganization?.logo) ||
      document.querySelector('[data-automation-id="brandLogo"] img, header img')?.getAttribute("src") ||
      null;

    const sourceUrl = canonicalizeListingUrl(window.location.href);
    if (!sourceUrl) return null;

    return {
      sourceUrl,
      companyName,
      jobTitle: title,
      locationText: locationText || null,
      salaryText: formatSalaryFromJsonLd(jsonLd?.baseSalary),
      // Never derived from data-automation-id="postedOn" — see file header.
      postedAt: jsonLd?.datePosted ?? null,
      companyLogoUrl,
    };
  } catch {
    // Extraction must never throw and break the host page.
    return null;
  }
}
