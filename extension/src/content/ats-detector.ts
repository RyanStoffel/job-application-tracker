// Content script entry point for the dedicated ATS parsers (Greenhouse,
// Lever, Workday, Ashby — see docs/PROJECT_PLAN.md Phase 2). Picks the
// right extractor for the current hostname and hands it to the same
// detect/confirm/send runtime the generic fallback uses (see
// content/capture-runtime.ts) — manifest.json scopes this script's
// `matches` to exactly these four domains, and excludes them from the
// generic fallback's `<all_urls>` block so only one detector runs per page.
import { extractGreenhouseListing } from "./ats/greenhouse-selectors";
import { extractLeverListing } from "./ats/lever-selectors";
import { extractWorkdayListing } from "./ats/workday-selectors";
import { extractAshbyListing } from "./ats/ashby-selectors";
import { runCaptureDetector } from "./capture-runtime";
import type { ExtractedListing } from "../shared/types";

function pickExtractor(): (() => ExtractedListing | null) | null {
  const host = window.location.hostname;
  if (/(^|\.)greenhouse\.io$/.test(host)) return extractGreenhouseListing;
  if (/(^|\.)lever\.co$/.test(host)) return extractLeverListing;
  if (/\.myworkdayjobs\.com$/.test(host)) return extractWorkdayListing;
  if (/(^|\.)ashbyhq\.com$/.test(host)) return extractAshbyListing;
  return null;
}

const extractor = pickExtractor();
if (extractor) runCaptureDetector(extractor, "ats");
