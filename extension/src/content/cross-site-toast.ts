// Cross-site "saved to tracker" toast.
//
// Injected on every site (see manifest.json's `<all_urls>` content script
// entry) so a confirmation can show up even when Apply opens a brand new
// tab on the employer's own site — somewhere content/linkedin-detector.ts
// (scoped only to linkedin.com) never runs. Deliberately minimal and kept
// separate from that file: this script does nothing except wait for the
// background worker to tell it to show a toast (see background/sync.ts for
// how it figures out which tab that is) — no LinkedIn scraping, no
// MutationObserver, no history patching.
import type { ShowSavedToastMessage } from "../shared/messages";

const HOST_ID = "job-tracker-cross-site-toast-host";

function renderToast(payload: ShowSavedToastMessage): void {
  document.getElementById(HOST_ID)?.remove(); // replace any toast already showing

  const host = document.createElement("div");
  host.id = HOST_ID;
  document.documentElement.appendChild(host);
  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = `
    :host { all: initial; }
    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483647;
      width: 300px;
      background: #1a1a1a;
      color: #f5f5f5;
      border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.35);
      padding: 14px 16px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 14px;
      line-height: 1.4;
      display: flex;
      gap: 10px;
      align-items: flex-start;
      animation: job-tracker-toast-in 160ms ease-out;
    }
    @keyframes job-tracker-toast-in {
      from { transform: translateY(12px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .check { color: #2ea043; font-weight: 700; }
    .body { flex: 1; min-width: 0; }
    .title { font-weight: 600; margin: 0 0 2px 0; }
    .subtitle { margin: 0; color: #c9c9c9; word-break: break-word; }
    .close {
      cursor: pointer;
      background: transparent;
      border: none;
      color: #999;
      font-size: 16px;
      line-height: 1;
      padding: 0;
    }
  `;
  shadow.appendChild(style);

  const toast = document.createElement("div");
  toast.className = "toast";

  const check = document.createElement("div");
  check.className = "check";
  check.textContent = "✓";

  const body = document.createElement("div");
  body.className = "body";
  const title = document.createElement("p");
  title.className = "title";
  title.textContent = "Added to tracker";
  const subtitle = document.createElement("p");
  subtitle.className = "subtitle";
  subtitle.textContent = `${payload.jobTitle} · ${payload.companyName}`;
  body.append(title, subtitle);

  const closeBtn = document.createElement("button");
  closeBtn.className = "close";
  closeBtn.textContent = "×";
  closeBtn.addEventListener("click", () => host.remove());

  toast.append(check, body, closeBtn);
  shadow.appendChild(toast);

  window.setTimeout(() => host.remove(), 6000);
}

chrome.runtime.onMessage.addListener((message: ShowSavedToastMessage) => {
  if (message?.type === "SHOW_SAVED_TOAST") {
    renderToast(message);
  }
  return false;
});
