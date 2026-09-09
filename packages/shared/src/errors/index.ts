export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details?: unknown;
  readonly isOperational: boolean;

  constructor(
    message: string,
    options: {
      code: string;
      statusCode?: number;
      details?: unknown;
      cause?: unknown;
      isOperational?: boolean;
    },
  ) {
    super(message, { cause: options.cause });
    this.name = this.constructor.name;
    this.code = options.code;
    this.statusCode = options.statusCode ?? 500;
    this.details = options.details;
    this.isOperational = options.isOperational ?? true;
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }
}

export class AuthenticationError extends AppError {
  constructor(message = "Authentication required", details?: unknown) {
    super(message, { code: "AUTHENTICATION_ERROR", statusCode: 401, details });
  }
}

export class AuthorizationError extends AppError {
  constructor(message = "Insufficient permissions", details?: unknown) {
    super(message, { code: "AUTHORIZATION_ERROR", statusCode: 403, details });
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed", details?: unknown) {
    super(message, { code: "VALIDATION_ERROR", statusCode: 400, details });
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource", details?: unknown) {
    super(`${resource} not found`, { code: "NOT_FOUND", statusCode: 404, details });
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict", details?: unknown) {
    super(message, { code: "CONFLICT", statusCode: 409, details });
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Rate limit exceeded", details?: unknown) {
    super(message, { code: "RATE_LIMIT", statusCode: 429, details });
  }
}

export class ProviderError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, {
      code: "PROVIDER_ERROR",
      statusCode: 502,
      details,
      isOperational: true,
    });
  }
}

export class RealtimeError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, { code: "REALTIME_ERROR", statusCode: 500, details });
  }
}

export class ToolExecutionError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, { code: "TOOL_EXECUTION_ERROR", statusCode: 500, details });
  }
}

export class ConfigurationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, {
      code: "CONFIGURATION_ERROR",
      statusCode: 500,
      details,
      isOperational: false,
    });
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
