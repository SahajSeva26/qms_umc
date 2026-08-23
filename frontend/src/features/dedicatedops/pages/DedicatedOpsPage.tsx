import { useMemo, useState } from 'react'
import { FiBriefcase, FiRadio, FiClipboard, FiSliders } from 'react-icons/fi'
import { useProjectsDataShared } from '@/features/projects/hooks/useProjectsDataShared'
import { usePeopleData } from '@/hooks/usePeopleData'
import { useCampDoctors } from '@/features/camps/hooks/useCampDoctors'
import { useDedicatedOps } from '@/features/dedicatedops/hooks/useDedicatedOps'
import { useDedicatedOpsCompliance } from '@/features/dedicatedops/hooks/useDedicatedOpsCompliance'
import * as service from '@/features/dedicatedops/dedicatedops.service'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'
import ConvertProjectModal from '@/features/dedicatedops/components/ConvertProjectModal'
import AssignFoModal from '@/features/dedicatedops/components/AssignFoModal'
import ProjectDetailDrawer from '@/features/dedicatedops/components/ProjectDetailDrawer'
import ProjectsTab from '@/features/dedicatedops/components/tabs/ProjectsTab'
import LiveTab from '@/features/dedicatedops/components/tabs/LiveTab'
import ComplianceTab from '@/features/dedicatedops/components/tabs/ComplianceTab'
import SopTab from '@/features/dedicatedops/components/tabs/SopTab'
import type { Assignment } from '@/features/dedicatedops/dedicatedops.types'

type TabId = 'projects' | 'live' | 'compliance' | 'sop'

const TABS: { id: TabId; label: string; icon: typeof FiBriefcase }[] = [
  { id: 'projects', label: 'Projects', icon: FiBriefcase },
  { id: 'live', label: 'Live FOs', icon: FiRadio },
  { id: 'compliance', label: 'Compliance', icon: FiClipboard },
  { id: 'sop', label: 'SOP Configuration', icon: FiSliders },
]

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

// Page responsibilities: query coordination, tab selection, the indexes and
// derived data genuinely SHARED across tabs (Phase 2's Maps + the compliance
// rollup), the two actions shared between a tab and the drawer
// (handleUnassign, handleExport's service-layer call), and modal/drawer
// orchestration. Tab-specific rendering, form state and SOP derivation live
// in their own components under components/tabs/ — see each tab file for
// its own state-ownership notes.
const DedicatedOpsPage = () => {
  const { projects, isLoading: projectsLoading, error: projectsError } = useProjectsDataShared()
  // This screen only ever reads `people` — the device catalog is never
  // touched here, so both calls opt out of fetching it (see
  // usePeopleData.ts; today a no-op mock read, a real wasted request once a
  // backend device endpoint exists).
  const { people: fos } = usePeopleData('Field Officer', { devices: false })
  const { people: allPeople } = usePeopleData(undefined, { devices: false })
  const { doctors } = useCampDoctors()
  const {
    projectConfigs, assignments, attendance, screenings,
    isLoading: dedicatedOpsLoading, error: dedicatedOpsError,
    convertProject, assignFo, unassignFo, saveSop, resetSop,
  } = useDedicatedOps()

  // Both queries feed the same tables/KPIs below (dedicatedProjects/
  // eligibleProjects are derived from `projects`, everything else from the
  // dedicatedops query) — an in-flight or failed load on EITHER one must not
  // render as "No dedicated projects yet.", which is what happened before
  // this was consumed at all.
  const isLoading = projectsLoading || dedicatedOpsLoading
  const loadError = projectsError || dedicatedOpsError

  const [tab, setTab] = useState<TabId>('projects')
  const [convertOpen, setConvertOpen] = useState(false)
  const [assignProjectId, setAssignProjectId] = useState<string | null>(null)
  // Stays page-level (not owned by SopTab): ProjectDetailDrawer's "Edit SOP"
  // button sets this from OUTSIDE the SOP tab when jumping there.
  const [sopProjectId, setSopProjectId] = useState<string | null>(null)
  const [openProjectId, setOpenProjectId] = useState<string | null>(null)

  const dedicatedProjects = useMemo(
    () => projects.filter((p) => service.isDedicated(p, projectConfigs)),
    [projects, projectConfigs]
  )
  const eligibleProjects = useMemo(
    () => projects.filter((p) => !service.isDedicated(p, projectConfigs)),
    [projects, projectConfigs]
  )

  const today = todayIso()

  const {
    complianceByFo, complianceByFoId, nonCompliant,
    attendanceByFoAndDate, screeningsCountByFoAndDate,
  } = useDedicatedOpsCompliance({ assignments, projectConfigs, attendance, screenings, today })

  const overdueCount = nonCompliant.filter((c) => c.overdue).length
  const inProgressCount = nonCompliant.length - overdueCount
  const fullyCompliantCount = complianceByFo.filter((c) => c.ok).length

  // Indexed once per data change, shared by ProjectsTab and LiveTab — do not
  // let either tab rebuild these (see each tab's prop comments).
  const assignmentsByProjectId = useMemo(() => {
    const map = new Map<string, Assignment[]>()
    Object.values(assignments).forEach((a) => {
      const list = map.get(a.projectId)
      if (list) list.push(a)
      else map.set(a.projectId, [a])
    })
    return map
  }, [assignments])

  const screeningsCountByProjectId = useMemo(() => {
    const map = new Map<string, number>()
    screenings.forEach((s) => map.set(s.projectId, (map.get(s.projectId) ?? 0) + 1))
    return map
  }, [screenings])

  const doctorsById = useMemo(() => new Map(doctors.map((d) => [d.id, d] as const)), [doctors])

  // Shared between the Live tab's row action and ProjectDetailDrawer's own
  // unassign button — stays here rather than moving into LiveTab.
  const handleUnassign = async (foId: string) => {
    try {
      await unassignFo.mutateAsync(foId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not unassign the FO — try again.')
    }
  }

  // Only ProjectsTab uses this, but it stays here rather than moving down:
  // it calls the service layer directly (toCsv/downloadCsv) and needs the
  // full attendance/screenings rows (not the count-only indexes ProjectsTab
  // otherwise consumes), so passing those raw arrays into the tab just for
  // one rarely-used export button would widen its props for no benefit.
  const handleExport = (projectId: string) => {
    const attRows = attendance.filter((a) => a.projectId === projectId)
    const scrRows = screenings.filter((s) => s.projectId === projectId)
    service.downloadCsv(`${projectId}-attendance.csv`, service.toCsv(attRows, ['id', 'foId', 'date', 'checkInAt', 'checkOutAt', 'geoLat', 'geoLng', 'status']))
    service.downloadCsv(`${projectId}-screenings.csv`, service.toCsv(scrRows, ['id', 'date', 'foId', 'patientCode', 'age', 'gender', 'tests', 'risk', 'referredToDoctor']))
  }

  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--qms-text-muted)' }}>Operations · Dedicated Manpower</p>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>Dedicated Ops</h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
            Long-running FO deployments stationed at doctor clinics · per-project SOP, manpower roster, live attendance, compliance gates
          </p>
        </div>
        <Button onClick={() => setConvertOpen(true)} className="shrink-0">
          Convert project to Dedicated
        </Button>
      </div>

      <div className="flex flex-wrap gap-1 mb-4 border-b" style={{ borderColor: 'var(--qms-border)' }}>
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 text-[13px] font-semibold border-b-2 transition-colors"
              style={{
                color: tab === t.id ? 'var(--qms-text)' : 'var(--qms-text-muted)',
                borderBottomColor: tab === t.id ? 'var(--qms-brand)' : 'transparent',
              }}
            >
              <Icon size={13} /> {t.label}
            </button>
          )
        })}
      </div>

      {/* Every tab below derives from `projects` and/or `useDedicatedOps`'s
          data — a still-loading or failed fetch on either must not render as
          "No dedicated projects yet." / "No FOs currently deployed.", which
          is what an unconsumed isLoading/error looked like before. Same
          markup convention as DietPage.tsx. */}
      {isLoading && (
        <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
          Loading dedicated ops…
        </div>
      )}

      {loadError && !isLoading && (
        <div className="text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
          Failed to load dedicated ops data. Please try again.
        </div>
      )}

      {!isLoading && !loadError && (
        <>
          {tab === 'projects' && (
            <ProjectsTab
              dedicatedProjects={dedicatedProjects}
              projectConfigs={projectConfigs}
              assignmentsByProjectId={assignmentsByProjectId}
              screeningsCountByProjectId={screeningsCountByProjectId}
              fosDeployedCount={Object.keys(assignments).length}
              fullyCompliantCount={fullyCompliantCount}
              overdueCount={overdueCount}
              onOpenProject={setOpenProjectId}
              onAssignFo={setAssignProjectId}
              onExport={handleExport}
            />
          )}

          {tab === 'live' && (
            <LiveTab
              assignments={assignments}
              today={today}
              attendanceByFoAndDate={attendanceByFoAndDate}
              screeningsCountByFoAndDate={screeningsCountByFoAndDate}
              complianceByFoId={complianceByFoId}
              doctorsById={doctorsById}
              onUnassign={handleUnassign}
            />
          )}

          {tab === 'compliance' && (
            <ComplianceTab
              nonCompliant={nonCompliant}
              overdueCount={overdueCount}
              inProgressCount={inProgressCount}
              fullyCompliantCount={fullyCompliantCount}
              totalTrackedCount={complianceByFo.length}
            />
          )}

          {tab === 'sop' && (
            <SopTab
              dedicatedProjects={dedicatedProjects}
              projectConfigs={projectConfigs}
              sopProjectId={sopProjectId}
              onSopProjectIdChange={setSopProjectId}
              onSaveSop={(projectId, patch) => saveSop.mutateAsync({ projectId, patch })}
              onResetSop={(projectId) => resetSop.mutateAsync(projectId)}
            />
          )}
        </>
      )}

      <ConvertProjectModal
        open={convertOpen}
        onClose={() => setConvertOpen(false)}
        eligibleProjects={eligibleProjects}
        onConfirm={(projectId, manpower, territory) => convertProject.mutateAsync({ projectId, manpowerRequired: manpower, territory })}
      />

      {assignProjectId && (
        <AssignFoModal
          open={!!assignProjectId}
          onClose={() => setAssignProjectId(null)}
          projectId={assignProjectId}
          fos={fos}
          doctors={doctors}
          assignments={assignments}
          onConfirm={(args) => {
            const fo = fos.find((f) => f.id === args.foId)
            return assignFo.mutateAsync({ ...args, projectId: assignProjectId, foName: fo?.name ?? args.foId })
          }}
        />
      )}

      <ProjectDetailDrawer
        open={!!openProjectId}
        onClose={() => setOpenProjectId(null)}
        projectId={openProjectId}
        project={dedicatedProjects.find((p) => p.id === openProjectId)}
        projectConfig={openProjectId ? projectConfigs[openProjectId] : undefined}
        assignments={assignments}
        attendance={attendance}
        people={allPeople}
        doctors={doctors}
        onAssignFo={(projectId) => setAssignProjectId(projectId)}
        onUnassignFo={handleUnassign}
        onGoToSop={() => {
          if (openProjectId) setSopProjectId(openProjectId)
          setOpenProjectId(null)
          setTab('sop')
        }}
      />
    </div>
  )
}

export default DedicatedOpsPage
