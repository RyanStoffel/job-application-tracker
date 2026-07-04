// Content script entry point for the generic (non-LinkedIn, non-ATS)
// fallback parser — see content/generic-selectors.ts for the
// extraction/detection gate, and content/capture-runtime.ts for the shared
// detect/confirm/send wiring this and content/ats-detector.ts both use.
import { extractGenericListing } from "./generic-selectors";
import { runCaptureDetector } from "./capture-runtime";

runCaptureDetector(extractGenericListing, "generic");
