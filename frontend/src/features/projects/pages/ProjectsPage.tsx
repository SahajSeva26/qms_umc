import { useMemo, useState } from 'react'
import { FiFileText, FiRefreshCw, FiDollarSign, FiPlus } from 'react-icons/fi'
import type { ProjectStatus } from '@/types/project.types'
import { useProjects } from '@/features/projects/hooks/useProjects'
import { useProjectReport } from '@/features/projects/hooks/useProjectReport'
import { PROJECT_WRITE_PERMISSIONS } from '@/features/projects/projects.utils'
import { usePermission } from '@/hooks/usePermission'
import ProjectTable from '@/features/projects/components/ProjectTable'
import ProjectDetailDrawer from '@/features/projects/components/ProjectDetailDrawer'
import StatusChangeDialog from '@/features/projects/components/StatusChangeDialog'
import EditProjectModal from '@/features/projects/components/EditProjectModal'
import NewProjectWizard from '@/features/projects/components/wizard/NewProjectWizard'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

type Tab = 'all' | ProjectStatus

// Prototype's search covers ID/name/client/PO in one field; only `name` is a real backend filter
// (SearchProjectQuerySchema), so Code/Client show as disabled options rather than silently omitted.
type SearchBy = 'name' | 'code' | 'client'
const SEARCH_BY_OPTIONS: { value: SearchBy; label: string; disabled?: boolean }[] = [
  { value: 'name', label: 'Name' },
  { value: 'code', label: 'Code', disabled: true },
  { value: 'client', label: 'Client', disabled: true },
]
const SEARCH_BY_PLACEHOLDER: Record<SearchBy, string> = {
  name: 'Search by project name...',
  code: 'Search by code — not available yet',
  client: 'Search by client — not available yet',
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'live', label: 'Live' },
  { id: 'hold', label: 'Hold' },
  { id: 'closed', label: 'Closed' },
]

// Prototype's page-head chips (pages/projects.html) — copy matched verbatim; "Lifecycle · live"
// is the prototype's exact wording (a static badge, not describing our specific status set).
const HEADER_CHIPS = [
  { icon: null, label: 'Lifecycle · live', live: true },
  { icon: FiFileText, label: 'PO · Agreement · Mail-conf' },
  { icon: FiRefreshCw, label: 'Auto renewal at %' },
  { icon: FiDollarSign, label: 'Invoice → Tally → GRN → Payment' },
]

const ProjectsPage = () => {
  const { hasAnyPermission } = usePermission()
  const canWrite = hasAnyPermission(PROJECT_WRITE_PERMISSIONS)
  // GET /projects/report needs the same permission set — hide counts rather than let it 403
  // (mirrors ProjectGanttPage's own canViewReport gate for the same endpoint).
  const canViewReport = canWrite
  const { report } = useProjectReport(canViewReport)
  const tabCounts = report
    ? Object.fromEntries(report.byStatus.map((entry) => [entry.status, entry.count]))
    : undefined

  const [tab, setTab] = useState<Tab>('all')
  const [searchBy, setSearchBy] = useState<SearchBy>('name')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [openDetailId, setOpenDetailId] = useState<string | null>(null)
  const [statusChangeId, setStatusChangeId] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)

  const query = useMemo(
    () => ({
      ...(tab !== 'all' ? { status: tab } : {}),
      ...(searchBy === 'name' && debouncedSearch ? { name: debouncedSearch } : {}),
    }),
    [tab, searchBy, debouncedSearch]
  )

  const { data, isLoading, error } = useProjects(query)
  const projects = data?.data?.items ?? []
  const count = data?.data?.count ?? 0

  const openDetail = projects.find((p) => p.id === openDetailId) ?? null
  const statusChangeProject = projects.find((p) => p.id === statusChangeId) ?? null
  const editProject = projects.find((p) => p.id === editId) ?? null

  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <div className="text-[12px] mb-1" style={{ color: 'var(--qms-text-muted)' }}>Sales · Project Management</div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>Project Management</h1>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {HEADER_CHIPS.map((chip) => (
              <span
                key={chip.label}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}
              >
                {/* Prototype's .chip .dot (styles.css) — hardcoded emerald-500, not the app's
                    --success token (which is a different green in both themes). */}
                {chip.live ? <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#10b981', boxShadow: '0 0 0 4px rgba(16,185,129,.18)' }} /> : chip.icon && <chip.icon size={11} />}
                {chip.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex gap-1.5">
          {TABS.map((t) => {
            const tabCount = t.id === 'all' ? report?.summary.totalProjects : tabCounts?.[t.id]
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex items-center gap-1.5 text-[13px] font-semibold px-3.5 py-2 rounded-xl transition-colors"
                style={
                  tab === t.id
                    ? { background: 'var(--qms-brand)', color: '#fff' }
                    : { background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }
                }
              >
                {t.label}
                {tabCount !== undefined && <span style={{ opacity: 0.7 }}>{tabCount}</span>}
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-2">
          <Select value={searchBy} onValueChange={(v) => setSearchBy((v ?? 'name') as SearchBy)}>
            <SelectTrigger className="text-[13px] w-28">
              <SelectValue>{(v: string) => SEARCH_BY_OPTIONS.find((o) => o.value === v)?.label ?? 'Search by'}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SEARCH_BY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} disabled={o.disabled}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Matches the prototype's .input (styles.css:178-188), overriding the shared
              Input's own (different) defaults for this page specifically. */}
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={searchBy !== 'name'}
            placeholder={SEARCH_BY_PLACEHOLDER[searchBy]}
            className="h-auto text-[14px] w-72 py-3 px-3.5 rounded-[14px]"
            style={{ background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border-strong)' }}
          />
          {canWrite && (
            <button
              onClick={() => setWizardOpen(true)}
              className="flex items-center gap-1.5 text-[13px] font-bold px-3.5 py-2 rounded-xl text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
            >
              <FiPlus size={14} /> New project
            </button>
          )}
        </div>
      </div>

      {!isLoading && !error && (
        <div className="text-[12px] mb-2" style={{ color: 'var(--qms-text-muted)' }}>{count} project{count === 1 ? '' : 's'}</div>
      )}

      {isLoading && (
        <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>Loading projects…</div>
      )}

      {error && !isLoading && (
        <div className="text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
          Failed to load projects. Please try again.
        </div>
      )}

      {!isLoading && !error && (
        <ProjectTable
          projects={projects}
          canWrite={canWrite}
          onOpenDetail={setOpenDetailId}
          onEdit={setEditId}
          onChangeStatus={setStatusChangeId}
        />
      )}

      <ProjectDetailDrawer project={openDetail} onClose={() => setOpenDetailId(null)} />

      {statusChangeProject && (
        <StatusChangeDialog project={statusChangeProject} onClose={() => setStatusChangeId(null)} />
      )}

      {editProject && (
        <EditProjectModal project={editProject} onClose={() => setEditId(null)} />
      )}

      {wizardOpen && (
        <NewProjectWizard
          editProject={null}
          onClose={() => setWizardOpen(false)}
          onSaved={(id) => setOpenDetailId(id)}
        />
      )}
    </div>
  )
}

export default ProjectsPage
