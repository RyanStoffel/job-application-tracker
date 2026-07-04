import { API_BASE_URL } from "./config";
import type {
  ApiErrorBody,
  AuthResponse,
  Application,
  CaptureListingPayload,
} from "./types";

/** Thrown for any non-2xx API response. Carries the parsed error body. */
export class ApiError extends Error {
  readonly status: number;
  readonly errors?: Record<string, string>;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiError";
    this.status = status;
    this.errors = body.errors;
  }
}

const REQUEST_TIMEOUT_MS = 15000;

/**
 * Plain `fetch()` has no default timeout — if the API is unreachable in a
 * way that doesn't fail fast (host down but nothing actively refusing the
 * connection, a hung proxy, etc.) the call can hang indefinitely, which
 * left the "Adding to tracker…" banner stuck forever with no feedback.
 * Aborting after a fixed timeout guarantees callers always get a
 * resolved/rejected promise in bounded time.
 */
function fetchWithTimeout(input: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timeout));
}

async function parseErrorBody(response: Response): Promise<ApiErrorBody> {
  try {
    const data = await response.json();
    if (data && typeof data.message === "string") {
      return data as ApiErrorBody;
    }
  } catch {
    // fall through to generic message below
  }
  return { message: `Request failed with status ${response.status}` };
}

export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new ApiError(response.status, await parseErrorBody(response));
  }

  return (await response.json()) as AuthResponse;
}

export interface CaptureListingResult {
  application: Application;
  /** true if the API created a new record (201), false if it already existed (200, idempotent). */
  created: boolean;
}

async function postCapture(endpoint: string, token: string, payload: CaptureListingPayload): Promise<CaptureListingResult> {
  const response = await fetchWithTimeout(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new ApiError(response.status, await parseErrorBody(response));
  }

  const application = (await response.json()) as Application;
  return { application, created: response.status === 201 };
}

/**
 * POST a captured LinkedIn listing to the integrations endpoint.
 * Returns the created/existing Application plus whether it was newly
 * created (201) or already existed (200, idempotent dedupe — see
 * docs/API_CONTRACT.md). Throws ApiError on failure (including 401, which
 * the background worker's caller should handle by prompting the user to
 * log back in).
 */
export function postLinkedInListing(token: string, payload: CaptureListingPayload): Promise<CaptureListingResult> {
  return postCapture("/integrations/linkedin", token, payload);
}

/**
 * POST a captured listing from a non-LinkedIn site to the generic capture
 * endpoint (see content/generic-detector.ts). Same behavior/response shape
 * as {@link postLinkedInListing}, but creates records as source=other.
 */
export function postCaptureListing(token: string, payload: CaptureListingPayload): Promise<CaptureListingResult> {
  return postCapture("/integrations/capture", token, payload);
}
