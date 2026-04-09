import type { Application, Automation, Job, User } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const TOKEN_STORAGE_KEY = 'portal_token';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

async function request<T>(path: string, options?: { method?: HttpMethod; body?: unknown }): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  try {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // Ignore storage access failures (e.g. in restricted environments)
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
        : (errorPayload as any)?.error || `Request failed (${response.status})`;

    throw new Error(message);
  }

  return (await response.json()) as T;
}

export const authApi = {
  login: (payload: { email: string; password: string }) =>
    request<{ token: string; user: User }>('/auth/login', { method: 'POST', body: payload }),
  me: () => request<{ user: User }>('/auth/me'),
};

export const jobsApi = {
  list: () => request<Job[]>('/jobs'),
  get: (id: number) => request<Job>(`/jobs/${id}`),
  create: (payload: Omit<Job, 'id'> & Partial<Pick<Job, 'postedDate' | 'timeToHireDays'>>) =>
    request<Job>('/jobs', { method: 'POST', body: payload }),
  update: (id: number, patch: Partial<Job>) => request<Job>(`/jobs/${id}`, { method: 'PATCH', body: patch }),
  remove: (id: number) => request<{ ok: true }>(`/jobs/${id}`, { method: 'DELETE' }),
};

export const applicationsApi = {
  list: () => request<Application[]>('/applications'),
  get: (id: number) => request<Application>(`/applications/${id}`),
  create: (payload: Omit<Application, 'id'>) => request<Application>('/applications', { method: 'POST', body: payload }),
  update: (id: number, patch: Partial<Pick<Application, 'status'>>) =>
    request<Application>(`/applications/${id}`, { method: 'PATCH', body: patch }),
};

export const usersApi = {
  list: () => request<User[]>('/users'),
  create: (payload: Omit<User, 'id'> & { password: string }) => request<User>('/users', { method: 'POST', body: payload }),
  update: (id: number, patch: Partial<User> & { password?: string }) =>
    request<User>(`/users/${id}`, { method: 'PATCH', body: patch }),
  remove: (id: number) => request<{ ok: true }>(`/users/${id}`, { method: 'DELETE' }),
};

export const automationsApi = {
  list: () => request<Automation[]>('/automations'),
  update: (payload: Pick<Automation, 'type' | 'template'> & Partial<Pick<Automation, 'enabled'>>) =>
    request<Automation>('/automations/email', { method: 'POST', body: payload }),
};

export const bulkUploadApi = {
  start: (payload: { count: number }) => request<{ message: string; count: number }>('/bulk-upload', { method: 'POST', body: payload }),
};
