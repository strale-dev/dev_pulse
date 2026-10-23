import type { NextRequest } from 'next/server'

/** Canonical origin for the incoming request (Vercel/proxy-aware). */
export function requestSiteOrigin(request: NextRequest | Request): string {
  const headers = request.headers
  const forwardedHost = headers.get('x-forwarded-host')
  const forwardedProto = headers.get('x-forwarded-proto')

  if (forwardedHost) {
    const host = forwardedHost.split(',')[0]?.trim()
    const proto = forwardedProto?.split(',')[0]?.trim() ?? 'https'
    if (host) return `${proto}://${host}`.replace(/\/$/, '')
  }

  return new URL(request.url).origin.replace(/\/$/, '')
}

/** Browser OAuth must use the current tab origin so PKCE verifier cookies match the callback. */
export function browserSiteOrigin(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin.replace(/\/$/, '')
  }
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  return 'http://localhost:3000'
}
