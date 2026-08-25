/**
 * Sanitizes a redirect URL to prevent open-redirect vulnerabilities.
 * Ensures the target URL is a relative internal path starting with a single '/'
 * and does not start with '//' or contain protocol schemes ('://').
 */
export function sanitizeCallbackUrl(url: string | null | undefined, fallback: string = "/trips"): string {
  if (!url) return fallback;

  const trimmed = url.trim();

  // Must start with '/' but NOT '//' (which indicates protocol-relative external URLs)
  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.includes("://") && !trimmed.includes("\\")) {
    return trimmed;
  }

  return fallback;
}
