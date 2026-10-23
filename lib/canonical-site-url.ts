import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export function canonicalSiteOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (!raw) return null
  try {
    return new URL(raw).origin.replace(/\/$/, '')
  } catch {
    return null
  }
}

/** One production host for OAuth PKCE cookies (e.g. alias vs *.vercel.app deployment URL). */
export function redirectToCanonicalHost(request: NextRequest): NextResponse | null {
  const canonical = canonicalSiteOrigin()
  if (!canonical) return null

  const canonicalHost = new URL(canonical).host
  const requestHost =
    request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() ?? request.nextUrl.host

  if (!requestHost || requestHost === canonicalHost) return null

  const target = request.nextUrl.clone()
  target.protocol = 'https:'
  target.host = canonicalHost
  return NextResponse.redirect(target, 308)
}
