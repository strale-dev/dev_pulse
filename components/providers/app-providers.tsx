'use client'

import { Toaster } from '@/components/ui/sonner'
import { QueryProvider } from '@/components/providers/query-provider'

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      {children}
      <Toaster richColors closeButton position="top-right" />
    </QueryProvider>
  )
}
