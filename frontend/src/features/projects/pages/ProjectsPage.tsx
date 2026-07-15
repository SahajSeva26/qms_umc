import { useMemo, useState } from 'react'
import { FiFileText, FiRefreshCw, FiDollarSign, FiUpload, FiDownload, FiPlus } from 'react-icons/fi'
import type { ProjectStatus } from '@/types/project.types'
import { CLIENTS } from '@/types/client.types'
import { useAuth } from '@/hooks/useAuth'
import { useProjects } from '@/features/projects/hooks/useProjects'
import { useCampsData } from '@/hooks/useCampsData'
import { roleScopedProjects, projectSearchMatches, genProjectId } from '@/features/projects/projects.utils'
import ProjectTable from '@/features/projects/components/ProjectTable'
import ProjectDetailDrawer from '@/features/projects/components/ProjectDetailDrawer'
import StatusChangeDialog from '@/features/projects/components/StatusChangeDialog'
import CloseProjectDialog from '@/features/projects/components/CloseProjectDialog'
import RenewProjectDialog from '@/features/projects/components/RenewProjectDialog'
import VoidCampDialog from '@/features/projects/components/VoidCampDialog'
import NewProjectWizard from '@/features/projects/components/wizard/NewProjectWizard'
import { Input } from '@/components/ui/input'

type Tab = 'ALL' | ProjectStatus

const TABS: { id: Tab; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'LIVE', label: 'Live' },
  { id: 'HOLD', label: 'Hold' },
  { id: 'CLOSED', label: 'Closed' },
]

const HEADER_CHIPS = [
  { icon: null, label: 'Lifecycle · live', live: true },
  { icon: FiFileText, label: 'PO · Agreement · Mail-conf' },
  { icon: FiRefreshCw, label: 'Auto renewal at %' },
  { icon: FiDollarSign, label: 'Invoice → Tally → GRN → Payment' },
]

const ProjectsPage = () => {
  const { user } = useAuth()
  const { projects, createProject, updateProject, changeStatus, closeProject, reopenProject, renewProject, addVoidCamp, removeVoidCamp } = useProjects()
  const { camps } = useCampsData()

  const [tab, setTab] = useState<Tab>('ALL')
  const [search, setSearch] = useState('')
  const [openDetailId, setOpenDetailId] = useState<string | null>(null)
  const [statusChangeId, setStatusChangeId] = useState<string | null>(null)
  const [closeId, setCloseId] = useState<string | null>(null)
  const [renewId, setRenewId] = useState<string | null>(null)
  const [voidCampId, setVoidCampId] = useState<string | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  const scoped = useMemo(() => roleScopedProjects(projects, user?.role), [projects, user])

  const counts = useMemo(
    () => ({
      ALL: scoped.length,
      LIVE: scoped.filter((p) => p.status === 'LIVE').length,
      HOLD: scoped.filter((p) => p.status === 'HOLD').length,
      CLOSED: scoped.filter((p) => p.status === 'CLOSED').length,
    }),
    [scoped]
  )

  const filtered = useMemo(() => {
    return scoped.filter((p) => {
      if (tab !== 'ALL' && p.status !== tab) return false
      const clientName = CLIENTS.find((c) => c.id === p.clientId)?.name ?? ''
      return projectSearchMatches(p, clientName, search)
    })
  }, [scoped, tab, search])

  const openDetail = projects.find((p) => p.id === openDetailId) ?? null
  const statusChangeProject = projects.find((p) => p.id === statusChangeId) ?? null
  const closeProjectTarget = projects.find((p) => p.id === closeId) ?? null
  const renewProjectTarget = projects.find((p) => p.id === renewId) ?? null
  const voidCampProject = projects.find((p) => p.id === voidCampId) ?? null
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
        <div className="flex items-center gap-2 shrink-0">
          <button className="flex items-center gap-1.5 text-[13px] font-semibold px-3 py-2 rounded-xl border transition-colors" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }}>
            <FiUpload size={13} /> Import
          </button>
          <button className="flex items-center gap-1.5 text-[13px] font-semibold px-3 py-2 rounded-xl border transition-colors" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }}>
            <FiDownload size={13} /> Export
          </button>
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
              {t.label} <span className="opacity-80">{counts[t.id]}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID · name · client · PO"
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

      <ProjectTable
        projects={filtered}
        camps={camps}
        onOpenDetail={setOpenDetailId}
        onEdit={setEditId}
        onChangeStatus={setStatusChangeId}
        onRenew={setRenewId}
        onAddVoidCamp={setVoidCampId}
        onClose={setCloseId}
        onReopen={reopenProject}
      />

      <ProjectDetailDrawer project={openDetail} camps={camps} onClose={() => setOpenDetailId(null)} />

      {statusChangeProject && (
        <StatusChangeDialog
          project={statusChangeProject}
          onClose={() => setStatusChangeId(null)}
          onSave={(status, reason) => changeStatus(statusChangeProject.id, status, reason)}
        />
      )}

      {closeProjectTarget && (
        <CloseProjectDialog
          project={closeProjectTarget}
          onClose={() => setCloseId(null)}
          onConfirm={(reason) => closeProject(closeProjectTarget.id, reason)}
        />
      )}

      {renewProjectTarget && (
        <RenewProjectDialog
          project={renewProjectTarget}
          nextId={genProjectId(projects)}
          onClose={() => setRenewId(null)}
          onConfirm={(input) => renewProject(renewProjectTarget.id, input)}
        />
      )}

      {voidCampProject && (
        <VoidCampDialog
          project={voidCampProject}
          onClose={() => setVoidCampId(null)}
          onAdd={(input) => addVoidCamp(voidCampProject.id, { id: `void-${Date.now()}`, approvedAt: new Date().toISOString(), ...input })}
          onRemove={(voidCampId) => removeVoidCamp(voidCampProject.id, voidCampId)}
        />
      )}

      {(wizardOpen || editProject) && (
        <NewProjectWizard
          existingProjects={projects}
          editProject={editProject}
          onClose={() => { setWizardOpen(false); setEditId(null) }}
          onCreate={(project) => {
            createProject(project)
            setWizardOpen(false)
            setOpenDetailId(project.id)
          }}
          onUpdate={(project) => {
            updateProject(project)
            setEditId(null)
            setOpenDetailId(project.id)
          }}
        />
      )}
    </div>
  )
}

export default ProjectsPage
