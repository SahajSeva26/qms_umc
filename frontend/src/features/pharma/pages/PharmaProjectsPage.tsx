import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePharmaProjects } from '@/features/pharma/hooks/usePharmaProjects'
import { PHARMA_ROUTES } from '@/features/pharma/pharma.constants'
import ProjectStatusPill from '@/features/projects/components/ProjectStatusPill'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import PaginationControls from '@/components/ui/PaginationControls'
import SearchInput from '@/components/ui/SearchInput'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { usePagination } from '@/hooks/usePagination'
import type { ProjectEntity } from '@/types/project.types'

const PAGE_SIZE = 10

// No "New Project" affordance — pharma never holds project:manage. All
// statuses are shown, never filtered to `live` — the backend itself doesn't enforce that restriction either.
const PharmaProjectsPage = () => {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const { page, setPage, totalPages, resetToFirstPage } = usePagination(PAGE_SIZE)
  const debouncedSearch = useDebouncedValue(search, 300)

  const { data, isLoading, error, refetch } = usePharmaProjects({
    name: debouncedSearch || undefined,
    page: String(page),
    limit: String(PAGE_SIZE),
  })
  const projects = data?.data?.items ?? []
  const totalCount = data?.data?.count ?? 0

  const handleSearchChange = (value: string) => {
    setSearch(value)
    resetToFirstPage()
  }

  return (
    <div className="w-full">
      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={handleSearchChange}
          placeholder="Search projects by name…"
          wrapperClassName="max-w-sm"
        />
      </div>

      <QueryStateBlock
        isLoading={isLoading}
        error={error}
        loadingLabel="Loading projects…"
        errorLabel="Failed to load projects. Please try again."
        onRetry={refetch}
      >
        {projects.length === 0 ? (
          <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
            No projects found in your division.
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map((project: ProjectEntity) => (
              <button
                key={project.id}
                type="button"
                onClick={() => navigate(PHARMA_ROUTES.PHARMA_PROJECT_CAMPS.replace(':id', project.id))}
                className="w-full flex items-center justify-between gap-3 rounded-xl border p-4 text-left transition-colors hover:bg-muted/50"
                style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
              >
                <div className="min-w-0">
                  <div className="text-[14px] font-bold truncate" style={{ color: 'var(--qms-text)' }}>{project.name}</div>
                  <div className="text-[12px] font-mono truncate" style={{ color: 'var(--qms-text-muted)' }}>{project.code}</div>
                </div>
                <ProjectStatusPill status={project.status} />
              </button>
            ))}
          </div>
        )}
        <PaginationControls page={page} totalPages={totalPages(totalCount)} onPageChange={setPage} />
      </QueryStateBlock>
    </div>
  )
}

export default PharmaProjectsPage
