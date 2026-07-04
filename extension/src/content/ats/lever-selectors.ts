// Dedicated Lever job-posting extractor (jobs.lever.co) — see
// docs/PROJECT_PLAN.md Phase 2.
//
// Verified 2026-07-04 against a live posting
// (jobs.lever.co/palantir/<uuid>):
//   - schema.org JobPosting JSON-LD is present and rich: title,
//     hiringOrganization.name + .logo, jobLocation, datePosted. No
//     baseSalary observed on the sampled posting.
//   - DOM fallback (server-rendered, not a SPA): `.posting-headline h2`
//     for title, `.posting-categories .posting-category.location` for
//     location, `.main-header-logo img` for both the logo (`src`) and the
//     company name (`alt`, formatted as "{Company} logo").
import type { ExtractedListing } from "../../shared/types";
import { canonicalizeListingUrl } from "../../shared/url";
import { formatSalaryFromJsonLd, readJsonLdJobPosting, readJsonLdLogoUrl } from "../json-ld";

function queryText(selector: string): string | null {
  return document.querySelector(selector)?.textContent?.trim() || null;
}

/** Lever's header logo alt text is consistently "{Company} logo". */
function companyNameFromLogoAlt(): string | null {
  const alt = document.querySelector(".main-header-logo img")?.getAttribute("alt")?.trim();
  if (!alt) return null;
  return alt.replace(/\s+logo$/i, "").trim() || null;
}

export function extractLeverListing(): ExtractedListing | null {
  try {
    const jsonLd = readJsonLdJobPosting();

    const title = jsonLd?.title?.trim() || queryText(".posting-headline h2");
    const companyName = jsonLd?.hiringOrganization?.name?.trim() || companyNameFromLogoAlt();

    if (!title || !companyName) return null;

    const locationParts = [
      jsonLd?.jobLocation?.address?.addressLocality,
      jsonLd?.jobLocation?.address?.addressRegion,
    ].filter(Boolean);
    const locationText =
      (locationParts.length > 0 ? locationParts.join(", ") : null) ||
      queryText(".posting-categories .location");

    const companyLogoUrl =
      readJsonLdLogoUrl(jsonLd?.hiringOrganization?.logo) ||
      document.querySelector(".main-header-logo img")?.getAttribute("src") ||
      null;

    const salaryText = formatSalaryFromJsonLd(jsonLd?.baseSalary);

    const sourceUrl = canonicalizeListingUrl(window.location.href);
    if (!sourceUrl) return null;

    return {
      sourceUrl,
      companyName,
      jobTitle: title,
      locationText: locationText || null,
      salaryText,
      postedAt: jsonLd?.datePosted ?? null,
      companyLogoUrl,
    };
  } catch {
    // Extraction must never throw and break the host page.
    return null;
  }
}
