import { getAccessToken, getRefreshToken, useAuthStore } from '../auth/session';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://mealdirectbackend.onrender.com/v1';

/**
 * Render's free tier sleeps after idle; the first request can take 30–50s to
 * wake the server. We allow a generous timeout so legitimate cold starts aren't
 * cut off, but still fail eventually instead of spinning forever.
 */
const REQUEST_TIMEOUT_MS = 60_000;

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: any[],
    public requestId?: string,
    /** The original error (TypeError/DOMException) when the request never completed. */
    public cause?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Log every failed request with full context so failures are never silent.
 * For backend errors this prints the real code/message/requestId; for network
 * failures it prints the underlying TypeError/DOMException so the browser's
 * Network tab and the true reason (CORS, offline, timeout) are discoverable.
 */
function logApiFailure(method: string, endpoint: string, err: ApiError): void {
  if (typeof console === 'undefined') return;
  const tag = `[API ${method} ${endpoint}] ${err.status} ${err.code}`;
  if (err.status === 0) {
    // Network-level: surface the original error object so devtools shows the cause.
    console.error(tag, err.message, '\n  cause:', err.cause ?? '(none)', '\n  requestId:', err.requestId);
  } else {
    console.error(tag, err.message, {
      requestId: err.requestId,
      details: err.details,
    });
  }
}

function buildHeaders(options: RequestInit, withAuth: boolean): Headers {
  const headers = new Headers(options.headers);
  headers.set('X-Request-ID', crypto.randomUUID());
  headers.set('Accept', 'application/json');

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (withAuth) {
    const token = getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  // Idempotency for mutations (order/payment mutations require it).
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes((options.method || 'GET').toUpperCase())) {
    if (!headers.has('Idempotency-Key')) {
      headers.set('Idempotency-Key', crypto.randomUUID());
    }
  }

  return headers;
}

async function parseError(response: Response, requestId: string): Promise<ApiError> {
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json().catch(() => null) : null;
  if (data?.error) {
    return new ApiError(
      response.status,
      data.error.code || 'UNKNOWN_API_ERROR',
      data.error.message || response.statusText,
      data.error.details,
      data.error.requestId || requestId
    );
  }
  return new ApiError(response.status, 'HTTP_ERROR', response.statusText, [], requestId);
}

let refreshInFlight: Promise<boolean> | null = null;

/** Attempt to refresh the access token. De-duplicated across concurrent 401s. */
async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) return false;
        const json = await res.json();
        const tokens = json?.data ?? json;
        if (tokens?.accessToken) {
          useAuthStore.getState().setSession(tokens);
          return true;
        }
        return false;
      } catch {
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

interface FetchOptions extends RequestInit {
  /** Set false for unauthenticated calls (login/refresh). Defaults to true. */
  auth?: boolean;
}

/**
 * fetch wrapper: attaches auth + request/idempotency headers, unwraps the
 * `{ data }` envelope, transparently refreshes on a single 401, and normalizes errors.
 */
export async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { auth = true, ...init } = options;
  const requestId = crypto.randomUUID();

  const doFetch = async () => {
    const headers = buildHeaders(init, auth);
    headers.set('X-Request-ID', requestId);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await fetch(`${API_BASE_URL}${endpoint}`, {
        ...init,
        headers,
        signal: init.signal ?? controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  };

  const method = (init.method || 'GET').toUpperCase();

  try {
    let response = await doFetch();

    // One transparent refresh-and-retry on 401 for authenticated calls.
    if (response.status === 401 && auth) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        response = await doFetch();
      } else {
        useAuthStore.getState().clearSession();
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
        throw await parseError(response, requestId);
      }
    }

    if (!response.ok) throw await parseError(response, requestId);

    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json() : null;
    return (data?.data ?? data) as T;
  } catch (error) {
    let apiError: ApiError;
    if (error instanceof ApiError) {
      apiError = error;
    } else if (error instanceof DOMException && error.name === 'AbortError') {
      apiError = new ApiError(
        0,
        'REQUEST_TIMEOUT',
        `The server took too long to respond (>${REQUEST_TIMEOUT_MS / 1000}s). It may be waking from sleep — please retry.`,
        [],
        requestId,
        error
      );
    } else if (error instanceof TypeError && /fetch|network/i.test(error.message)) {
      apiError = new ApiError(
        0,
        'NETWORK_ERROR',
        'Could not reach the server — possibly offline, blocked by CORS, or the server is waking up. See the browser console/Network tab for details.',
        [],
        requestId,
        error
      );
    } else {
      apiError = new ApiError(500, 'UNEXPECTED_ERROR', (error as Error).message, [], requestId, error);
    }
    logApiFailure(method, endpoint, apiError);
    throw apiError;
  }
}
