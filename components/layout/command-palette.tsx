'use client'

import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import {
  GitBranchIcon,
  GearSixIcon,
  MagnifyingGlassIcon,
  SparkleIcon,
  SquaresFourIcon,
} from '@phosphor-icons/react'

import { listPaletteRepos } from '@/app/(app)/actions/palette'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { useUiStore } from '@/lib/stores/ui-store'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: SquaresFourIcon },
  { href: '/repositories', label: 'Repositories', icon: GitBranchIcon },
  { href: '/insights', label: 'Insights', icon: SparkleIcon },
  { href: '/settings', label: 'Settings', icon: GearSixIcon },
] as const

export function CommandPalette() {
  const router = useRouter()
  const commandOpen = useUiStore((state) => state.commandOpen)
  const setCommandOpen = useUiStore((state) => state.setCommandOpen)
  const toggleCommand = useUiStore((state) => state.toggleCommand)

  const reposQuery = useQuery({
    queryKey: ['palette-repos'],
    queryFn: listPaletteRepos,
    enabled: commandOpen,
    staleTime: 60_000,
  })

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'k' || !(event.metaKey || event.ctrlKey)) {
        return
      }
      event.preventDefault()
      toggleCommand()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [toggleCommand])

  const go = (href: string) => {
    setCommandOpen(false)
    router.push(href)
  }

  const openRepo = (url: string) => {
    setCommandOpen(false)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <CommandDialog
      open={commandOpen}
      onOpenChange={(open) => setCommandOpen(open)}
      title="Command palette"
      description="Jump to a page or search repositories"
    >
      <Command>
        <CommandInput placeholder="Search pages and repositories…" />
        <CommandList>
          <CommandEmpty>No matching pages or repositories.</CommandEmpty>
          <CommandGroup heading="Navigation">
            {NAV_ITEMS.map((item) => (
              <CommandItem
                key={item.href}
                value={`${item.label} ${item.href}`}
                onSelect={() => go(item.href)}
              >
                <item.icon className="size-3.5" />
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Repositories">
            {(reposQuery.data ?? []).map((repo) => (
              <CommandItem
                key={repo.htmlUrl}
                value={`${repo.name} repo ${repo.htmlUrl}`}
                onSelect={() => openRepo(repo.htmlUrl)}
              >
                <MagnifyingGlassIcon className="size-3.5" />
                {repo.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
