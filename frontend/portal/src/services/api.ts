import type {
  User,
  Job,
  Application,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  CreateJobRequest,
  UpdateJobRequest,
  JobListResponse,
  CreateApplicationRequest,
  ApplicationListResponse,
  Bookmark,
  BookmarkListResponse,
  Interview,
  CreateInterviewRequest,
  UpdateInterviewRequest,
  Program,
  ProgramApplication,
  CreateProgramApplicationRequest,
  ApiErrorResponse,
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
const TOKEN_STORAGE_KEY = 'portal_token';
const REFRESH_TOKEN_STORAGE_KEY = 'portal_refresh_token';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
}

async function request<T>(path: string, options?: RequestOptions): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  try {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // Ignore storage access failures
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: options?.method ?? 'GET',
    headers,
    body: options?.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) {
    const contentType = response.headers.get('content-type') ?? '';
    const errorPayload = contentType.includes('application/json')
      ? await response.json().catch(() => null)
      : await response.text().catch(() => null);

    const message =
      typeof errorPayload === 'string'
        ? errorPayload
        : (errorPayload as ApiErrorResponse)?.error?.message || `Request failed (${response.status})`;

    // If 401, clear tokens
    if (response.status === 401) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
}

// ============================================================
// TOKEN MANAGEMENT
// ============================================================

export function storeTokens(access: string, refresh?: string) {
  localStorage.setItem(TOKEN_STORAGE_KEY, access);
  if (refresh) {
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refresh);
  }
}

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
}

// ============================================================
// AUTH API
// ============================================================

export const authApi = {
  login: (payload: LoginRequest) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: payload }),

  register: (payload: RegisterRequest) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: payload }),

  refresh: (refreshToken: string) =>
    request<{ access_token: string; refresh_token: string }>('/auth/refresh', {
      method: 'POST',
      body: { refresh_token: refreshToken },
    }),

  logout: () =>
    request<{ message: string }>('/auth/logout', { method: 'POST' }),

  me: () =>
    request<{ user: User }>('/auth/me'),
};

// ============================================================
// PROFILE API
// ============================================================

export const profileApi = {
  get: () => request<any>('/profiles/me'),
  update: (payload: any) => request<any>('/profiles/me', { method: 'PUT', body: payload }),
};

// ============================================================
// JOBS API
// ============================================================

export const jobsApi = {
  list: (params?: {
    q?: string;
    location?: string;
    department?: string;
    job_type?: string;
    status?: string;
    sort_by?: string;
    page?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.q) query.set('q', params.q);
    if (params?.location) query.set('location', params.location);
    if (params?.department) query.set('department', params.department);
    if (params?.job_type) query.set('job_type', params.job_type);
    if (params?.status) query.set('status', params.status);
    if (params?.sort_by) query.set('sort_by', params.sort_by);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const queryString = query.toString();
    return request<JobListResponse>(`/jobs${queryString ? `?${queryString}` : ''}`);
  },

  get: (id: string) => request<Job>(`/jobs/${id}`),

  create: (payload: CreateJobRequest) =>
    request<Job>('/jobs', { method: 'POST', body: payload }),

  update: (id: string, patch: UpdateJobRequest) =>
    request<Job>(`/jobs/${id}`, { method: 'PATCH', body: patch }),

  remove: (id: string) =>
    request<{ success: boolean }>(`/jobs/${id}`, { method: 'DELETE' }),
};

// ============================================================
// APPLICATIONS API
// ============================================================

export const applicationsApi = {
  // For recruiters/admins - list all applications
  list: (params?: { job_id?: string; status?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.job_id) query.set('job_id', params.job_id);
    if (params?.status) query.set('status', params.status);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const queryString = query.toString();
    return request<ApplicationListResponse>(`/applications${queryString ? `?${queryString}` : ''}`);
  },

  // For candidates - list my applications
  listMine: (params?: { status?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const queryString = query.toString();
    return request<ApplicationListResponse>(`/applications/me${queryString ? `?${queryString}` : ''}`);
  },

  get: (id: string) => request<Application>(`/applications/${id}`),

  create: (payload: CreateApplicationRequest) =>
    request<Application>('/applications', { method: 'POST', body: payload }),

  update: (id: string, patch: { status?: string }) =>
    request<Application>(`/applications/${id}`, { method: 'PATCH', body: patch }),
};

// ============================================================
// USERS API (Admin only)
// ============================================================

export const usersApi = {
  list: (params?: { role?: string; status?: string; q?: string }) => {
    const query = new URLSearchParams();
    if (params?.role) query.set('role', params.role);
    if (params?.status) query.set('status', params.status);
    if (params?.q) query.set('q', params.q);
    const queryString = query.toString();
    return request<{ users: User[] }>(`/users${queryString ? `?${queryString}` : ''}`);
  },

  create: (payload: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone?: string;
    role: string;
    status?: string;
  }) =>
    request<User>('/users', { method: 'POST', body: payload }),

  update: (id: string, patch: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    role?: string;
    status?: string;
    password?: string;
  }) =>
    request<User>(`/users/${id}`, { method: 'PATCH', body: patch }),

  remove: (id: string) =>
    request<{ success: boolean }>(`/users/${id}`, { method: 'DELETE' }),
};

// ============================================================
// BOOKMARKS API
// ============================================================

export const bookmarksApi = {
  add: (jobId: string) =>
    request<Bookmark>(`/jobs/${jobId}/bookmark`, { method: 'POST' }),

  remove: (jobId: string) =>
    request<{ success: boolean }>(`/jobs/${jobId}/bookmark`, { method: 'DELETE' }),

  list: () =>
    request<BookmarkListResponse>('/jobs/bookmarked'),
};

// ============================================================
// INTERVIEWS API
// ============================================================

export const interviewsApi = {
  list: () =>
    request<{ interviews: Interview[] }>('/interviews'),

  create: (payload: CreateInterviewRequest) =>
    request<Interview>('/interviews', { method: 'POST', body: payload }),

  update: (id: string, patch: UpdateInterviewRequest) =>
    request<Interview>(`/interviews/${id}`, { method: 'PATCH', body: patch }),
};

// ============================================================
// PROGRAMS (KNOWLEDGE FACTORY) API
// ============================================================

export const programsApi = {
  list: (params?: { category?: string; enrollment_status?: string }) => {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.enrollment_status) query.set('enrollment_status', params.enrollment_status);
    const queryString = query.toString();
    return request<{ programs: Program[] }>(`/programs${queryString ? `?${queryString}` : ''}`);
  },

  create: (payload: {
    name: string;
    description?: string;
    category?: string;
    duration?: string;
    enrollment_status?: string;
    prerequisites?: string[];
  }) =>
    request<Program>('/programs', { method: 'POST', body: payload }),

  apply: (programId: string, payload: CreateProgramApplicationRequest) =>
    request<ProgramApplication>(`/programs/${programId}/apply`, { method: 'POST', body: payload }),

  getApplications: (programId: string) =>
    request<{ applications: ProgramApplication[] }>(`/programs/${programId}/applications`),

  updateApplication: (id: string, patch: { status?: string }) =>
    request<ProgramApplication>(`/programs/applications/${id}`, { method: 'PATCH', body: patch }),

  getMyApplications: () =>
    request<{ applications: ProgramApplication[] }>('/programs/applications/me'),
};

// ============================================================
// AUTOMATIONS API (Admin only)
// ============================================================

export const automationsApi = {
  list: async () => {
    const response = await request<{ automations: Array<{ type: string; template: string; enabled: boolean }> }>('/automations');
    return response.automations;
  },

  update: (payload: { type: string; template: string; enabled: boolean }) =>
    request<{ type: string; template: string; enabled: boolean }>('/automations', {
      method: 'PUT',
      body: payload,
    }),
};

// ============================================================
// BULK UPLOAD API
// ============================================================

export const bulkUploadApi = {
  start: (payload: { resumes: Array<{ filename: string; size: number; type: string }> }) =>
    request<{ message: string; count: number; status: string }>('/bulk-upload', {
      method: 'POST',
      body: payload,
    }),
};

// ============================================================
// HEALTH CHECK
// ============================================================

export const healthApi = {
  check: () => request<{ status: string; database: string }>('/health'),
};
