export function safeNextPathServer(path: unknown, fallback: string, siteOrigin: string) {
  if (typeof path !== 'string' || !path.startsWith('/')) return fallback

  try {
    const url = new URL(path, siteOrigin)
    const origin = new URL(siteOrigin)
    return url.origin === origin.origin ? `${url.pathname}${url.search}${url.hash}` : fallback
  } catch {
    return fallback
  }
}

export const safeNextPath = (path: unknown, fallback = '/', origin?: string) => {
  if (typeof path !== 'string' || !path.startsWith('/')) return fallback

  const currentOrigin = origin ?? window.location.origin

  return safeNextPathServer(path, fallback, currentOrigin)
}
