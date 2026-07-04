/**
 * When the extension is reloaded/updated (routine during development, but
 * can also happen from an auto-update) while a content script is already
 * injected into an open tab, that old content script instance is orphaned:
 * its `chrome.*` bindings point at a context that no longer exists. Chrome
 * throws "Extension context invalidated" the next time orphaned code tries
 * to use them — including from a still-running `setInterval`/
 * `MutationObserver` callback, which is exactly the failure mode content
 * scripts here are prone to (see pollForListing/MutationObserver in
 * linkedin-detector.ts and generic-detector.ts).
 *
 * There's no event for this — polling `chrome.runtime.id` is the standard
 * way to detect it, since accessing it throws/returns undefined once the
 * context is torn down. Callers should check this before using any
 * chrome.* API from a long-lived callback, and stop cleanly (clear
 * intervals/disconnect observers) instead of letting it throw repeatedly.
 */
export function isExtensionContextValid(): boolean {
  try {
    return typeof chrome !== "undefined" && !!chrome.runtime?.id;
  } catch {
    return false;
  }
}
