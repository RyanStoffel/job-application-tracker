import { API_BASE_URL } from "./config";
import type {
  ApiErrorBody,
  AuthResponse,
  Application,
  LinkedInListingPayload,
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
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new ApiError(response.status, await parseErrorBody(response));
  }

  return (await response.json()) as AuthResponse;
}

export interface LinkedInListingResult {
  application: Application;
  /** true if the API created a new record (201), false if it already existed (200, idempotent). */
  created: boolean;
}

/**
 * POST a captured LinkedIn listing to the integrations endpoint.
 * Returns the created/existing Application plus whether it was newly
 * created (201) or already existed (200, idempotent dedupe — see
 * docs/API_CONTRACT.md). Throws ApiError on failure (including 401, which
 * the background worker's caller should handle by prompting the user to
 * log back in).
 */
export async function postLinkedInListing(
  token: string,
  payload: LinkedInListingPayload,
): Promise<LinkedInListingResult> {
  const response = await fetch(`${API_BASE_URL}/integrations/linkedin`, {
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
