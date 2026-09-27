import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { DashboardPageSkeleton } from '@/components/dashboard/dashboard-page-skeleton'
import { RecentActivityList } from '@/components/dashboard/recent-activity-list'

describe('dashboard UI states', () => {
  it('renders loading skeleton for overview, top repos, and recent activity sections', () => {
    const html = renderToStaticMarkup(createElement(DashboardPageSkeleton))

    expect(html).toContain('Loading dashboard')
    expect(html.match(/data-slot="skeleton"/g)?.length).toBeGreaterThanOrEqual(10)
  })

  it('renders empty-state copy when recent activity is empty', () => {
    const html = renderToStaticMarkup(createElement(RecentActivityList, { days: [] }))

    expect(html).toContain('No recent activity')
    expect(html).toContain(
      'Commits, pull requests, and issues from the last sync will show up here.',
    )
  })
})
