// Background service worker.
//
// Responsibilities (see docs/ARCHITECTURE.md "background/sync"):
//  - Hold/read the auth JWT from chrome.storage.local (never in the content
//    script — content scripts run in a less trusted context on a 3rd-party
//    page, per docs/ARCHITECTURE.md "Security Baseline").
//  - Receive "ADD_LISTING" messages from the content script and POST the
//    payload to POST /api/integrations/linkedin with the bearer token.
//  - Handle 401 (missing/expired token) by telling the content script to
//    show a "please log in" state rather than silently failing or throwing.
import { ApiError, postLinkedInListing } from "../shared/api";
import { getStoredAuth, clearStoredAuth } from "../shared/storage";
import { canonicalizeListingUrl } from "../shared/url";
import type { ExtensionMessage, AddListingResponse, ShowSavedToastMessage } from "../shared/messages";

// The on-page banner/toast lives in the content script's DOM, which means
// it necessarily disappears the moment the user navigates away or (for
// external "Apply" links that open in a new tab) simply isn't visible from
// that new tab at all — a page-injected element can't follow the user
// anywhere. The toolbar badge lives on the extension icon itself, which is
// part of browser chrome rather than page content, so it's the correct
// mechanism for "still show something happened even after leaving this
// LinkedIn tab" — it's visible regardless of which tab or site is active.
const BADGE_CLEAR_DELAY_MS = 6000;
let badgeClearHandle: ReturnType<typeof setTimeout> | null = null;

function flashBadge(text: string, color: string): void {
  if (badgeClearHandle !== null) clearTimeout(badgeClearHandle);
  chrome.action.setBadgeBackgroundColor({ color });
  chrome.action.setBadgeText({ text });
  badgeClearHandle = setTimeout(() => {
    chrome.action.setBadgeText({ text: "" });
    badgeClearHandle = null;
  }, BADGE_CLEAR_DELAY_MS);
}

// --- Cross-site "saved" toast delivery ---------------------------------
// Apply-click auto-capture (see content/linkedin-detector.ts) often opens a
// brand new tab on the employer's own site — our LinkedIn banner can't
// follow the user there. content/cross-site-toast.ts is injected on every
// site to show a small toast when told to, but the background worker has
// to figure out WHICH tab is the right one to tell.
//
// This is genuinely racy: the browser opens the new tab natively and
// essentially instantly on click, while our POST to the backend takes real
// network time — so "the new tab appeared" and "the add succeeded" can
// happen in either order. We track both signals, keyed by the LinkedIn tab
// that had the Apply click (its id is available as `sender.tab.id` on the
// incoming ADD_LISTING message, and as `openerTabId` on the tab-created
// event for whatever tab it spawns), and deliver as soon as both are known.
interface PendingAutoAdd {
  jobTitle: string;
  companyName: string;
  succeeded: boolean;
  newTabId: number | null;
  expireHandle: ReturnType<typeof setTimeout>;
}

const PENDING_AUTO_ADD_TIMEOUT_MS = 15000;
const pendingAutoAdds = new Map<number, PendingAutoAdd>();

function clearPendingAutoAdd(openerTabId: number): void {
  const pending = pendingAutoAdds.get(openerTabId);
  if (pending) clearTimeout(pending.expireHandle);
  pendingAutoAdds.delete(openerTabId);
}

function registerPendingAutoAdd(openerTabId: number, jobTitle: string, companyName: string): void {
  clearPendingAutoAdd(openerTabId); // replace any stale entry for this tab
  const expireHandle = setTimeout(() => pendingAutoAdds.delete(openerTabId), PENDING_AUTO_ADD_TIMEOUT_MS);
  pendingAutoAdds.set(openerTabId, { jobTitle, companyName, succeeded: false, newTabId: null, expireHandle });
}

function deliverToastToTab(tabId: number, payload: ShowSavedToastMessage): void {
  const send = () => chrome.tabs.sendMessage(tabId, payload, () => void chrome.runtime.lastError);

  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab) return; // tab may already be gone
    if (tab.status === "complete") {
      send();
      return;
    }
    // Wait for the destination tab to finish loading so its content script
    // (content/cross-site-toast.ts) has had a chance to inject and start
    // listening before we send.
    const onUpdated = (updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo): void => {
      if (updatedTabId !== tabId || changeInfo.status !== "complete") return;
      chrome.tabs.onUpdated.removeListener(onUpdated);
      send();
    };
    chrome.tabs.onUpdated.addListener(onUpdated);
  });
}

function tryDeliverPendingAutoAdd(openerTabId: number): void {
  const pending = pendingAutoAdds.get(openerTabId);
  if (!pending || !pending.succeeded || pending.newTabId === null) return;

  deliverToastToTab(pending.newTabId, {
    type: "SHOW_SAVED_TOAST",
    jobTitle: pending.jobTitle,
    companyName: pending.companyName,
  });
  clearPendingAutoAdd(openerTabId);
}

chrome.tabs.onCreated.addListener((tab) => {
  const openerTabId = tab.openerTabId;
  if (openerTabId === undefined || tab.id === undefined) return;
  const pending = pendingAutoAdds.get(openerTabId);
  if (!pending) return;
  pending.newTabId = tab.id;
  tryDeliverPendingAutoAdd(openerTabId);
});

async function handleAddListing(
  listing: ExtensionMessage["listing"],
  auto: boolean,
  openerTabId: number | undefined,
): Promise<AddListingResponse> {
  const auth = await getStoredAuth();
  if (!auth) {
    flashBadge("!", "#b91c1c");
    return { ok: false, reason: "UNAUTHENTICATED" };
  }

  try {
    const { application, created } = await postLinkedInListing(auth.token, {
      sourceUrl: canonicalizeListingUrl(listing.sourceUrl),
      companyName: listing.companyName,
      jobTitle: listing.jobTitle,
      locationText: listing.locationText,
      salaryText: listing.salaryText,
      postedAt: listing.postedAt,
    });

    flashBadge("✓", "#1a7f37"); // checkmark

    if (auto && openerTabId !== undefined) {
      const pending = pendingAutoAdds.get(openerTabId);
      if (pending) {
        pending.succeeded = true;
        tryDeliverPendingAutoAdd(openerTabId);
      }
    }

    return { ok: true, application, created };
  } catch (err) {
    flashBadge("!", "#b91c1c");
    if (err instanceof ApiError) {
      if (err.status === 401) {
        // Token is missing/expired server-side; drop it locally too so the
        // popup correctly falls back to the login form next time it opens.
        await clearStoredAuth();
        return { ok: false, reason: "UNAUTHENTICATED" };
      }
      return { ok: false, reason: "ERROR", message: err.message };
    }
    return {
      ok: false,
      reason: "ERROR",
      message: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  if (message?.type === "ADD_LISTING") {
    const openerTabId = sender.tab?.id;
    if (message.auto && openerTabId !== undefined) {
      // Register before awaiting the fetch below — the new tab can (and
      // often does) open before the POST resolves.
      registerPendingAutoAdd(openerTabId, message.listing.jobTitle, message.listing.companyName);
    }
    handleAddListing(message.listing, message.auto, openerTabId).then(sendResponse);
    // Return true to keep the message channel open for the async response.
    return true;
  }
  return false;
});
