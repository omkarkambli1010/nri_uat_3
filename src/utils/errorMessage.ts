// friendlyErrorMessage — extract a user-facing message from an API/network error.
//
// Axios sets `error.message` to "Request failed with status code NNN", which is
// meaningless to end users and must never be shown on the frontend. This helper
// prefers the backend's own message from the response body, then any *custom*
// error message, and otherwise falls back to a friendly default — always
// filtering out the Axios status-code string.

// Matches Axios's default network-error messages so they can be discarded.
const AXIOS_DEFAULT_RE = /request failed with status code|network error/i;

export function friendlyErrorMessage(
  err: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  const anyErr = err as
    | { response?: { data?: { detail?: string; message?: string; title?: string } }; message?: string }
    | undefined;

  const body = anyErr?.response?.data;
  const fromBody = body?.detail || body?.message || body?.title;
  if (typeof fromBody === "string" && fromBody.trim()) return fromBody;

  const raw = anyErr?.message;
  if (typeof raw === "string" && raw.trim() && !AXIOS_DEFAULT_RE.test(raw)) {
    return raw;
  }

  return fallback;
}
