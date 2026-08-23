// In local dev this stays relative and rides Vite's dev-server proxy (vite.config.ts).
// In production the frontend and backend are on separate domains, so VITE_BACKEND_URL
// must be set at build time to the backend's origin (e.g. https://api.example.com).
const backendUrl = import.meta.env.VITE_BACKEND_URL;
const API_BASE = backendUrl ? `${backendUrl}/api` : '/api';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Paths where a 401 is an expected outcome of a bad attempt (wrong password,
// duplicate email flow, etc.) rather than an existing session going invalid —
// these must never trigger the global forced-logout handler below.
const UNAUTHENTICATED_PATHS = ['/auth/login', '/auth/register'];

type UnauthorizedHandler = (message: string) => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    let message = 'Something went wrong. Please try again.';
    try {
      const body = await res.json();
      message = body.message ?? message;
    } catch {
      // response had no JSON body
    }
    const finalMessage = Array.isArray(message) ? message.join(', ') : message;

    // Passport's bare "Unauthorized" (no custom message) means no cookie was
    // ever sent at all — a first-time visitor, not someone whose session just
    // ended. Only surface the banner for our own, more specific messages.
    if (res.status === 401 && finalMessage !== 'Unauthorized' && !UNAUTHENTICATED_PATHS.includes(path)) {
      unauthorizedHandler?.(finalMessage);
    }

    throw new ApiError(res.status, finalMessage);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
