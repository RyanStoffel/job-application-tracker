import type {
  Application,
  ApplicationDetail,
  AuthResponse,
  CreateApplicationPayload,
  ListApplicationsParams,
  LoginPayload,
  Note,
  SetStatusPayload,
  SignupPayload,
  StatsSummary,
  UpdateApplicationPayload,
  User,
} from "./types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api";

const TOKEN_KEY = "jobtracker.token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
}

/** Error thrown for any non-2xx API response. Carries the parsed error body
 * shape from docs/API_CONTRACT.md: `{ message, errors? }`. */
export class ApiError extends Error {
  status: number;
  errors?: Record<string, string>;

  constructor(status: number, message: string, errors?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
  query?: Record<string, string | undefined>;
}

function buildUrl(path: string, query?: Record<string, string | undefined>): string {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, value);
      }
    }
  }
  return url.toString();
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true, query } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (auth) {
    const token = getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      0,
      "Could not reach the API. Make sure the backend is running and NEXT_PUBLIC_API_BASE_URL is correct.",
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!response.ok) {
    const message =
      (data && typeof data.message === "string" && data.message) ||
      `Request failed with status ${response.status}`;
    const errors = data && typeof data.errors === "object" ? data.errors : undefined;
    throw new ApiError(response.status, message, errors);
  }

  return data as T;
}

// ---- Auth ----

export function signup(payload: SignupPayload): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/signup", { method: "POST", body: payload, auth: false });
}

export function login(payload: LoginPayload): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/login", { method: "POST", body: payload, auth: false });
}

export function getMe(): Promise<{ user: User }> {
  return request<{ user: User }>("/auth/me");
}

// ---- Applications ----

export function listApplications(params: ListApplicationsParams = {}): Promise<Application[]> {
  return request<Application[]>("/applications", {
    query: {
      status: params.status,
      q: params.q,
      sort: params.sort,
    },
  });
}

export function createApplication(payload: CreateApplicationPayload): Promise<Application> {
  return request<Application>("/applications", { method: "POST", body: payload });
}

export function getApplication(id: string): Promise<ApplicationDetail> {
  return request<ApplicationDetail>(`/applications/${id}`);
}

export function updateApplication(
  id: string,
  payload: UpdateApplicationPayload,
): Promise<Application> {
  return request<Application>(`/applications/${id}`, { method: "PATCH", body: payload });
}

export function deleteApplication(id: string): Promise<void> {
  return request<void>(`/applications/${id}`, { method: "DELETE" });
}

export function setApplicationStatus(
  id: string,
  payload: SetStatusPayload,
): Promise<ApplicationDetail> {
  return request<ApplicationDetail>(`/applications/${id}/status`, {
    method: "POST",
    body: payload,
  });
}

export function createNote(id: string, content: string): Promise<Note> {
  return request<Note>(`/applications/${id}/notes`, { method: "POST", body: { content } });
}

export function updateNote(id: string, noteId: string, content: string): Promise<Note> {
  return request<Note>(`/applications/${id}/notes/${noteId}`, {
    method: "PATCH",
    body: { content },
  });
}

export function deleteNote(id: string, noteId: string): Promise<void> {
  return request<void>(`/applications/${id}/notes/${noteId}`, { method: "DELETE" });
}

// ---- Stats ----

export function getStatsSummary(): Promise<StatsSummary> {
  return request<StatsSummary>("/stats/summary");
}
