import SideDrawer from '@/components/ui/SideDrawer'
import { Button } from '@/components/ui/button'
import { FiUserPlus, FiUserX, FiSliders, FiCheck, FiX } from 'react-icons/fi'
import type { ProjectEntity, ProjectStatus } from '@/types/project.types'
import { PROJECT_STATUS_LABEL, PROJECT_THERAPY_LABEL } from '@/types/project.types'
import { projectTenantName } from '@/features/projects/projects.utils'
import type { Person } from '@/types/people.types'
import type { Doctor } from '@/types/camp.types'
import type { Assignment, Attendance, DedicatedProjectConfig, ManpowerRoleKey } from '@/features/dedicatedops/dedicatedops.types'
import { DEFAULT_SOP, ROLE_LABELS } from '@/features/dedicatedops/dedicatedops.types'
import DoPill from '@/features/dedicatedops/components/DoPill'
import type { DoPillTone } from '@/features/dedicatedops/components/DoPill'

interface ProjectDetailDrawerProps {
  open: boolean
  onClose: () => void
  projectId: string | null
  onGoToSop?: () => void
  project?: ProjectEntity
  projectConfig?: DedicatedProjectConfig
  assignments: Record<string, Assignment>
  attendance: Attendance[]
  people: Person[]
  doctors: Doctor[]
  onAssignFo: (projectId: string) => void
  onUnassignFo: (foId: string) => void
}

// Same deterministic-hash-to-color avatar background as the prototype's
// stringToColor() (dedicated-ops.js:27-31).
const AVATAR_PALETTE = ['#3b6dff', '#a855f7', '#10b981', '#f59e0b', '#0ea5e9', '#ec4899', '#14b8a6', '#7c5cff', '#f43f5e', '#84cc16']
function stringToColor(s: string): string {
  let h = 0
  for (let i = 0; i < (s || '').length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length]
}
function initials(n: string): string {
  return (n || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}
function fmtTime(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
}
function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

// Project.status is the real lifecycle status (new/live/hold/closed), not
// the fill-rate pill — matches the prototype's status pill on the drawer
// header (dedicated-ops.js:175) which is a separate pill from the fill-rate
// bar. Real backend model has 4 values (new/live/hold/closed), not the old
// mock's 3 (LIVE/HOLD/CLOSED).
const STATUS_TONE: Record<ProjectStatus, DoPillTone> = { new: 'info', live: 'ok', hold: 'warn', closed: 'info' }

const ProjectDetailDrawer = ({
  open, onClose, projectId, onGoToSop,
  project, projectConfig, assignments, attendance, people, doctors,
  onAssignFo, onUnassignFo,
}: ProjectDetailDrawerProps) => {
  if (!project || !projectId) {
    return (
      <SideDrawer open={open} title="Project" onClose={onClose}>
        <p className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>Project not found.</p>
      </SideDrawer>
    )
  }

  const cfg = projectConfig
  const mp = cfg?.manpowerRequired
  const sop = cfg?.sopConfig ?? DEFAULT_SOP
  const territory = cfg?.territory
  const fos = Object.values(assignments).filter((a) => a.projectId === projectId)
  const today = todayIso()

  return (
    <SideDrawer open={open} title={`Project · ${project.name || project.id}`} onClose={onClose}>
      {/* Header */}
      <div className="rounded-xl border p-3 mb-2.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <DoPill tone="dedi">DEDICATED</DoPill>
            <DoPill tone={STATUS_TONE[project.status] ?? 'info'}>{PROJECT_STATUS_LABEL[project.status] || '—'}</DoPill>
          </div>
          <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{project.id}</div>
        </div>
        <div className="mt-1.5 font-bold text-[14px]" style={{ color: 'var(--qms-text)' }}>{project.name || project.id}</div>
        <div className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
          {projectTenantName(project)}{project.therapy ? ` · ${PROJECT_THERAPY_LABEL[project.therapy]}` : ''}
        </div>
        <div className="text-[12px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
          Territory: {territory?.city || '—'}{territory?.state ? `, ${territory.state}` : ''}{territory?.zone ? ` · ${territory.zone} zone` : ''}
        </div>
      </div>

      {/* Manpower requirement */}
      <div className="rounded-xl border p-3 mb-2.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="text-[11px] mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>Manpower requirement</div>
        {mp ? (
          (Object.keys(mp) as ManpowerRoleKey[]).map((k) => {
            const need = mp[k] || 0
            const have = k === 'fo' ? fos.length : 0
            const pct = need ? Math.min(100, Math.round((100 * have) / need)) : have ? 100 : 0
            const filled = need > 0 && have >= need
            return (
              <div key={k} className="py-1 border-b border-dashed last:border-b-0" style={{ borderColor: 'var(--qms-border)' }}>
                <div className="flex justify-between text-[12px] font-semibold" style={{ color: 'var(--qms-text)' }}>
                  <span>{ROLE_LABELS[k] || k}</span>
                  <span>{have} / {need}</span>
                </div>
                <div className="h-1 rounded-full overflow-hidden mt-1 w-full" style={{ background: 'var(--qms-surface-strong)' }}>
                  <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: filled ? 'var(--success)' : 'var(--warning)' }} />
                </div>
              </div>
            )
          })
        ) : (
          <div className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>No manpower requirement configured.</div>
        )}
      </div>

      {/* Assigned FOs */}
      <div className="rounded-xl border p-3 mb-2.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>Assigned FOs</div>
          <Button size="sm" variant="outline" onClick={() => onAssignFo(projectId)}>
            <FiUserPlus size={12} /> Assign
          </Button>
        </div>
        {fos.length ? (
          fos.map((a) => {
            const fo = people.find((p) => p.id === a.foId)
            const foName = fo?.name || a.foName || a.foId
            const doctor = doctors.find((d) => d.id === a.doctorId)
            const att = attendance.find((x) => x.foId === a.foId && x.date === today)
            const pillTone: DoPillTone = att?.checkInAt ? (att.checkOutAt ? 'info' : 'ok') : 'warn'
            const pillLabel = att?.checkInAt
              ? (att.checkOutAt ? `CLOSED ${fmtTime(att.checkOutAt)}` : `IN ${fmtTime(att.checkInAt)}`)
              : 'NO CHECK-IN'
            return (
              <div key={a.foId} className="flex items-center gap-2 py-1.5 border-b border-dashed last:border-b-0" style={{ borderColor: 'var(--qms-border)' }}>
                <div
                  className="w-[26px] h-[26px] rounded-full grid place-items-center text-white font-extrabold text-[10px] shrink-0"
                  style={{ background: stringToColor(foName) }}
                >
                  {initials(foName)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[12px] truncate" style={{ color: 'var(--qms-text)' }}>{foName}</div>
                  <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>
                    Doctor {doctor?.name || a.doctorId || '—'}{a.clinicLabel ? ` · ${a.clinicLabel}` : ''}
                  </div>
                </div>
                <DoPill tone={pillTone}>{pillLabel}</DoPill>
                <button
                  onClick={() => onUnassignFo(a.foId)}
                  aria-label="Unassign"
                  style={{ color: 'var(--danger)' }}
                >
                  <FiUserX size={13} />
                </button>
              </div>
            )
          })
        ) : (
          <div className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>No FOs assigned yet</div>
        )}
      </div>

      {/* SOP summary */}
      <div className="rounded-xl border p-3 mb-2.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="text-[11px] mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>SOP summary</div>
        <div className="grid grid-cols-2 gap-1.5 text-[12px]" style={{ color: 'var(--qms-text)' }}>
          <div><b>Upload SLA:</b> {sop.uploadDeadlineHours}h</div>
          <div><b>Report TAT:</b> {sop.reportTatHours}h</div>
          <div className="flex items-center gap-1">
            <b>Photo required:</b> {sop.photoRequired ? <FiCheck size={13} style={{ color: 'var(--success)' }} /> : <FiX size={13} style={{ color: 'var(--danger)' }} />}
          </div>
          <div className="flex items-center gap-1">
            <b>Geo required:</b> {sop.geoTagRequired ? <FiCheck size={13} style={{ color: 'var(--success)' }} /> : <FiX size={13} style={{ color: 'var(--danger)' }} />}
          </div>
          <div className="flex items-center gap-1">
            <b>Selfie required:</b> {sop.selfieRequired ? <FiCheck size={13} style={{ color: 'var(--success)' }} /> : <FiX size={13} style={{ color: 'var(--danger)' }} />}
          </div>
          <div><b>Min screenings/day:</b> {sop.minScreeningsPerDay}</div>
          <div><b>Working hrs:</b> {sop.workingHoursStart}–{sop.workingHoursEnd}</div>
          <div><b>Weekly off:</b> {sop.weeklyOff || '—'}</div>
          <div className="col-span-2"><b>Mandatory fields:</b> {(sop.mandatoryFields || []).join(', ')}</div>
          <div className="col-span-2 flex items-center gap-1">
            <b>Pharma reports redact PII:</b> {sop.redactPatientIdsForPharma ? <FiCheck size={13} style={{ color: 'var(--success)' }} /> : <FiX size={13} style={{ color: 'var(--danger)' }} />}
          </div>
        </div>
        <Button variant="outline" className="mt-2.5" onClick={() => onGoToSop?.()}>
          <FiSliders size={13} /> Edit SOP
        </Button>
      </div>
    </SideDrawer>
  )
}

export default ProjectDetailDrawer
