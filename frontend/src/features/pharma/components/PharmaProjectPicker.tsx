import { useState } from 'react'
import { useAsyncPickerState } from '@/hooks/useAsyncPickerState'
import { usePharmaProjectSearch } from '@/features/pharma/hooks/usePharmaProjectSearch'
import AsyncPicker from '@/components/ui/AsyncPicker'
import ProjectStatusPill from '@/features/projects/components/ProjectStatusPill'
import type { ProjectEntity } from '@/types/project.types'

interface PharmaProjectPickerProps {
  value: string
  label: string
  onChange: (projectId: string, projectLabel: string, project: ProjectEntity | null) => void
}

const projectLabel = (project: ProjectEntity) => `${project.name} (${project.code})`

// Same shape as MrPicker/DoctorDistancePicker — picked id/label live independently of the
// current query's results, so a new search never clears the selection.
const PharmaProjectPicker = ({ value, label, onChange }: PharmaProjectPickerProps) => {
  const [query, setQuery] = useState('')
  const { open, setOpen, containerRef } = useAsyncPickerState()

  const { projects, isFetching, error, refetch, hasMore, loadMore } = usePharmaProjectSearch(query, open)

  const handleChange = (projectId: string, projectLbl: string) => {
    const project = projects.find((p) => p.id === projectId) ?? null
    onChange(projectId, projectLbl, project)
  }

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
      getId={(project) => project.id}
      getLabel={projectLabel}
      searchPlaceholder="Search or browse projects…"
      clearAriaLabel="Clear selected project"
      emptyResultsText="No live projects found."
      noResultsText="No matching projects found."
      renderResult={(project) => (
        <span className="flex items-center gap-2">
          {projectLabel(project)}
          <ProjectStatusPill status={project.status} />
        </span>
      )}
      isError={!!error}
      errorText="Couldn't load projects. Try again."
      onRetry={() => refetch()}
      hasMore={hasMore}
      isLoadingMore={isFetching && projects.length > 0}
      onLoadMore={loadMore}
    />
  )
}

export default PharmaProjectPicker
