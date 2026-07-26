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
