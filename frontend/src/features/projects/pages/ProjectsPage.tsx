import { useMemo, useState } from 'react'
import { FiFileText, FiRefreshCw, FiDollarSign, FiPlus } from 'react-icons/fi'
import type { ProjectStatus } from '@/types/project.types'
import { useProjects } from '@/features/projects/hooks/useProjects'
import ProjectTable from '@/features/projects/components/ProjectTable'
import ProjectDetailDrawer from '@/features/projects/components/ProjectDetailDrawer'
import StatusChangeDialog from '@/features/projects/components/StatusChangeDialog'
import EditProjectModal from '@/features/projects/components/EditProjectModal'
import NewProjectWizard from '@/features/projects/components/wizard/NewProjectWizard'
import { Input } from '@/components/ui/input'

type Tab = 'all' | ProjectStatus

const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'live', label: 'Live' },
  { id: 'hold', label: 'Hold' },
  { id: 'closed', label: 'Closed' },
]

const HEADER_CHIPS = [
  { icon: null, label: 'Lifecycle · new → live/hold → closed', live: true },
  { icon: FiFileText, label: 'PO · Agreement · Mail-conf' },
  { icon: FiRefreshCw, label: 'Auto PO renewal reminder' },
  { icon: FiDollarSign, label: 'Invoice → Tally → GRN → Payment' },
]

// Filters/search now flow into the real server-side SearchProjectQuery
// (name/status), matching the real search endpoint's actual filter support,
// rather than the old mock's client-side filter over a fully-loaded array.
const ProjectsPage = () => {
  const [tab, setTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')
  const [openDetailId, setOpenDetailId] = useState<string | null>(null)
  const [statusChangeId, setStatusChangeId] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)

  const query = useMemo(
    () => ({
      ...(tab !== 'all' ? { status: tab } : {}),
      ...(search ? { name: search } : {}),
    }),
    [tab, search]
  )

  const { data, isLoading, error } = useProjects(query)
  const projects = data?.data?.items ?? []
  const count = data?.data?.count ?? 0

  const openDetail = projects.find((p) => p.id === openDetailId) ?? null
  const statusChangeProject = projects.find((p) => p.id === statusChangeId) ?? null
  const editProject = projects.find((p) => p.id === editId) ?? null

  return (
    <div className="max-w-7xl">
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
                {chip.live ? <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--success)' }} /> : chip.icon && <chip.icon size={11} />}
                {chip.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex gap-1.5">
          {TABS.map((t) => (
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
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by project name..."
            className="text-[13px] w-72"
          />
          <button
            onClick={() => setWizardOpen(true)}
            className="flex items-center gap-1.5 text-[13px] font-bold px-3.5 py-2 rounded-xl text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
          >
            <FiPlus size={14} /> New project
          </button>
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
