/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import { tokenStore } from './tokenStore';

const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL ?? 'http://localhost:8080';

export interface ApiErrorBody {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
  details: string[];
}

export class ApiError extends Error {
  status: number;
  details: string[];

  constructor(body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiError';
    this.status = body.status;
    this.details = body.details ?? [];
  }
}

/** Set by AuthContext so a 401 anywhere can clear the session and redirect to login. */
let unauthorizedHandler: (() => void) | null = null;
export function setUnauthorizedHandler(handler: () => void) {
  unauthorizedHandler = handler;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(path.startsWith('http') ? path : `${BASE_URL}${path}`, window.location.origin);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.set(key, String(value));
    });
  }
  return url.toString();
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = tokenStore.get();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(buildUrl(path, options.query), {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 401) {
    unauthorizedHandler?.();
  }

  if (!response.ok) {
    let errorBody: ApiErrorBody;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = {
        timestamp: new Date().toISOString(),
        status: response.status,
        error: response.statusText,
        message: response.statusText || 'Request failed',
        path,
        details: [],
      };
    }
    throw new ApiError(errorBody);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }
  // CSV / other binary-ish text exports
  return (await response.text()) as unknown as T;
}

function authHeaders(): Record<string, string> {
  const token = tokenStore.get();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseErrorBody(response: Response, path: string): Promise<ApiErrorBody> {
  try {
    return await response.json();
  } catch {
    return {
      timestamp: new Date().toISOString(),
      status: response.status,
      error: response.statusText,
      message: response.statusText || 'Request failed',
      path,
      details: [],
    };
  }
}

// Multipart upload — deliberately bypasses request()'s JSON Content-Type (the browser must set
// its own multipart boundary) and returns whatever JSON the endpoint responds with.
async function requestFile<T>(path: string, formData: FormData): Promise<T> {
  const response = await fetch(buildUrl(path), { method: 'POST', headers: authHeaders(), body: formData });
  if (response.status === 401) unauthorizedHandler?.();
  if (!response.ok) throw new ApiError(await parseErrorBody(response, path));
  return (await response.json()) as T;
}

// Binary download as a Blob — for endpoints that stream a file rather than return JSON (a plain
// <a href> can't carry the JWT, so downloads have to go through fetch like everything else).
async function requestBlob(path: string): Promise<Blob> {
  const response = await fetch(buildUrl(path), { method: 'GET', headers: authHeaders() });
  if (response.status === 401) unauthorizedHandler?.();
  if (!response.ok) throw new ApiError(await parseErrorBody(response, path));
  return await response.blob();
}

export const apiClient = {
  get: <T>(path: string, query?: RequestOptions['query']) => request<T>(path, { method: 'GET', query }),
  post: <T>(path: string, body?: unknown, query?: RequestOptions['query']) => request<T>(path, { method: 'POST', body, query }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string, body?: unknown) => request<T>(path, { method: 'DELETE', body }),
  postFile: <T>(path: string, formData: FormData) => requestFile<T>(path, formData),
  getBlob: (path: string) => requestBlob(path),
};
