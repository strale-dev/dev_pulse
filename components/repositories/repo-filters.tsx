'use client'

import { CaretDownIcon, MagnifyingGlassIcon } from '@phosphor-icons/react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  REPOSITORY_SORT_OPTIONS,
  type RepositorySortKey,
} from '@/lib/repositories/client-utils'

type RepoFiltersProps = {
  sort: RepositorySortKey
  query: string
  onSortChange: (sort: RepositorySortKey) => void
  onQueryChange: (query: string) => void
}

export function RepoFilters({ sort, query, onSortChange, onQueryChange }: RepoFiltersProps) {
  const sortLabel =
    REPOSITORY_SORT_OPTIONS.find((option) => option.value === sort)?.label ?? 'Sort'

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-sm">
        <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search repositories…"
          className="pl-8"
          aria-label="Search repositories"
        />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          className="inline-flex h-7 w-full items-center justify-between gap-2 rounded-md border border-border bg-transparent px-2 text-xs font-medium sm:min-w-52 sm:w-auto dark:bg-input/30"
        >
          {sortLabel}
          <CaretDownIcon className="size-3.5 opacity-70" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52">
          <DropdownMenuRadioGroup
            value={sort}
            onValueChange={(value) => onSortChange(value as RepositorySortKey)}
          >
            {REPOSITORY_SORT_OPTIONS.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value}>
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
