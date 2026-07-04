// Shared detector runtime used by every non-LinkedIn capture content script
// (content/generic-detector.ts, content/ats-detector.ts). LinkedIn keeps its
// own detector (content/linkedin-detector.ts) since it additionally supports
// Apply-click auto-capture and SPA history-patching that no other source
// needs — everything else is this same "extract once idle, confirm via
// banner, never auto-submit" flow, so it's factored out once here rather
// than duplicated per source.
import { renderPrompt, removeBanner, type PromptState } from "./prompt";
import { isExtensionContextValid } from "../shared/extension-context";
import type { ExtractedListing } from "../shared/types";
import type { ExtensionMessage, AddListingResponse } from "../shared/messages";

/** Which capture endpoint this listing should be routed to — see background/sync.ts. */
export type CaptureSource = Extract<ExtensionMessage["source"], "generic" | "ats">;

/**
 * Wires up the shared "detect -> confirm banner -> send" flow for a given
 * extractor. Call once per content script with the site-specific extraction
 * function; everything else (prompt state machine, message sending,
 * mutation-debounced re-detection) is identical across sources.
 */
export function runCaptureDetector(extract: () => ExtractedListing | null, source: CaptureSource): void {
  // Per-tab-session tracking: don't re-prompt for a listing the user already
  // dismissed/added while they stay on this page.
  const promptHandled = new Set<string>();

  let currentListing: ExtractedListing | null = null;

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
    if (currentListing) promptHandled.add(currentListing.sourceUrl);
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

  function sendAddListingMessage(listing: ExtractedListing, onResult: (state: PromptState) => void): void {
    if (!isExtensionContextValid()) {
      onResult({ kind: "error", message: "Extension was updated — please refresh the page and try again." });
      return;
    }
    const message: ExtensionMessage = { type: "ADD_LISTING", listing, auto: false, source };
    chrome.runtime.sendMessage(message, (response: AddListingResponse | undefined) => {
      if (chrome.runtime.lastError || !response) {
        onResult({
          kind: "error",
          message: chrome.runtime.lastError?.message ?? "Extension error — please try again.",
        });
        return;
      }

      if (response.ok) {
        promptHandled.add(listing.sourceUrl);
        onResult({ kind: "success", created: response.created });
        return;
      }

      if (response.reason === "UNAUTHENTICATED") {
        onResult({ kind: "login-required" });
        return;
      }

      onResult({ kind: "error", message: response.message });
    });
  }

  function handleAdd(): void {
    if (!currentListing) return;
    showPrompt({ kind: "pending" });
    sendAddListingMessage(currentListing, showPrompt);
  }

  function handleSaveEdit(edited: ExtractedListing): void {
    currentListing = edited;
    showPrompt({ kind: "pending" });
    sendAddListingMessage(edited, showPrompt);
  }

  function detectListing(): void {
    const listing = extract();
    if (!listing) return;
    if (promptHandled.has(listing.sourceUrl)) return;
    if (currentListing?.sourceUrl === listing.sourceUrl) return; // already showing this one

    currentListing = listing;
    showPrompt({ kind: "confirm", listing });
  }

  let mutationDebounce: number | null = null;
  const observer = new MutationObserver(() => {
    if (!isExtensionContextValid()) {
      observer.disconnect();
      return;
    }
    if (currentListing) return; // already found something on this page - stop watching
    if (mutationDebounce !== null) window.clearTimeout(mutationDebounce);
    mutationDebounce = window.setTimeout(detectListing, 500);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  detectListing();
}
