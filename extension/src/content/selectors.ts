// LinkedIn job listing extraction.
//
// *** IMPORTANT — READ BEFORE "FIXING" A SELECTOR ***
// LinkedIn's DOM structure and CSS class names change frequently and are
// not a stable public API. Every selector list below is a best-effort
// guess based on publicly documented/observed LinkedIn markup patterns at
// the time this was written, NOT verified against a live page (this
// extension was built in an environment without browser access to
// linkedin.com). Treat every selector as likely to need real-world
// tuning — see docs/AGENTS.md "Notes for Extension Work" and
// extension/README.md.
//
// Strategy (in priority order, first non-empty match wins per field):
//   1. JSON-LD `application/ld+json` block with `@type: "JobPosting"`,
//      which LinkedIn (and most job boards) sometimes embed for SEO. This
//      is the most structured/reliable source when present.
//   2. `<meta>` tags (og:title etc.), which are more stable than CSS
//      classes but only give us title/description, not structured fields.
//   3. A prioritized chain of CSS selectors for the visible DOM, from most
//      to least specific, so a redesign that removes one class doesn't
//      break extraction entirely.
//
// Extraction never throws: every helper returns `null` on failure so the
// caller can decide whether the minimum required fields (title, company,
// url) are present before showing the "Add to tracker?" prompt.

import type { ExtractedListing } from "../shared/types";
import { canonicalizeListingUrl, extractJobId } from "../shared/url";
import { formatSalaryFromJsonLd, readJsonLdJobPosting, readJsonLdLogoUrl } from "./json-ld";

function queryText(selectors: string[], root: ParentNode = document): string | null {
  for (const selector of selectors) {
    try {
      const el = root.querySelector(selector);
      const text = el?.textContent?.trim();
      if (text) return text;
    } catch {
      // Invalid/unsupported selector on this LinkedIn build — skip it.
      continue;
    }
  }
  return null;
}

function queryAttr(selectors: string[], attr: string, root: ParentNode = document): string | null {
  for (const selector of selectors) {
    try {
      const el = root.querySelector(selector);
      const value = el?.getAttribute(attr)?.trim();
      if (value) return value;
    } catch {
      continue;
    }
  }
  return null;
}

// --- Primary + fallback DOM selector chains --------------------------------
// Ordered roughly from "current unified top-card layout" guesses down to
// generic/legacy fallbacks. Root scope is either `document` (standalone
// /jobs/view/ page) or the active detail-panel container (search/collections
// pages), passed in by the caller.
//
// CONFIRMED LIVE 2026-07-03: the entire job details module is server-driven
// UI with fully hashed/atomic CSS class names (e.g. `_3293afb7`, `e6590096`)
// that carry no semantic meaning and will almost certainly change on any
// LinkedIn deploy — none of the classic class-name guesses below matched,
// including plain `h1` (the title isn't even a heading tag, it's a `<p>`
// wrapping an `<a>` in some layouts). The only durable-looking anchors found
// were the `data-sdui-screen` attribute identifying this screen/module and
// `a[href*='/company/']` for the employer link. Selectors scoped to
// `SDUI_JOB_DETAILS_SCOPE` are listed first since they're verified against
// the live site; everything else is an unverified guess kept as a fallback
// in case a different LinkedIn build/experiment serves non-SDUI markup.
//
// The `data-sdui-screen` VALUE isn't consistent across layouts, though —
// confirmed two distinct values live: `com.linkedin.sdui.flagshipnav.jobs.
// JobDetails` on the standalone /jobs/view/ page, and `com.linkedin.sdui.
// flagshipnav.jobs.SemanticJobDetails` on the /jobs/search-results/
// split-pane layout. Rather than enumerate every variant (and break again on
// the next one), match on the `JobDetails` substring both share.
const SDUI_JOB_DETAILS_SCOPE = '[data-sdui-screen*="JobDetails"]';

const TITLE_SELECTORS = [
  `${SDUI_JOB_DETAILS_SCOPE} p`,
  "h1.job-details-jobs-unified-top-card__job-title",
  ".job-details-jobs-unified-top-card__job-title-link",
  "h1.top-card-layout__title",
  "h1.topcard__title",
  "[data-test-job-title]",
  "h1",
];

const COMPANY_SELECTORS = [
  `${SDUI_JOB_DETAILS_SCOPE} a[href*='/company/']`,
  ".job-details-jobs-unified-top-card__company-name a",
  ".job-details-jobs-unified-top-card__company-name",
  ".jobs-unified-top-card__company-name a",
  ".jobs-unified-top-card__company-name",
  ".topcard__org-name-link",
  ".topcard__flavor--black-link",
  "[data-test-employer-name]",
  "a[href*='/company/']",
];

const LOCATION_SELECTORS = [
  ".job-details-jobs-unified-top-card__primary-description-container .tvm__text",
  ".job-details-jobs-unified-top-card__bullet",
  ".jobs-unified-top-card__bullet",
  ".topcard__flavor--bullet",
  "[data-test-job-location]",
];

const SALARY_SELECTORS = [
  ".job-details-jobs-unified-top-card__job-insight--highlight",
  ".job-details-preferences-and-skills__pill",
  ".jobs-unified-top-card__salary",
  ".salary",
  "[data-test-salary-info]",
];

// No og:image fallback for the logo — that's LinkedIn's own share image, not
// the company's actual logo, so a wrong guess is worse than leaving it null.
const COMPANY_LOGO_SELECTORS = [
  `${SDUI_JOB_DETAILS_SCOPE} a[href*='/company/'] img`,
  ".job-details-jobs-unified-top-card__company-logo img",
  ".jobs-unified-top-card__company-logo img",
  "a[href*='/company/'] img",
];

const CANONICAL_LINK_SELECTORS = ["link[rel='canonical']"];

const META_TITLE_SELECTORS = ["meta[property='og:title']", "meta[name='title']"];

/**
 * Split a combined "{Job Title} hiring at {Company} | LinkedIn"-style
 * og:title (LinkedIn's actual pattern has varied over time) into title +
 * company as a last-resort fallback when no structured data is found.
 */
export function splitCombinedTitle(raw: string): { title: string | null; company: string | null } {
  const hiringAtMatch = raw.match(/^(.*?)\s+hiring\s+at\s+(.*?)(\s*\|.*)?$/i);
  if (hiringAtMatch) {
    return { title: hiringAtMatch[1]?.trim() ?? null, company: hiringAtMatch[2]?.trim() ?? null };
  }
  const dashMatch = raw.match(/^(.*?)\s+[-|]\s+(.*?)(\s*\|.*)?$/);
  if (dashMatch) {
    return { title: dashMatch[1]?.trim() ?? null, company: dashMatch[2]?.trim() ?? null };
  }
  return { title: null, company: null };
}

/**
 * Promoted/sponsored listings have been observed live (2026-07-03) to
 * render the company name as the first paragraph in the SDUI job details
 * scope instead of the title — breaking the "first paragraph is the title"
 * assumption `TITLE_SELECTORS` relies on for organic listings, and causing
 * title and company to come back identical (e.g. "Amazon · Amazon"). When
 * that collision happens, look for the next paragraph in the same scope
 * whose text isn't just the company name again.
 */
export function findAlternateSduiParagraph(scope: ParentNode, excludeText: string): string | null {
  const paragraphs = scope.querySelectorAll(`${SDUI_JOB_DETAILS_SCOPE} p`);
  for (const p of paragraphs) {
    const text = p.textContent?.trim();
    if (text && text !== excludeText) return text;
  }
  return null;
}

// Segments that show up in the same bullet-separated meta line as location
// (see extractLocationFromMetaLine below) but aren't a location — skip these
// as candidates rather than trusting positional order, since the exact
// segment order/count varies (e.g. promoted listings drop the applicant count).
const META_LINE_NON_LOCATION_PATTERN = /\bago\b|clicked apply|\bapplicants?\b|promoted|\beasy apply\b/i;

/**
 * CONFIRMED LIVE 2026-07-04: the top-card metadata line (e.g. "Salt Lake
 * City Metropolitan Area · 6 days ago · Over 100 people clicked apply") is a
 * `<p>` whose direct children are `<span>` segments separated by small
 * "· " spacer spans — but like the title/company paragraphs, its own class
 * names are the same hashed/atomic soup used all over this page, so they're
 * not a usable selector. What *is* durable is the shape: a `<p>` with
 * several non-trivial `<span>` children. Location is whichever segment
 * doesn't look like a relative-time/applicant-count/promoted string, found
 * by content rather than by position, since segment order/count varies.
 */
export function extractLocationFromMetaLine(scope: ParentNode): string | null {
  const paragraphs = scope.querySelectorAll(`${SDUI_JOB_DETAILS_SCOPE} p`);
  for (const p of paragraphs) {
    const segments = Array.from(p.querySelectorAll(":scope > span"))
      .map((span) => span.textContent?.trim() ?? "")
      .filter((text) => text.length > 1);
    if (segments.length < 2) continue;

    const candidate = segments.find((text) => !META_LINE_NON_LOCATION_PATTERN.test(text));
    if (candidate) return candidate;
  }
  return null;
}

const CURRENCY_AMOUNT_PATTERN = /[$£€]\s?\d[\d,]*(\.\d+)?/;

/**
 * CONFIRMED LIVE 2026-07-04: salary sometimes renders as a short "insight
 * pill" near the top of the job details (e.g. "$25/hr - $25/hr", alongside
 * an "On-site"/"Remote" pill) rather than in a dedicated, selectable salary
 * element. Scan short `<span>`/`<a>` text nodes in the scope for a
 * currency-amount pattern. The length cap keeps this from matching the much
 * longer "About the job" body text, which is what's normally rendered as one
 * long span rather than many short ones.
 */
export function findSalaryBubbleText(scope: ParentNode): string | null {
  const candidates = scope.querySelectorAll(`${SDUI_JOB_DETAILS_SCOPE} span, ${SDUI_JOB_DETAILS_SCOPE} a`);
  for (const el of candidates) {
    const text = el.textContent?.trim() ?? "";
    if (text.length > 0 && text.length <= 40 && CURRENCY_AMOUNT_PATTERN.test(text)) {
      return text;
    }
  }
  return null;
}

/**
 * Extract listing data from the current page. `scope` lets callers pass the
 * active job detail panel element on search/collections pages instead of
 * the whole document; defaults to `document` for standalone listing pages.
 *
 * Returns `null` (never throws) if the minimum required fields — title,
 * company, and a usable URL — can't be determined.
 */
export function extractListingFromPage(scope: ParentNode = document): ExtractedListing | null {
  try {
    const jsonLd = readJsonLdJobPosting();

    let title = jsonLd?.title?.trim() || queryText(TITLE_SELECTORS, scope);
    let company = jsonLd?.hiringOrganization?.name?.trim() || queryText(COMPANY_SELECTORS, scope);

    if (!title || !company) {
      const metaTitle = queryAttr(META_TITLE_SELECTORS, "content", document);
      if (metaTitle) {
        const split = splitCombinedTitle(metaTitle);
        title = title || split.title;
        company = company || split.company;
      }
    }

    if (title && company && title === company) {
      const alternate = findAlternateSduiParagraph(scope, company);
      console.log("[job-tracker] title/company collision, retrying", { title, company, alternate });
      if (alternate) title = alternate;
    }

    if (!title || !company) {
      console.log("[job-tracker] extraction missing required fields", { title, company });
      return null;
    }

    const locationParts = [
      jsonLd?.jobLocation?.address?.addressLocality,
      jsonLd?.jobLocation?.address?.addressRegion,
    ].filter(Boolean);
    const locationText =
      (locationParts.length > 0 ? locationParts.join(", ") : null) ||
      queryText(LOCATION_SELECTORS, scope) ||
      extractLocationFromMetaLine(scope);

    const companyLogoUrl = readJsonLdLogoUrl(jsonLd?.hiringOrganization?.logo)
      || queryAttr(COMPANY_LOGO_SELECTORS, "src", scope);

    const salaryText =
      formatSalaryFromJsonLd(jsonLd?.baseSalary) ||
      queryText(SALARY_SELECTORS, scope) ||
      findSalaryBubbleText(scope);

    const canonicalHref = queryAttr(CANONICAL_LINK_SELECTORS, "href", document);
    const rawUrl = canonicalHref || window.location.href;
    const jobId = extractJobId(rawUrl) ?? extractJobId(window.location.href);
    const sourceUrl = jobId
      ? `https://www.linkedin.com/jobs/view/${jobId}/`
      : canonicalizeListingUrl(rawUrl);

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
    // Extraction must never throw and break the host page — just skip the
    // prompt for this listing if anything goes wrong.
    return null;
  }
}
