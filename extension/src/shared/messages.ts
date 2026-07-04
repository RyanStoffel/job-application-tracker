import type { Application, ExtractedListing } from "./types";

// Message contract between the content scripts (content/linkedin-detector,
// content/cross-site-toast) and the background service worker
// (background/sync). Kept in one place so all sides stay in sync.

export interface AddListingMessage {
  type: "ADD_LISTING";
  listing: ExtractedListing;
  /**
   * True when this was triggered by the Apply-click auto-capture rather
   * than the user explicitly clicking "Add"/"Save & add" on the banner.
   * The background worker only bothers correlating a resulting new tab
   * (see sync.ts) for auto-triggered adds — a manual Add doesn't imply the
   * user is about to navigate anywhere.
   */
  auto: boolean;
}

/**
 * Sent from the background worker to a specific tab (via
 * chrome.tabs.sendMessage) to show the cross-site "saved" toast — see
 * content/cross-site-toast.ts. Not sent via chrome.runtime.sendMessage, so
 * it doesn't need to be in the ExtensionMessage union below, but the shape
 * is shared here so both sides agree on it.
 */
export interface ShowSavedToastMessage {
  type: "SHOW_SAVED_TOAST";
  jobTitle: string;
  companyName: string;
}

export type ExtensionMessage = AddListingMessage;

export type AddListingResponse =
  | { ok: true; application: Application; created: boolean }
  | { ok: false; reason: "UNAUTHENTICATED" }
  | { ok: false; reason: "ERROR"; message: string };
