import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { billingProjectsService } from '@/features/billing/billingProjects.service'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useAsyncPickerState } from '@/hooks/useAsyncPickerState'
import type { ProjectEntity } from '@/features/projects/project.types'
import AsyncPicker from '@/components/ui/AsyncPicker'

interface BillingProjectPickerProps {
  value: string
  label: string
  onChange: (projectId: string, projectLabel: string) => void
}

// Displays the code once found, but search is name-only — the backend's
// project search has no code/ID typeahead support.
const projectLabel = (project: ProjectEntity) => `${project.name} (${project.code})`

const BillingProjectPicker = ({ value, label, onChange }: BillingProjectPickerProps) => {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 300)
  const { open, setOpen, containerRef } = useAsyncPickerState()

  const searchQuery = { name: debouncedQuery.trim(), limit: '10' }
  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ['billing', 'project-picker', searchQuery],
    queryFn: () => billingProjectsService.searchProjects(searchQuery),
    enabled: !!debouncedQuery.trim(),
  })
  const results = data?.data?.items ?? []

  return (
    <AsyncPicker<ProjectEntity>
      value={value}
      label={label}
      onChange={onChange}
      query={query}
      onQueryChange={setQuery}
      open={open}
      onOpenChange={setOpen}
      containerRef={containerRef}
      results={results}
      isFetching={isFetching}
      getId={(project) => project.id}
      getLabel={projectLabel}
      searchPlaceholder="Search project by name…"
      clearAriaLabel="Clear selected project"
      emptyQueryText="Type a project name to search."
      noResultsText="No matching projects found."
      renderResult={(project) => <>{projectLabel(project)}</>}
      isError={isError}
      errorText="Couldn't search projects. Try again."
      onRetry={() => refetch()}
    />
  )
}

export default BillingProjectPicker
