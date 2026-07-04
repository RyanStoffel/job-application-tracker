// Content script entry point. Runs on LinkedIn job listing pages
// (standalone /jobs/view/*) and the jobs search/collections pages where a
// listing is shown in a side detail panel.
//
// LinkedIn's search/collections pages are a single-page app: selecting a
// different job card updates the URL (via history.pushState/replaceState,
// typically a `currentJobId` query param — see shared/url.ts) and swaps the
// detail panel content without a full page navigation. A plain
// "run once at document_idle" content script would miss every listing after
// the first, so this watches for both URL changes and DOM mutations and
// re-runs detection whenever the effective listing changes.
import { extractListingFromPage } from "./selectors";
import { renderPrompt, removeBanner, type PromptState } from "./prompt";
import { canonicalizeListingUrl } from "../shared/url";
import type { ExtractedListing } from "../shared/types";
import type { ExtensionMessage, AddListingResponse } from "../shared/messages";

// Candidate containers for the detail panel on /jobs/search and
// /jobs/collections pages. Best-effort/unverified against the live site —
// see extension/README.md. Falls back to `document` (whole page) if none
// match, which still works for standalone /jobs/view/ pages and is a safe
// no-worse-than-before fallback elsewhere.
const DETAIL_PANEL_SELECTORS = [
  ".jobs-search__job-details--container",
  ".jobs-details__main-content",
  ".jobs-search__right-rail",
  ".scaffold-layout__detail",
];

function getDetailScope(): ParentNode {
  for (const selector of DETAIL_PANEL_SELECTORS) {
    const el = document.querySelector(selector);
    if (el) return el;
  }
  return document;
}

// Per-tab-session tracking of listings the user already acted on, keyed by
// canonical URL, so the same listing doesn't re-prompt repeatedly while the
// user stays on the page. In-memory is sufficient here (module state
// persists for the lifetime of this content script instance, i.e. until the
// tab navigates to a fresh document) — see docs/ARCHITECTURE.md and the
// task's "per-tab-session" requirement.
//
// Two separate sets because they mean different things: dismissing a
// listing should stop the confirm banner from re-appearing, but shouldn't
// stop a later Apply-button click from still auto-adding it — clicking
// Apply is a stronger, more explicit signal than an earlier dismiss.
const promptHandled = new Set<string>(); // dismissed OR added — suppresses the confirm banner
const addedUrls = new Set<string>(); // successfully persisted — prevents duplicate auto-add sends

let currentCanonicalUrl: string | null = null;
let currentListing: ExtractedListing | null = null;
let pollHandle: number | null = null;

function getCurrentCanonicalUrl(): string {
  return canonicalizeListingUrl(window.location.href);
}

function stopPolling(): void {
  if (pollHandle !== null) {
    window.clearInterval(pollHandle);
    pollHandle = null;
  }
}

/**
 * LinkedIn loads listing details asynchronously (client-side fetch after
 * navigation), so the DOM may not have the job title/company yet the
 * instant the URL changes. Poll briefly instead of relying on a single
 * MutationObserver tick, since observer callbacks fire before content has
 * settled just as often as after.
 */
function pollForListing(canonicalUrl: string, attemptsLeft: number): void {
  stopPolling();
  let remaining = attemptsLeft;
  pollHandle = window.setInterval(() => {
    remaining -= 1;
    // Bail out if the user has already navigated to a different listing.
    if (getCurrentCanonicalUrl() !== canonicalUrl) {
      stopPolling();
      return;
    }

    const listing = extractListingFromPage(getDetailScope());
    if (listing) {
      stopPolling();
      handleListingDetected(listing);
      return;
    }

    if (remaining <= 0) {
      stopPolling();
      // Extraction failed even after retries — fail gracefully, no prompt.
    }
  }, 400);
}

function handleListingDetected(listing: ExtractedListing): void {
  const canonicalUrl = canonicalizeListingUrl(listing.sourceUrl);
  currentListing = { ...listing, sourceUrl: canonicalUrl };
  currentCanonicalUrl = canonicalUrl;

  if (promptHandled.has(canonicalUrl)) {
    return; // Already added/dismissed this session — don't re-prompt.
  }

  showPrompt({ kind: "confirm", listing: currentListing });
}

function showPrompt(state: PromptState): void {
  renderPrompt(state, {
    onAdd: handleAdd,
    onDismiss: handleDismiss,
    onEdit: handleEditRequested,
    onSaveEdit: handleSaveEdit,
    onCancelEdit: handleCancelEdit,
  });
}

function handleDismiss(): void {
  if (currentCanonicalUrl) promptHandled.add(currentCanonicalUrl);
  removeBanner();
}

function handleEditRequested(): void {
  if (!currentListing) return;
  showPrompt({ kind: "edit", listing: currentListing });
}

function handleCancelEdit(): void {
  if (!currentListing) return;
  showPrompt({ kind: "confirm", listing: currentListing });
}

/**
 * Shared send path for every way a listing can get added — the manual "Add"
 * button, the edit form's "Save & add", and the automatic Apply-click
 * capture all funnel through here so the success/error/login-required
 * handling only lives in one place.
 */
function sendAddListingMessage(
  listing: ExtractedListing,
  canonicalUrl: string,
  onResult: (state: PromptState) => void,
  auto: boolean,
): void {
  const message: ExtensionMessage = { type: "ADD_LISTING", listing, auto };
  chrome.runtime.sendMessage(message, (response: AddListingResponse | undefined) => {
    // chrome.runtime.lastError happens if the background worker isn't
    // reachable (e.g. extension reloaded); treat as a generic error rather
    // than throwing.
    if (chrome.runtime.lastError || !response) {
      onResult({
        kind: "error",
        message: chrome.runtime.lastError?.message ?? "Extension error — please try again.",
      });
      return;
    }

    if (response.ok) {
      promptHandled.add(canonicalUrl);
      addedUrls.add(canonicalUrl);
      onResult({ kind: "success", created: response.created, auto });
      return;
    }

    if (response.reason === "UNAUTHENTICATED") {
      // Don't mark as handled: let the user log in and try again.
      onResult({ kind: "login-required" });
      return;
    }

    onResult({ kind: "error", message: response.message });
  });
}

function handleAdd(): void {
  if (!currentListing || !currentCanonicalUrl) return;
  showPrompt({ kind: "pending" });
  sendAddListingMessage(currentListing, currentCanonicalUrl, showPrompt, false);
}

function handleSaveEdit(edited: ExtractedListing): void {
  if (!currentCanonicalUrl) return;
  currentListing = edited;
  showPrompt({ kind: "pending" });
  sendAddListingMessage(edited, currentCanonicalUrl, showPrompt, false);
}

/**
 * Fired when the user clicks something that looks like LinkedIn's Apply /
 * Easy Apply control (see `findApplyControl` below). Auto-adds the current
 * listing without waiting for the confirm banner — clicking Apply is
 * itself the user's confirmation. Skips silently if we don't have
 * extraction data yet, or already added this listing.
 */
function handleApplyDetected(): void {
  if (!currentListing || !currentCanonicalUrl) return;
  if (addedUrls.has(currentCanonicalUrl)) return;

  console.log("[job-tracker] apply click detected, auto-adding", currentListing);
  showPrompt({ kind: "pending" });
  sendAddListingMessage(currentListing, currentCanonicalUrl, showPrompt, true);
}

function detectListing(): void {
  const canonicalUrl = getCurrentCanonicalUrl();
  if (canonicalUrl === currentCanonicalUrl && currentListing) {
    return; // No change since last check.
  }

  removeBanner();
  currentListing = null;

  const isListingUrl =
    /\/jobs\/view\//.test(window.location.pathname) ||
    /\/jobs\/(search|search-results|collections)\//.test(window.location.pathname);
  console.log("[job-tracker] detectListing", {
    href: window.location.href,
    pathname: window.location.pathname,
    isListingUrl,
  });
  if (!isListingUrl) {
    currentCanonicalUrl = null;
    return;
  }

  currentCanonicalUrl = canonicalUrl;

  const listing = extractListingFromPage(getDetailScope());
  console.log("[job-tracker] extraction result", listing);
  if (listing) {
    handleListingDetected(listing);
  } else {
    // Detail panel likely still loading (SPA nav) — retry briefly.
    pollForListing(canonicalUrl, 10);
  }
}

// --- SPA navigation detection -----------------------------------------------
// LinkedIn navigates between listings via history.pushState/replaceState
// without a full page load, so we patch both plus popstate, and back that
// with a debounced MutationObserver as a safety net in case a future
// LinkedIn build uses some other navigation mechanism.

function patchHistoryMethod(methodName: "pushState" | "replaceState"): void {
  const original = history[methodName];
  history[methodName] = (...args: Parameters<History[typeof methodName]>): void => {
    original.apply(history, args);
    window.dispatchEvent(new Event("job-tracker:locationchange"));
  };
}

// --- Apply-button auto-capture -----------------------------------------------
// UNVERIFIED against the live site (same caveat as the extraction selectors
// in ./selectors.ts — LinkedIn's job details module is server-driven UI with
// hashed CSS classes, see the comment there). There's no stable class name
// to target, so this matches on visible text / aria-label instead, which is
// more likely to survive markup churn. Logs every candidate it finds so this
// can be tuned against the real site the same way the extraction selectors
// were: watch the console for "apply-like control clicked" and adjust
// APPLY_TEXT_PATTERN if it's over- or under-firing.
const APPLY_TEXT_PATTERN = /^(easy apply|apply)$/i;
const APPLY_ARIA_LABEL_PATTERN = /^(easy apply|apply) to /i;

function findApplyControl(target: EventTarget | null): Element | null {
  if (!(target instanceof Element)) return null;
  const control = target.closest("a, button");
  if (!control) return null;

  const text = control.textContent?.trim().replace(/\s+/g, " ") ?? "";
  if (APPLY_TEXT_PATTERN.test(text)) return control;

  const ariaLabel = control.getAttribute("aria-label")?.trim() ?? "";
  if (APPLY_ARIA_LABEL_PATTERN.test(ariaLabel)) return control;

  return null;
}

document.addEventListener(
  "click",
  (event) => {
    const control = findApplyControl(event.target);
    if (!control) return;
    console.log("[job-tracker] apply-like control clicked", {
      text: control.textContent?.trim(),
      ariaLabel: control.getAttribute("aria-label"),
    });
    handleApplyDetected();
  },
  // Capture phase so this still sees the click even if LinkedIn's own
  // handler calls stopPropagation() on the way down.
  true,
);

console.log("[job-tracker] content script injected", window.location.href);

patchHistoryMethod("pushState");
patchHistoryMethod("replaceState");
window.addEventListener("popstate", () => window.dispatchEvent(new Event("job-tracker:locationchange")));
window.addEventListener("job-tracker:locationchange", detectListing);

let mutationDebounce: number | null = null;
const observer = new MutationObserver(() => {
  if (mutationDebounce !== null) window.clearTimeout(mutationDebounce);
  mutationDebounce = window.setTimeout(detectListing, 300);
});
observer.observe(document.body, { childList: true, subtree: true });

// Initial run.
detectListing();
