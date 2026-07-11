import { useAuthStore } from '../auth/session';

/**
 * Base URLs.
 *
 * - Authenticated calls go through the same-origin BFF proxy (/api/proxy), which
 *   injects the bearer from an httpOnly cookie and refreshes on 401. The access
 *   token is never exposed to browser JS.
 * - Public calls (auth:false, e.g. /campuses, password-reset) go straight to the
 *   backend — they need no token.
 * - Endpoints that already start with /api/ are same-origin local routes
 *   (/api/auth/login etc.) and are called as-is.
 */
export const PROXY_BASE_URL = '/api/proxy';
export const PUBLIC_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://mealdirectbackend.onrender.com/v1';

/** @deprecated Use PROXY_BASE_URL / PUBLIC_API_BASE_URL. Kept for compatibility. */
export const API_BASE_URL = PUBLIC_API_BASE_URL;

function baseFor(endpoint: string, auth: boolean): string {
  if (endpoint.startsWith('/api/')) return '';
  return auth ? PROXY_BASE_URL : PUBLIC_API_BASE_URL;
}

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

function buildHeaders(options: RequestInit): Headers {
  const headers = new Headers(options.headers);
  headers.set('X-Request-ID', crypto.randomUUID());
  headers.set('Accept', 'application/json');

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // The bearer is injected server-side by the proxy from an httpOnly cookie; the
  // browser never holds or sends the token.

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
  const base = baseFor(endpoint, auth);
  // Same-origin calls (proxy + local /api routes) must carry cookies.
  const sameOrigin = base === PROXY_BASE_URL || base === '';

  const doFetch = async () => {
    const headers = buildHeaders(init);
    headers.set('X-Request-ID', requestId);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await fetch(`${base}${endpoint}`, {
        ...init,
        headers,
        credentials: sameOrigin ? 'include' : init.credentials,
        signal: init.signal ?? controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  };

  const method = (init.method || 'GET').toUpperCase();

  try {
    const response = await doFetch();

    // The proxy already refreshes the token on 401 and only surfaces a 401 when
    // the refresh itself failed. Treat that as a dead session: clear and bounce.
    if (response.status === 401 && auth) {
      useAuthStore.getState().clearSession();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
      throw await parseError(response, requestId);
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
