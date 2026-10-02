import type { ApiErrorBody } from "@/lib/types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(status: number, body: ApiErrorBody | string) {
    const nestedError =
      typeof body === "object" && body.error && typeof body.error === "object"
        ? (body.error as { message?: unknown; code?: unknown; details?: unknown })
        : null;
    const details =
      typeof body === "object"
        ? body.details ?? nestedError?.details
        : undefined;
    const message =
      typeof body === "string"
        ? body
        : typeof body.message === "string"
          ? body.message
          : typeof nestedError?.message === "string"
            ? nestedError.message
            : `Request failed (${status})`;
    super(validationMessage(details) ? `${message}: ${validationMessage(details)}` : message);
    this.name = "ApiError";
    this.status = status;
    if (typeof body !== "string") {
      this.code =
        typeof body.code === "string"
          ? body.code
          : typeof nestedError?.code === "string"
            ? nestedError.code
            : undefined;
      this.details = details;
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

function validationMessage(details: unknown): string | undefined {
  if (!details || typeof details !== "object") return undefined;
  const value = details as {
    fieldErrors?: Record<string, string[]>;
    formErrors?: string[];
  };
  const fields = Object.entries(value.fieldErrors ?? {}).flatMap(([field, messages]) =>
    (messages ?? []).map((message) => `${field}: ${message}`),
  );
  return [...(value.formErrors ?? []), ...fields].filter(Boolean).join("; ") || undefined;
}

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
  put: <T>(
    path: string,
    body?: unknown,
    opts?: Omit<RequestOptions, "method" | "body">,
  ) => apiRequest<T>(path, { method: "PUT", body, ...opts }),
  delete: <T>(path: string, opts?: Omit<RequestOptions, "method">) =>
    apiRequest<T>(path, { method: "DELETE", ...opts }),
  upload: <T>(
    path: string,
    formData: FormData,
    opts?: Omit<RequestOptions, "method" | "formData" | "body">,
  ) => apiRequest<T>(path, { method: "POST", formData, ...opts }),
};
