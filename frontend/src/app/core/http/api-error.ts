import { HttpErrorResponse } from '@angular/common/http';

export interface ApiError {
  status: number;
  message: string;
  /** Per-field messages from Spring's @Valid failures, keyed by field name. */
  fieldErrors: Record<string, string>;
}

/** Normalizes Spring's error bodies into one shape forms and screens can rely on. */
export function toApiError(err: HttpErrorResponse): ApiError {
  if (err.status === 0) {
    return { status: 0, message: 'Could not reach the server.', fieldErrors: {} };
  }

  const body = err.error ?? {};
  const fieldErrors: Record<string, string> = {};

  // Spring validation failures arrive as { errors: [{ field, defaultMessage }] }
  if (Array.isArray(body.errors)) {
    for (const e of body.errors) {
      if (e?.field) fieldErrors[e.field] = e.defaultMessage ?? 'Invalid value';
    }
  }

  return {
    status: err.status,
    message: body.message ?? body.error ?? err.message ?? 'Something went wrong.',
    fieldErrors,
  };
}
