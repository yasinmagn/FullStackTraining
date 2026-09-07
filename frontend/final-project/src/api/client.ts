import { z } from 'zod';

/**
 * THE API CLIENT.
 *
 * One module owns every detail of talking to the server: the base URL, the auth
 * header, error shapes and response parsing. Nothing above this file knows that
 * `fetch` exists.
 *
 * That boundary is what let Stage 6's UI run against an in-memory fake and this
 * one run against a real PostgreSQL-backed API with no change to any component.
 */

/**
 * Empty by default, so requests are same-origin and Vite's dev proxy forwards
 * them (see vite.config.ts). Set VITE_API_BASE_URL in production.
 *
 * NOTE: anything behind a `VITE_` prefix is compiled into the bundle and shipped
 * to every visitor. Put a URL here; NEVER a secret.
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

// --- Schemas ---------------------------------------------------------------
//
// The server is a boundary, so its responses are untrusted input. Parsing them
// means a backend change that renames a field fails loudly HERE, with a message
// naming the field, rather than as `undefined` deep inside a component.

export const prioritySchema = z.enum(['low', 'medium', 'high']);
export const statusSchema = z.enum(['todo', 'in_progress', 'done']);

export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string(),
  role: z.enum(['user', 'admin']),
  createdAt: z.string(),
});

export const taskSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  priority: prioritySchema,
  status: statusSchema,
  dueDate: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable(),
});

export const taskPageSchema = z.object({
  data: z.array(taskSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number(),
  }),
});

export const statsSchema = z.object({
  total: z.number(),
  done: z.number(),
  open: z.number(),
  percentDone: z.number(),
});

export const authResultSchema = z.object({ user: userSchema, accessToken: z.string() });

export type Priority = z.infer<typeof prioritySchema>;
export type TaskStatus = z.infer<typeof statusSchema>;
export type Task = z.infer<typeof taskSchema>;
export type TaskPage = z.infer<typeof taskPageSchema>;
export type User = z.infer<typeof userSchema>;
export type Stats = z.infer<typeof statsSchema>;

// --- Errors ----------------------------------------------------------------

/**
 * Mirrors the API's error envelope, so a component can branch on `code` and
 * render `fieldErrors` under the right inputs.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** The token is missing, expired or invalid - the UI should send them to login. */
  get isUnauthenticated(): boolean {
    return this.status === 401;
  }
}

// --- The request function --------------------------------------------------

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  token?: string | null;
  timeoutMs?: number;
}

export async function apiRequest(path: string, options: RequestOptions = {}): Promise<unknown> {
  const { body, token, timeoutMs = 15_000, headers, ...init } = options;

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      // AbortSignal.timeout genuinely cancels the request, unlike Promise.race
      // which only stops you waiting for it.
      signal: init.signal ?? AbortSignal.timeout(timeoutMs),
      headers: {
        accept: 'application/json',
        ...(body !== undefined && { 'content-type': 'application/json' }),
        // The Authorization HEADER, never a ?token= query parameter: query
        // strings end up in server logs, browser history and Referer headers.
        ...(token && { authorization: `Bearer ${token}` }),
        ...headers,
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
  } catch (cause) {
    // `fetch` rejects only on NETWORK failure - offline, DNS, CORS, our timeout.
    const isTimeout = (cause as Error)?.name === 'TimeoutError';
    throw new ApiError(
      0,
      isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
      isTimeout ? 'The server took too long to respond.' : 'Could not reach the server. Is the API running?',
    );
  }

  // 204 No Content has no body to read.
  if (response.status === 204) return null;

  /*
   * Read the body ONCE, defensively. `response.json()` on an nginx 502 (which
   * returns HTML) throws a SyntaxError that says nothing about the real problem.
   */
  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  /*
   * fetch does NOT reject on 4xx/5xx - a 500 resolves with `ok: false`. This is
   * the single most common "why is my catch block never called" bug.
   */
  if (!response.ok) {
    const envelope = (payload as { error?: { code?: string; message?: string; details?: Record<string, string> } })
      ?.error;
    throw new ApiError(
      response.status,
      envelope?.code ?? 'HTTP_ERROR',
      envelope?.message ?? `${response.status} ${response.statusText}`,
      envelope?.details,
    );
  }

  return payload;
}

/** Request and parse in one step, so callers always get a typed value. */
export async function apiRequestParsed<T>(
  path: string,
  schema: z.ZodType<T>,
  options: RequestOptions = {},
): Promise<T> {
  const payload = await apiRequest(path, options);
  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    // Fail loudly at the boundary, naming the field, rather than letting an
    // `undefined` propagate into a component three layers away.
    throw new ApiError(
      // Status 0: this is a client-side CONTRACT failure, not an HTTP status.
      0,
      'RESPONSE_SHAPE',
      `The API returned an unexpected shape for ${path}: ${parsed.error.issues
        .map((i) => `${i.path.join('.')} ${i.message}`)
        .join('; ')}`,
    );
  }

  return parsed.data;
}

// --- Endpoints -------------------------------------------------------------

const envelope = <T>(schema: z.ZodType<T>) => z.object({ data: schema });

export const api = {
  register: (input: { email: string; displayName: string; password: string }) =>
    apiRequestParsed('/auth/register', envelope(authResultSchema), { method: 'POST', body: input }).then(
      (r) => r.data,
    ),

  login: (input: { email: string; password: string }) =>
    apiRequestParsed('/auth/login', envelope(authResultSchema), { method: 'POST', body: input }).then(
      (r) => r.data,
    ),

  me: (token: string) =>
    apiRequestParsed('/auth/me', envelope(userSchema), { token }).then((r) => r.data),

  listTasks: (token: string, params: Record<string, string | number | undefined>) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '' && value !== 'all') query.set(key, String(value));
    }
    return apiRequestParsed(`/api/tasks?${query}`, taskPageSchema, { token });
  },

  stats: (token: string) =>
    apiRequestParsed('/api/tasks/stats', envelope(statsSchema), { token }).then((r) => r.data),

  createTask: (token: string, input: Record<string, unknown>) =>
    apiRequestParsed('/api/tasks', envelope(taskSchema), { method: 'POST', body: input, token }).then(
      (r) => r.data,
    ),

  updateTask: (token: string, id: string, changes: Record<string, unknown>) =>
    apiRequestParsed(`/api/tasks/${id}`, envelope(taskSchema), {
      method: 'PATCH',
      body: changes,
      token,
    }).then((r) => r.data),

  deleteTask: (token: string, id: string) =>
    apiRequest(`/api/tasks/${id}`, { method: 'DELETE', token }).then(() => undefined),
};
