import type { ApiErrorBody } from "@/lib/types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(status: number, body: ApiErrorBody | string) {
    const message =
      typeof body === "string"
        ? body
        : body.message || body.error || `Request failed (${status})`;
    super(message);
    this.name = "ApiError";
    this.status = status;
    if (typeof body !== "string") {
      this.code = body.code;
      this.details = body.details;
    }
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  idempotencyKey?: string;
  signal?: AbortSignal;
  formData?: FormData;
};

function buildUrl(path: string, query?: RequestOptions["query"]) {
  const absolute =
    path.startsWith("http")
      ? path
      : API_BASE
        ? `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`
        : path.startsWith("/")
          ? path
          : `/${path}`;

  // Relative same-origin paths (API proxied by Next) need a base in URL().
  const url =
    absolute.startsWith("http")
      ? new URL(absolute)
      : new URL(
          absolute,
          typeof window !== "undefined"
            ? window.location.origin
            : "http://localhost:3000",
        );

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...options.headers,
  };

  if (options.idempotencyKey) {
    headers["Idempotency-Key"] = options.idempotencyKey;
  }

  let body: BodyInit | undefined;
  if (options.formData) {
    body = options.formData;
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  const response = await fetch(buildUrl(path, options.query), {
    method: options.method || "GET",
    credentials: "include",
    headers,
    body,
    signal: options.signal,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    throw new ApiError(
      response.status,
      isJson ? (payload as ApiErrorBody) : String(payload),
    );
  }

  return payload as T;
}

export const http = {
  get: <T>(path: string, query?: RequestOptions["query"], signal?: AbortSignal) =>
    apiRequest<T>(path, { method: "GET", query, signal }),
  post: <T>(
    path: string,
    body?: unknown,
    opts?: Omit<RequestOptions, "method" | "body">,
  ) => apiRequest<T>(path, { method: "POST", body, ...opts }),
  patch: <T>(
    path: string,
    body?: unknown,
    opts?: Omit<RequestOptions, "method" | "body">,
  ) => apiRequest<T>(path, { method: "PATCH", body, ...opts }),
  delete: <T>(path: string, opts?: Omit<RequestOptions, "method">) =>
    apiRequest<T>(path, { method: "DELETE", ...opts }),
  upload: <T>(
    path: string,
    formData: FormData,
    opts?: Omit<RequestOptions, "method" | "formData" | "body">,
  ) => apiRequest<T>(path, { method: "POST", formData, ...opts }),
};
