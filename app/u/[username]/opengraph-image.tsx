import { ImageResponse } from 'next/og'

import { loadPublicOgData } from '@/lib/profile/load-public-profile'

export const alt = 'DevPulse public profile'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

type ImageProps = {
  params: Promise<{ username: string }>
}

export default async function OpenGraphImage({ params }: ImageProps) {
  const { username } = await params
  const data = await loadPublicOgData(username)

  if (!data) {
    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#080B12',
            color: '#9aa4b2',
            fontSize: 28,
          }}
        >
          DevPulse
        </div>
      ),
      { ...size },
    )
  }

  const stats = [
    { label: 'Commits', value: data.totalCommits.toLocaleString() },
    { label: 'Contributions', value: data.totalContributions.toLocaleString() },
    { label: 'Repos', value: data.totalRepos.toLocaleString() },
  ]
  const chips = data.languageSegments.slice(0, 4)
  const initial = data.displayName.slice(0, 1).toUpperCase()

  let avatarSrc: string | null = null
  if (data.avatarUrl) {
    try {
      const response = await fetch(data.avatarUrl)
      if (response.ok) {
        const buffer = Buffer.from(await response.arrayBuffer())
        const mime = response.headers.get('content-type') ?? 'image/png'
        if (mime.startsWith('image/')) {
          avatarSrc = `data:${mime};base64,${buffer.toString('base64')}`
        }
      }
    } catch {
      avatarSrc = null
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '100%',
          height: '100%',
          background: '#080B12',
          color: '#e8eaed',
          padding: 64,
        }}
      >
        <div style={{ display: 'flex', fontSize: 22, color: '#7aa2f7', fontWeight: 600 }}>
          DevPulse
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {avatarSrc ? (
            <img
              src={avatarSrc}
              width={112}
              height={112}
              alt=""
              style={{ borderRadius: 56, objectFit: 'cover', marginRight: 28 }}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                width: 112,
                height: 112,
                borderRadius: 56,
                background: '#1b2230',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 36,
                fontWeight: 600,
                marginRight: 28,
              }}
            >
              {initial}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: 52, fontWeight: 600 }}>{data.displayName}</div>
            <div style={{ display: 'flex', fontSize: 26, color: '#9aa4b2', marginTop: 8 }}>
              @{data.githubLogin}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {stats.map((stat) => (
            <div key={stat.label} style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', fontSize: 36, fontWeight: 600 }}>{stat.value}</div>
              <div style={{ display: 'flex', fontSize: 18, color: '#9aa4b2', marginTop: 6 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex' }}>
          {chips.map((chip) => (
            <div
              key={chip.language}
              style={{
                display: 'flex',
                border: '1px solid #2a3344',
                borderRadius: 999,
                padding: '8px 16px',
                fontSize: 18,
                color: '#d0d7e2',
                marginRight: 12,
              }}
            >
              {chip.language}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  )
}
