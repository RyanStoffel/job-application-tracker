// Inline "Add to tracker?" banner injected into the LinkedIn page.
//
// Rendered inside a Shadow DOM root so LinkedIn's page styles can't bleed
// into the banner (and vice versa) — LinkedIn's CSS is not something we
// control and could clobber unscoped class names at any time.

import type { ExtractedListing } from "../shared/types";

const HOST_ID = "job-tracker-extension-banner-host";

export type PromptState =
  | { kind: "confirm"; listing: ExtractedListing }
  | { kind: "edit"; listing: ExtractedListing }
  | { kind: "pending" }
  | { kind: "success"; created: boolean; auto?: boolean }
  | { kind: "login-required" }
  | { kind: "error"; message: string };

export interface PromptHandlers {
  onAdd: () => void;
  onDismiss: () => void;
  onEdit: () => void;
  onSaveEdit: (edited: ExtractedListing) => void;
  onCancelEdit: () => void;
}

let shadowRoot: ShadowRoot | null = null;

function getOrCreateHost(): ShadowRoot {
  if (shadowRoot) return shadowRoot;

  const existing = document.getElementById(HOST_ID);
  if (existing?.shadowRoot) {
    shadowRoot = existing.shadowRoot;
    return shadowRoot;
  }

  const host = document.createElement("div");
  host.id = HOST_ID;
  document.documentElement.appendChild(host);
  shadowRoot = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = `
    :host { all: initial; }
    .banner {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483647;
      width: 340px;
      background: #1a1a1a;
      color: #f5f5f5;
      border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.35);
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 14px;
      line-height: 1.4;
      animation: job-tracker-slide-in 160ms ease-out;
    }
    @keyframes job-tracker-slide-in {
      from { transform: translateY(12px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .title { font-weight: 600; margin: 0 0 4px 0; font-size: 15px; }
    .subtitle { margin: 0 0 12px 0; color: #c9c9c9; word-break: break-word; }
    .row { display: flex; gap: 8px; }
    button {
      flex: 1;
      cursor: pointer;
      border: none;
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 13px;
      font-weight: 600;
      font-family: inherit;
    }
    .add { background: #0a66c2; color: white; }
    .add:hover { background: #0850a0; }
    .dismiss { background: transparent; color: #c9c9c9; border: 1px solid #444; }
    .dismiss:hover { background: #2a2a2a; }
    .link {
      background: transparent;
      color: #4c9aff;
      border: 1px solid #444;
    }
    .status-icon { margin-right: 6px; }
    .form { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
    .form input {
      font: inherit;
      font-size: 13px;
      padding: 7px 9px;
      border-radius: 6px;
      border: 1px solid #444;
      background: #111;
      color: #f5f5f5;
    }
    .form input::placeholder { color: #777; }
    .form input:focus { outline: 2px solid #0a66c2; outline-offset: 1px; }
  `;
  shadowRoot.appendChild(style);
  return shadowRoot;
}

export function removeBanner(): void {
  document.getElementById(HOST_ID)?.remove();
  shadowRoot = null;
}

export function renderPrompt(state: PromptState, handlers: PromptHandlers): void {
  const root = getOrCreateHost();
  const existingBanner = root.querySelector(".banner");
  existingBanner?.remove();

  const banner = document.createElement("div");
  banner.className = "banner";

  switch (state.kind) {
    case "confirm": {
      const title = document.createElement("p");
      title.className = "title";
      title.textContent = "Add to tracker?";

      const subtitle = document.createElement("p");
      subtitle.className = "subtitle";
      subtitle.textContent = `${state.listing.jobTitle} · ${state.listing.companyName}`;

      const row = document.createElement("div");
      row.className = "row";

      const addBtn = document.createElement("button");
      addBtn.className = "add";
      addBtn.textContent = "Add";
      addBtn.addEventListener("click", handlers.onAdd);

      const editBtn = document.createElement("button");
      editBtn.className = "link";
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", handlers.onEdit);

      const dismissBtn = document.createElement("button");
      dismissBtn.className = "dismiss";
      dismissBtn.textContent = "Dismiss";
      dismissBtn.addEventListener("click", handlers.onDismiss);

      row.append(addBtn, editBtn, dismissBtn);
      banner.append(title, subtitle, row);
      break;
    }
    case "edit": {
      const title = document.createElement("p");
      title.className = "title";
      title.textContent = "Edit before adding";

      const form = document.createElement("div");
      form.className = "form";

      const titleInput = document.createElement("input");
      titleInput.type = "text";
      titleInput.placeholder = "Job title";
      titleInput.value = state.listing.jobTitle;

      const companyInput = document.createElement("input");
      companyInput.type = "text";
      companyInput.placeholder = "Company";
      companyInput.value = state.listing.companyName;

      const locationInput = document.createElement("input");
      locationInput.type = "text";
      locationInput.placeholder = "Location";
      locationInput.value = state.listing.locationText ?? "";

      const salaryInput = document.createElement("input");
      salaryInput.type = "text";
      salaryInput.placeholder = "Salary";
      salaryInput.value = state.listing.salaryText ?? "";

      form.append(titleInput, companyInput, locationInput, salaryInput);

      const saveBtn = document.createElement("button");
      saveBtn.className = "add";
      saveBtn.textContent = "Save & add";
      saveBtn.addEventListener("click", () => {
        handlers.onSaveEdit({
          ...state.listing,
          jobTitle: titleInput.value.trim() || state.listing.jobTitle,
          companyName: companyInput.value.trim() || state.listing.companyName,
          locationText: locationInput.value.trim() || null,
          salaryText: salaryInput.value.trim() || null,
        });
      });

      const cancelBtn = document.createElement("button");
      cancelBtn.className = "dismiss";
      cancelBtn.textContent = "Cancel";
      cancelBtn.addEventListener("click", handlers.onCancelEdit);

      const row = document.createElement("div");
      row.className = "row";
      row.append(saveBtn, cancelBtn);
      banner.append(title, form, row);
      break;
    }
    case "pending": {
      const title = document.createElement("p");
      title.className = "title";
      title.textContent = "Adding to tracker…";
      banner.append(title);
      break;
    }
    case "success": {
      const title = document.createElement("p");
      title.className = "title";
      title.textContent = state.auto
        ? state.created
          ? "Apply detected — added to tracker"
          : "Apply detected — already in your tracker"
        : state.created
          ? "Added to tracker"
          : "Already in your tracker";
      banner.append(title);
      window.setTimeout(() => removeBanner(), 2500);
      break;
    }
    case "login-required": {
      const title = document.createElement("p");
      title.className = "title";
      title.textContent = "Please log in";
      const subtitle = document.createElement("p");
      subtitle.className = "subtitle";
      subtitle.textContent = "Open the Job Application Tracker extension icon to log in, then try again.";
      const row = document.createElement("div");
      row.className = "row";
      const dismissBtn = document.createElement("button");
      dismissBtn.className = "dismiss";
      dismissBtn.textContent = "OK";
      dismissBtn.addEventListener("click", handlers.onDismiss);
      row.append(dismissBtn);
      banner.append(title, subtitle, row);
      break;
    }
    case "error": {
      const title = document.createElement("p");
      title.className = "title";
      title.textContent = "Couldn't add listing";
      const subtitle = document.createElement("p");
      subtitle.className = "subtitle";
      subtitle.textContent = state.message;
      const row = document.createElement("div");
      row.className = "row";
      const dismissBtn = document.createElement("button");
      dismissBtn.className = "dismiss";
      dismissBtn.textContent = "Dismiss";
      dismissBtn.addEventListener("click", handlers.onDismiss);
      row.append(dismissBtn);
      banner.append(title, subtitle, row);
      break;
    }
  }

  root.appendChild(banner);
}
