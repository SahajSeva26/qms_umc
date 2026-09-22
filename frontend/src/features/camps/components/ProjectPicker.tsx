import { useState } from 'react'
import { useAsyncPickerState } from '@/hooks/useAsyncPickerState'
import { useProjectPicker } from '@/hooks/useProjectPicker'
import { isForbiddenError } from '@/utils/apiError'
import type { ProjectEntity } from '@/types/project.types'
import AsyncPicker from '@/components/ui/AsyncPicker'

interface ProjectPickerProps {
  value: string
  label: string
  /** Scopes the search — no tenant selected means no fetch at all. */
  tenant: string | undefined
  /** Scopes the search further — no division selected means no fetch at all. */
  division: string | undefined
  /** Hands back the full picked project, not just its id — CampDetailPageReal needs its division/campTimeSlots immediately, not a second fetch. */
  onChange: (project: ProjectEntity) => void
  onClear: () => void
}

const projectLabel = (project: ProjectEntity) => `${project.name} (${project.code})`

const searchPlaceholder = (tenant: string | undefined, division: string | undefined) => {
  if (!tenant) return 'Select a company first'
  if (!division) return 'Select a division first'
  return 'Search project by name…'
}

const ProjectPicker = ({ value, label, tenant, division, onChange, onClear }: ProjectPickerProps) => {
  const [query, setQuery] = useState('')
  const { open, setOpen, containerRef } = useAsyncPickerState()

  const { projects, isFetching, error, hasMore, loadMore, refetch } = useProjectPicker(query, tenant, division, open)

  // AsyncPicker always calls onChange with a result straight from `projects`
  // (the same array it renders), so the find() below can't miss in practice.
  const handleChange = (id: string) => {
    if (!id) {
      onClear()
      return
    }
    const project = projects.find((p) => p.id === id)
    if (project) onChange(project)
  }

  // A 403 means the actor lacks project:search/camp:book/project:manage/tenant:manage — retrying never helps.
  const forbidden = isForbiddenError(error)

  return (
    <AsyncPicker<ProjectEntity>
      value={value}
      label={label}
      onChange={handleChange}
      query={query}
      onQueryChange={setQuery}
      open={open}
      onOpenChange={setOpen}
      containerRef={containerRef}
      results={projects}
      isFetching={isFetching && projects.length === 0}
      getId={(p) => p.id}
      getLabel={projectLabel}
      searchPlaceholder={searchPlaceholder(tenant, division)}
      clearAriaLabel="Clear selected project"
      emptyQueryText={tenant && division ? 'Start typing to search projects.' : undefined}
      noResultsText="No matching projects found."
      renderResult={(p) => <>{projectLabel(p)}</>}
      isError={!!error}
      errorText={forbidden ? "Your role doesn't have access to Projects — contact an admin to update your permissions." : 'Couldn\'t search projects. Try again.'}
      onRetry={forbidden ? undefined : () => refetch()}
      hasMore={hasMore}
      isLoadingMore={isFetching && projects.length > 0}
      onLoadMore={loadMore}
    />
  )
}

export default ProjectPicker
