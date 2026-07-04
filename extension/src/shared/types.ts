// Types mirrored from docs/API_CONTRACT.md. Keep in sync with the backend
// contract — see docs/AGENTS.md "Cross-Component Contract Rules".

export type Status =
  | "saved"
  | "applied"
  | "interviewing"
  | "rejected"
  | "ghosted"
  | "offer";

export type Source = "linkedin" | "manual" | "other";

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
}

export interface Application {
  id: string;
  source: Source;
  sourceUrl: string | null;
  companyName: string;
  jobTitle: string;
  locationText: string | null;
  salaryText: string | null;
  appliedAt: string | null;
  currentStatus: Status;
  createdAt: string;
  updatedAt: string;
}

/** Shape returned by every API error response. */
export interface ApiErrorBody {
  message: string;
  errors?: Record<string, string>;
}

export interface AuthResponse {
  user: User;
  token: string;
}

/**
 * Request body shared by both capture endpoints: POST /api/integrations/linkedin
 * and POST /api/integrations/capture (the generic fallback parser's target).
 */
export interface CaptureListingPayload {
  sourceUrl: string;
  companyName: string;
  jobTitle: string;
  locationText: string | null;
  salaryText: string | null;
  postedAt: string | null;
  companyLogoUrl: string | null;
}

/** What the content-script extractor produces before it's sent anywhere. */
export interface ExtractedListing {
  sourceUrl: string;
  companyName: string;
  jobTitle: string;
  locationText: string | null;
  salaryText: string | null;
  postedAt: string | null;
  companyLogoUrl: string | null;
}

/** What's persisted in chrome.storage.local under the "auth" key. */
export interface StoredAuth {
  token: string;
  user: User;
}
