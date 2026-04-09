import type {
  ApiErrorShape,
  Application,
  ApplicationListParams,
  AuthSession,
  AuthTokens,
  CandidateProfile,
  Job,
  JobListParams,
  KnowledgeFactoryApplication,
  KnowledgeFactoryProgram,
  LoginPayload,
  MatchInsights,
  MatchListParams,
  MatchResult,
  ProgramApplicationPayload,
  ProgramListParams,
  RefreshPayload,
  RegisterPayload,
  ResumeDetails,
  ResumeParseResult,
  ResumeUploadResponse,
} from "@/types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

const ACCESS_TOKEN_KEY = "coastal-careers.access-token";
const REFRESH_TOKEN_KEY = "coastal-careers.refresh-token";

type QueryValue = string | number | boolean | undefined;
type QueryParams = Record<string, QueryValue>;

type RequestOptions = {
  method?: string;
  body?: BodyInit | object;
  query?: QueryParams;
  auth?: boolean;
  retryOnUnauthorized?: boolean;
};

export class ApiClientError extends Error {
  status: number;
  code?: string;
  details?: ApiErrorShape["error"]["details"];

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: ApiErrorShape["error"]["details"],
  ) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setAuthTokens(tokens: AuthTokens): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
}

export function clearAuthTokens(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    method = "GET",
    body,
    query,
    auth = true,
    retryOnUnauthorized = true,
  } = options;

  const url = new URL(stripLeadingSlash(path), ensureTrailingSlash(API_BASE_URL));

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const headers = new Headers();
  const payload = normalizeBody(body, headers);

  if (auth) {
    const token = getAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(url.toString(), {
    method,
    headers,
    body: payload,
    cache: "no-store",
  });

  if (
    response.status === 401 &&
    retryOnUnauthorized &&
    auth &&
    !path.startsWith("/auth/refresh")
  ) {
    const refreshed = await tryRefreshAccessToken();

    if (refreshed) {
      return request<T>(path, {
        ...options,
        retryOnUnauthorized: false,
      });
    }
  }

  if (!response.ok) {
    throw await createApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  return (await response.text()) as T;
}

export const apiClient = {
  get<T>(path: string, options: Omit<RequestOptions, "method" | "body"> = {}) {
    return request<T>(path, { ...options, method: "GET" });
  },

  post<T>(path: string, body: object, options: Omit<RequestOptions, "method" | "body"> = {}) {
    return request<T>(path, { ...options, method: "POST", body });
  },

  uploadForm<T>(
    path: string,
    formData: FormData,
    options: Omit<RequestOptions, "method" | "body"> = {},
  ) {
    return request<T>(path, { ...options, method: "POST", body: formData });
  },
};

async function tryRefreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    clearAuthTokens();
    return false;
  }

  try {
    const refreshed = await request<AuthTokens>("/auth/refresh", {
      method: "POST",
      body: { refresh_token: refreshToken } satisfies RefreshPayload,
      auth: false,
      retryOnUnauthorized: false,
    });

    setAuthTokens(refreshed);
    return true;
  } catch {
    clearAuthTokens();
    return false;
  }
}

async function createApiError(response: Response): Promise<ApiClientError> {
  const fallbackMessage = `Request failed with status ${response.status}`;
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    const rawText = await response.text();
    return new ApiClientError(rawText || fallbackMessage, response.status);
  }

  const payload = (await response.json()) as Partial<ApiErrorShape>;
  const error = payload.error;

  return new ApiClientError(
    error?.message || fallbackMessage,
    response.status,
    error?.code,
    error?.details,
  );
}

function normalizeBody(
  body: RequestOptions["body"],
  headers: Headers,
): BodyInit | undefined {
  if (body == null) {
    return undefined;
  }

  if (body instanceof FormData) {
    return body;
  }

  if (typeof body === "string" || body instanceof Blob) {
    return body;
  }

  headers.set("Content-Type", "application/json");
  return JSON.stringify(body);
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function stripLeadingSlash(value: string): string {
  return value.startsWith("/") ? value.slice(1) : value;
}

function normalizeListResponse<T>(
  payload: T[] | { jobs?: T[]; matches?: T[]; programs?: T[]; applications?: T[] },
  key: "jobs" | "matches" | "programs" | "applications",
): T[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  return payload[key] ?? [];
}

export const authApi = {
  async register(payload: RegisterPayload): Promise<AuthSession> {
    const session = await request<AuthSession>("/auth/register", {
      method: "POST",
      body: payload,
      auth: false,
    });
    setAuthTokens(session);
    return session;
  },

  async login(payload: LoginPayload): Promise<AuthSession> {
    const session = await request<AuthSession>("/auth/login", {
      method: "POST",
      body: payload,
      auth: false,
    });
    setAuthTokens(session);
    return session;
  },

  async refresh(payload: RefreshPayload): Promise<AuthTokens> {
    const tokens = await request<AuthTokens>("/auth/refresh", {
      method: "POST",
      body: payload,
      auth: false,
      retryOnUnauthorized: false,
    });
    setAuthTokens(tokens);
    return tokens;
  },

  async logout(): Promise<{ message: string }> {
    const result = await request<{ message: string }>("/auth/logout", {
      method: "POST",
    });
    clearAuthTokens();
    return result;
  },
};

export const profileApi = {
  get(): Promise<CandidateProfile> {
    return request<CandidateProfile>("/profiles/me");
  },

  update(payload: Partial<CandidateProfile>): Promise<CandidateProfile> {
    return request<CandidateProfile>("/profiles/me", {
      method: "PUT",
      body: payload,
    });
  },
};

export const jobsApi = {
  async list(params: JobListParams = {}): Promise<Job[]> {
    const response = await request<Job[] | { jobs: Job[] }>("/jobs", {
      query: params,
      auth: false,
    });
    return normalizeListResponse(response, "jobs");
  },

  getById(jobId: string): Promise<Job> {
    return request<Job>(`/jobs/${jobId}`, { auth: false });
  },

  bookmark(jobId: string): Promise<{ success: boolean; bookmarks: string[] }> {
    return request<{ success: boolean; bookmarks: string[] }>(
      `/jobs/${jobId}/bookmark`,
      {
        method: "POST",
      },
    );
  },

  removeBookmark(
    jobId: string,
  ): Promise<{ success: boolean; bookmarks: string[] }> {
    return request<{ success: boolean; bookmarks: string[] }>(
      `/jobs/${jobId}/bookmark`,
      {
        method: "DELETE",
      },
    );
  },

  async getBookmarked(): Promise<Job[]> {
    const response = await request<Job[] | { jobs: Job[] }>("/jobs/bookmarked");
    return normalizeListResponse(response, "jobs");
  },
};

export const applicationsApi = {
  submit(payload: Omit<Application, "id" | "status" | "applied_at">): Promise<Application> {
    return request<Application>("/applications", {
      method: "POST",
      body: payload,
    });
  },

  async listMine(params: ApplicationListParams = {}): Promise<Application[]> {
    const response = await request<Application[] | { applications: Application[] }>(
      "/applications/me",
      {
        query: params,
      },
    );
    return normalizeListResponse(response, "applications");
  },

  getById(applicationId: string): Promise<Application> {
    return request<Application>(`/applications/${applicationId}`);
  },
};

export const resumeApi = {
  upload(file: File, candidateType?: string): Promise<ResumeUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

    if (candidateType) {
      formData.append("candidate_type", candidateType);
    }

    return apiClient.uploadForm<ResumeUploadResponse>("/resume/upload", formData);
  },

  getParseResult(uploadId: string): Promise<ResumeParseResult> {
    return request<ResumeParseResult>(`/resume/${uploadId}/parse-result`);
  },

  getById(resumeId: string): Promise<ResumeDetails> {
    return request<ResumeDetails>(`/resume/${resumeId}`);
  },
};

export const matchesApi = {
  async list(params: MatchListParams = {}): Promise<MatchResult[]> {
    const response = await request<
      MatchResult[] | { matches: MatchResult[] }
    >("/matches", {
      query: params,
    });
    return normalizeListResponse(response, "matches");
  },

  getInsights(): Promise<MatchInsights> {
    return request<MatchInsights>("/matches/insights");
  },

  compute(resumeId: string): Promise<MatchResult[]> {
    return apiClient.post<MatchResult[]>("/matches/compute", {
      resume_id: resumeId,
    });
  },
};

export const knowledgeFactoryApi = {
  async listPrograms(
    params: ProgramListParams = {},
  ): Promise<KnowledgeFactoryProgram[]> {
    const response = await request<
      KnowledgeFactoryProgram[] | { programs: KnowledgeFactoryProgram[] }
    >("/knowledge-factory/programs", {
      query: params,
      auth: false,
    });
    return normalizeListResponse(response, "programs");
  },

  getProgram(programId: string): Promise<KnowledgeFactoryProgram> {
    return request<KnowledgeFactoryProgram>(
      `/knowledge-factory/programs/${programId}`,
      { auth: false },
    );
  },

  apply(
    programId: string,
    payload: ProgramApplicationPayload,
  ): Promise<KnowledgeFactoryApplication> {
    return request<KnowledgeFactoryApplication>(
      `/knowledge-factory/programs/${programId}/apply`,
      {
        method: "POST",
        body: payload,
      },
    );
  },

  async getMyApplications(): Promise<KnowledgeFactoryApplication[]> {
    const response = await request<
      KnowledgeFactoryApplication[] | {
        applications: KnowledgeFactoryApplication[];
      }
    >("/knowledge-factory/applications/me");

    return normalizeListResponse(response, "applications");
  },
};

export const api = {
  auth: authApi,
  profile: profileApi,
  jobs: jobsApi,
  applications: applicationsApi,
  resume: resumeApi,
  matches: matchesApi,
  knowledgeFactory: knowledgeFactoryApi,
};
