/**
 * Canonical Application Origin Resolution
 *
 * RFPground Production Canonical Origin: https://rfpground.com
 * Local Development: http://localhost:3000 (or current local port)
 *
 * Vercel deployment URLs (*.vercel.app) must NEVER be used as the
 * user-facing authentication or callback origin.
 */

export const CANONICAL_PRODUCTION_ORIGIN = 'https://rfpground.com';

/**
 * Returns true if a given hostname represents a local development environment.
 */
export function isLocalhost(host?: string | null): boolean {
  if (!host) return false;
  const cleanHost = host.split(':')[0].toLowerCase();
  return cleanHost === 'localhost' || cleanHost === '127.0.0.1';
}

/**
 * Resolves the canonical origin based on the current context:
 * - In local development: preserves localhost origin (e.g. http://localhost:3000)
 * - In production, staging, Vercel deployments, or custom domains: strictly returns https://rfpground.com
 */
export function getCanonicalOrigin(requestOrUrl?: Request | URL | string | null): string {
  // 1. Client-side browser check
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (isLocalhost(hostname)) {
      return window.location.origin;
    }
    return CANONICAL_PRODUCTION_ORIGIN;
  }

  // 2. Server-side Request / URL check
  if (requestOrUrl) {
    try {
      let hostname: string | null = null;
      let hostHeader: string | null = null;

      if (typeof requestOrUrl === 'string') {
        const parsed = new URL(requestOrUrl);
        hostname = parsed.hostname;
        hostHeader = parsed.host;
      } else if (requestOrUrl instanceof URL) {
        hostname = requestOrUrl.hostname;
        hostHeader = requestOrUrl.host;
      } else if ('url' in requestOrUrl) {
        const parsed = new URL(requestOrUrl.url);
        hostname = parsed.hostname;
        // Check forwarded host or host header
        if ('headers' in requestOrUrl && typeof requestOrUrl.headers.get === 'function') {
          hostHeader = requestOrUrl.headers.get('x-forwarded-host') || requestOrUrl.headers.get('host') || parsed.host;
        } else {
          hostHeader = parsed.host;
        }
      }

      // Check whether this request is genuinely targeting localhost:
      // If a hostHeader is present and is NOT localhost (e.g. *.vercel.app or rfpground.com),
      // it must NEVER be treated as localhost!
      const effectiveHost = hostHeader || hostname;
      if (effectiveHost && isLocalhost(effectiveHost)) {
        return `http://${effectiveHost}`;
      }

      return CANONICAL_PRODUCTION_ORIGIN;
    } catch {
      // Fall through to canonical default
    }
  }

  // 3. Fallback to env var or canonical production domain
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl && isLocalhost(envUrl.replace(/^https?:\/\//, ''))) {
    return envUrl.replace(/\/$/, '');
  }

  return CANONICAL_PRODUCTION_ORIGIN;
}
