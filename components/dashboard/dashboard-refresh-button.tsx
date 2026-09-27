'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { ArrowsClockwiseIcon } from '@phosphor-icons/react'
import { toast } from 'sonner'

import { getLatestSyncRunSteps, runManualRefresh } from '@/app/(app)/actions/sync'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function DashboardRefreshButton() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: syncStatus } = useQuery({
    queryKey: ['sync-status'],
    queryFn: async () => {
      const latest = await getLatestSyncRunSteps()
      return latest?.status ?? null
    },
    refetchInterval: (query) => (query.state.data === 'running' ? 1000 : false),
  })

  const mutation = useMutation({
    mutationFn: runManualRefresh,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['sync-status'] })
      queryClient.setQueryData(['sync-status'], 'running')
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['sync-status'] })
      if (result.ok) {
        toast.success('GitHub data refreshed')
        await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        router.refresh()
      } else {
        toast.error(result.error)
      }
    },
    onError: () => {
      toast.error('Refresh failed. Please try again.')
      void queryClient.invalidateQueries({ queryKey: ['sync-status'] })
    },
  })

  const isSyncing = syncStatus === 'running' || mutation.isPending

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isSyncing}
      aria-busy={isSyncing}
      onClick={() => mutation.mutate()}
    >
      <ArrowsClockwiseIcon className={cn('size-3.5', isSyncing && 'animate-spin')} />
      {isSyncing ? 'Syncing…' : 'Refresh'}
    </Button>
  )
}
