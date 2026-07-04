// Types mirroring docs/API_CONTRACT.md exactly. Keep in sync with the API.

export type Status =
  | "saved"
  | "applied"
  | "interviewing"
  | "rejected"
  | "ghosted"
  | "offer";

export const STATUSES: Status[] = [
  "saved",
  "applied",
  "interviewing",
  "rejected",
  "ghosted",
  "offer",
];

export type Source = "linkedin" | "manual" | "other";

export type SalaryPeriod = "yearly" | "monthly" | "weekly" | "hourly";

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
  postedAt: string | null;
  locationCity: string | null;
  locationRegion: string | null;
  locationCountry: string | null;
  isRemote: boolean | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: SalaryPeriod | null;
  companyLogoUrl: string | null;
  duplicateOfId: string | null;
  currentStatus: Status;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface StatusEvent {
  id: string;
  status: Status;
  note: string | null;
  changedAt: string;
}

export interface ApplicationDetail extends Application {
  notes: Note[];
  statusHistory: StatusEvent[];
}

export interface RecentActivityItem extends StatusEvent {
  applicationId: string;
  companyName: string;
  jobTitle: string;
}

export type StatsByStatus = Record<Status, number>;

export interface StatsSummary {
  total: number;
  byStatus: StatsByStatus;
  recentActivity: RecentActivityItem[];
}

export interface ApiErrorBody {
  message: string;
  errors?: Record<string, string>;
}

// ---- Request payloads ----

export interface SignupPayload {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface CreateApplicationPayload {
  companyName: string;
  jobTitle: string;
  sourceUrl: string | null;
  locationText: string | null;
  salaryText: string | null;
  appliedAt: string | null;
  postedAt: string | null;
  companyLogoUrl: string | null;
  currentStatus: Status;
}

export type UpdateApplicationPayload = Partial<
  Pick<
    CreateApplicationPayload,
    | "companyName"
    | "jobTitle"
    | "sourceUrl"
    | "locationText"
    | "salaryText"
    | "appliedAt"
    | "postedAt"
    | "companyLogoUrl"
  >
>;

export interface SetStatusPayload {
  status: Status;
  note: string | null;
}

export interface ListApplicationsParams {
  status?: Status;
  q?: string;
  sort?:
    | "createdAt"
    | "-createdAt"
    | "companyName"
    | "-companyName"
    | "currentStatus";
}
