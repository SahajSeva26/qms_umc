import { useMemo, useState } from 'react'
import { FiBriefcase, FiRadio, FiClipboard, FiSliders, FiDownload, FiUserPlus, FiUserX } from 'react-icons/fi'
import { useProjectsDataShared } from '@/hooks/useProjectsDataShared'
import { usePeopleData } from '@/hooks/usePeopleData'
import { useCampsData } from '@/hooks/useCampsData'
import { useDedicatedOps } from '@/features/dedicatedops/hooks/useDedicatedOps'
import * as service from '@/features/dedicatedops/dedicatedops.service'
import KpiTile from '@/components/ui/KpiTile'
import { Button } from '@/components/ui/button'
import DoPill from '@/features/dedicatedops/components/DoPill'
import DoBar from '@/features/dedicatedops/components/DoBar'
import ConvertProjectModal from '@/features/dedicatedops/components/ConvertProjectModal'
import AssignFoModal from '@/features/dedicatedops/components/AssignFoModal'
import ProjectDetailDrawer from '@/features/dedicatedops/components/ProjectDetailDrawer'
import type { SopConfig, ManpowerRoleKey } from '@/features/dedicatedops/dedicatedops.types'
import { ROLE_LABELS } from '@/features/dedicatedops/dedicatedops.types'

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

const DedicatedOpsPage = () => {
  const { projects } = useProjectsDataShared()
  const { people: fos } = usePeopleData('Field Officer')
  const { people: allPeople } = usePeopleData()
  const { doctors } = useCampsData()
  const {
    projectConfigs, assignments, attendance, screenings,
    convertProject, assignFo, unassignFo, saveSop, resetSop,
  } = useDedicatedOps()

  const [tab, setTab] = useState<TabId>('projects')
  const [convertOpen, setConvertOpen] = useState(false)
  const [assignProjectId, setAssignProjectId] = useState<string | null>(null)
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

  const complianceByFo = useMemo(() => {
    return Object.values(assignments).map((a) => {
      const cfg = projectConfigs[a.projectId]
      const sop = cfg?.sopConfig ?? { minScreeningsPerDay: 10, uploadDeadlineHours: 12, geoTagRequired: true, selfieRequired: true, photoRequired: true } as SopConfig
      return service.complianceFor(a.foId, assignments, attendance, screenings, sop, today)
    }).filter((c): c is NonNullable<typeof c> => c !== null)
  }, [assignments, projectConfigs, attendance, screenings, today])

  const nonCompliant = useMemo(
    () => complianceByFo.filter((c) => !c.ok).sort((a, b) => b.overdueHours - a.overdueHours || (a.total - a.done) - (b.total - b.done)),
    [complianceByFo]
  )
  const overdueCount = nonCompliant.filter((c) => c.overdue).length
  const inProgressCount = nonCompliant.length - overdueCount
  const fullyCompliantCount = complianceByFo.filter((c) => c.ok).length

  const activeSopProjectId = sopProjectId ?? dedicatedProjects[0]?.id ?? null
  const activeSopProject = dedicatedProjects.find((p) => p.id === activeSopProjectId)
  const activeSopConfig = activeSopProjectId ? projectConfigs[activeSopProjectId]?.sopConfig : undefined

  const handleExport = (projectId: string) => {
    const attRows = attendance.filter((a) => a.projectId === projectId)
    const scrRows = screenings.filter((s) => s.projectId === projectId)
    service.downloadCsv(`${projectId}-attendance.csv`, service.toCsv(attRows, ['id', 'foId', 'date', 'checkInAt', 'checkOutAt', 'geoLat', 'geoLng', 'status']))
    service.downloadCsv(`${projectId}-screenings.csv`, service.toCsv(scrRows, ['id', 'date', 'foId', 'patientCode', 'age', 'gender', 'tests', 'risk', 'referredToDoctor']))
  }

  return (
    <div className="max-w-7xl">
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

      {tab === 'projects' && (
        <>
          <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
            <KpiTile label="Dedicated projects" value={String(dedicatedProjects.length)} tone="violet" icon={FiBriefcase} />
            <KpiTile label="FOs deployed" value={String(Object.keys(assignments).length)} tone="brand" icon={FiUserPlus} />
            <KpiTile label="Fully compliant" value={String(fullyCompliantCount)} tone="emerald" icon={FiClipboard} />
            <KpiTile label="Overdue" value={String(overdueCount)} tone="rose" icon={FiRadio} />
          </div>

          <div className="rounded-xl border overflow-x-auto" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)', backdropFilter: 'blur(20px)' }}>
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ background: 'var(--qms-surface-strong)' }}>
                  {['Project', 'Type', 'FO fill rate', 'Territory', 'Screenings', 'Status', ''].map((h) => (
                    <th key={h} className="text-left font-semibold px-3 py-2.5 text-[11px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dedicatedProjects.map((p) => {
                  const cfg = projectConfigs[p.id]
                  const onProject = service.fosOnProject(assignments, p.id)
                  const required = cfg?.manpowerRequired.fo ?? 0
                  const fillPct = required ? Math.round((onProject.length / required) * 100) : 0
                  const screeningsCount = screenings.filter((s) => s.projectId === p.id).length
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setOpenProjectId(p.id)}
                      className="border-t cursor-pointer"
                      style={{ borderColor: 'var(--qms-border)' }}
                    >
                      <td className="px-3 py-2.5">
                        <div className="font-semibold" style={{ color: 'var(--qms-text)' }}>{p.id}</div>
                        <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{p.name}</div>
                      </td>
                      <td className="px-3 py-2.5"><DoPill tone="dedi">Dedicated</DoPill></td>
                      <td className="px-3 py-2.5 w-40">
                        <div className="text-[11px] mb-1" style={{ color: 'var(--qms-text-muted)' }}>{onProject.length}/{required} FOs</div>
                        <DoBar pct={fillPct} color={fillPct >= 100 ? '#10b981' : '#f59e0b'} />
                      </td>
                      <td className="px-3 py-2.5" style={{ color: 'var(--qms-text-soft)' }}>{cfg?.territory.city || '—'}{cfg?.territory.state ? `, ${cfg.territory.state}` : ''}</td>
                      <td className="px-3 py-2.5 text-center tabular-nums" style={{ color: 'var(--qms-text)' }}>{screeningsCount}</td>
                      <td className="px-3 py-2.5"><DoPill tone={fillPct >= 100 ? 'ok' : 'warn'}>{fillPct >= 100 ? 'Fully staffed' : 'Understaffed'}</DoPill></td>
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <Button size="sm" variant="outline" onClick={() => setAssignProjectId(p.id)}>Assign FO</Button>
                          <Button size="sm" variant="ghost" onClick={() => handleExport(p.id)}><FiDownload size={12} /></Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {dedicatedProjects.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-8 text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>No dedicated projects yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'live' && (
        <div className="rounded-xl border overflow-x-auto" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)', backdropFilter: 'blur(20px)' }}>
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ background: 'var(--qms-surface-strong)' }}>
                {['Field Officer', 'Project · Doctor', 'Today', 'Geo', 'Screenings', 'SOP', 'Status'].map((h) => (
                  <th key={h} className="text-left font-semibold px-3 py-2.5 text-[11px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.values(assignments).map((a) => {
                const att = attendance.find((x) => x.foId === a.foId && x.date === today)
                const compliance = complianceByFo.find((c) => c.foId === a.foId)
                const doctor = doctors.find((d) => d.id === a.doctorId)
                const scrCount = screenings.filter((s) => s.foId === a.foId && s.date === today).length
                return (
                  <tr key={a.foId} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                    <td className="px-3 py-2.5 font-semibold" style={{ color: 'var(--qms-text)' }}>{a.foName}</td>
                    <td className="px-3 py-2.5" style={{ color: 'var(--qms-text-soft)' }}>{a.projectId} · {doctor?.name ?? a.clinicLabel}</td>
                    <td className="px-3 py-2.5 text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
                      {att?.checkInAt ? new Date(att.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      {' → '}
                      {att?.checkOutAt ? new Date(att.checkOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-[11px] tabular-nums" style={{ color: 'var(--qms-text-muted)' }}>
                      {att?.geoLat && att?.geoLng ? `${att.geoLat.toFixed(3)}, ${att.geoLng.toFixed(3)}` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-center tabular-nums" style={{ color: 'var(--qms-text)' }}>{scrCount}</td>
                    <td className="px-3 py-2.5 w-32">
                      {compliance && (
                        <>
                          <div className="text-[11px] mb-1" style={{ color: 'var(--qms-text-muted)' }}>{compliance.done}/{compliance.total}</div>
                          <DoBar pct={compliance.pct} color={compliance.ok ? '#10b981' : compliance.overdue ? '#ef4444' : '#f59e0b'} />
                        </>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <DoPill tone={compliance?.ok ? 'ok' : compliance?.overdue ? 'bad' : 'warn'}>
                          {compliance?.ok ? 'Compliant' : compliance?.overdue ? 'Overdue' : 'In progress'}
                        </DoPill>
                        <button onClick={() => unassignFo(a.foId)} aria-label="Unassign" style={{ color: 'var(--qms-text-muted)' }}>
                          <FiUserX size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {Object.keys(assignments).length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>No FOs currently deployed.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'compliance' && (
        <>
          <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
            <KpiTile label="Overdue" value={String(overdueCount)} tone="rose" icon={FiRadio} />
            <KpiTile label="In progress" value={String(inProgressCount)} tone="amber" icon={FiClipboard} />
            <KpiTile label="Fully compliant" value={String(fullyCompliantCount)} tone="emerald" icon={FiUserPlus} />
            <KpiTile label="Total tracked" value={String(complianceByFo.length)} tone="brand" icon={FiBriefcase} />
          </div>
          <div className="rounded-xl border overflow-x-auto" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)', backdropFilter: 'blur(20px)' }}>
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ background: 'var(--qms-surface-strong)' }}>
                  {['FO · Project', 'SOP', 'Missing', 'Since', 'Status', ''].map((h) => (
                    <th key={h} className="text-left font-semibold px-3 py-2.5 text-[11px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {nonCompliant.map((c) => (
                  <tr key={c.foId} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                    <td className="px-3 py-2.5">
                      <div className="font-semibold" style={{ color: 'var(--qms-text)' }}>{c.foName}</div>
                      <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{c.projectId}</div>
                    </td>
                    <td className="px-3 py-2.5 tabular-nums" style={{ color: 'var(--qms-text)' }}>{c.done}/{c.total}</td>
                    <td className="px-3 py-2.5 text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
                      {c.checks.filter((chk) => !chk.ok).map((chk) => chk.label).join(' · ')}
                    </td>
                    <td className="px-3 py-2.5 text-[11px] tabular-nums" style={{ color: 'var(--qms-text-muted)' }}>{Math.round(c.overdueHours)}h</td>
                    <td className="px-3 py-2.5"><DoPill tone={c.overdue ? 'bad' : 'warn'}>{c.overdue ? 'Overdue' : 'In progress'}</DoPill></td>
                    <td className="px-3 py-2.5"><Button size="sm" variant="outline">Nudge</Button></td>
                  </tr>
                ))}
                {nonCompliant.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>Everyone is fully compliant today.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'sop' && (
        <div className="max-w-2xl">
          <div className="mb-4">
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Project</label>
            <select
              value={activeSopProjectId ?? ''}
              onChange={(e) => setSopProjectId(e.target.value)}
              className="w-full text-[13px] rounded-lg border px-3 py-2"
              style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface)' }}
            >
              {dedicatedProjects.map((p) => <option key={p.id} value={p.id}>{p.id} · {p.name}</option>)}
            </select>
          </div>

          {activeSopConfig && activeSopProjectId && (
            <div className="rounded-xl border p-4 space-y-4" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Upload deadline (hrs)</label>
                  <input type="number" min={1} max={72} defaultValue={activeSopConfig.uploadDeadlineHours}
                    onBlur={(e) => saveSop(activeSopProjectId, { uploadDeadlineHours: Number(e.target.value) })}
                    className="w-full text-[13px] rounded-lg border px-2.5 py-1.5" style={{ borderColor: 'var(--qms-border)' }} />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Report TAT (hrs)</label>
                  <input type="number" min={1} max={72} defaultValue={activeSopConfig.reportTatHours}
                    onBlur={(e) => saveSop(activeSopProjectId, { reportTatHours: Number(e.target.value) })}
                    className="w-full text-[13px] rounded-lg border px-2.5 py-1.5" style={{ borderColor: 'var(--qms-border)' }} />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Min screenings/day</label>
                  <input type="number" min={0} defaultValue={activeSopConfig.minScreeningsPerDay}
                    onBlur={(e) => saveSop(activeSopProjectId, { minScreeningsPerDay: Number(e.target.value) })}
                    className="w-full text-[13px] rounded-lg border px-2.5 py-1.5" style={{ borderColor: 'var(--qms-border)' }} />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Weekly off</label>
                  <select defaultValue={activeSopConfig.weeklyOff}
                    onChange={(e) => saveSop(activeSopProjectId, { weeklyOff: e.target.value })}
                    className="w-full text-[13px] rounded-lg border px-2.5 py-1.5" style={{ borderColor: 'var(--qms-border)' }}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'None'].map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Working hours start</label>
                  <input type="time" defaultValue={activeSopConfig.workingHoursStart}
                    onBlur={(e) => saveSop(activeSopProjectId, { workingHoursStart: e.target.value })}
                    className="w-full text-[13px] rounded-lg border px-2.5 py-1.5" style={{ borderColor: 'var(--qms-border)' }} />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Working hours end</label>
                  <input type="time" defaultValue={activeSopConfig.workingHoursEnd}
                    onBlur={(e) => saveSop(activeSopProjectId, { workingHoursEnd: e.target.value })}
                    className="w-full text-[13px] rounded-lg border px-2.5 py-1.5" style={{ borderColor: 'var(--qms-border)' }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {([
                  ['photoRequired', 'Doctor clinic photo required'],
                  ['geoTagRequired', 'GPS geo-tag required'],
                  ['selfieRequired', 'Check-in selfie required'],
                  ['redactPatientIdsForPharma', 'Redact patient IDs for pharma'],
                ] as [keyof SopConfig, string][]).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-[12px] px-2.5 py-1.5 rounded-full border cursor-pointer" style={{ borderColor: 'var(--qms-border)' }}>
                    <input
                      type="checkbox"
                      defaultChecked={activeSopConfig[key] as boolean}
                      onChange={(e) => saveSop(activeSopProjectId, { [key]: e.target.checked } as Partial<SopConfig>)}
                    />
                    {label}
                  </label>
                ))}
              </div>

              <div>
                <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Mandatory fields (comma-separated)</label>
                <input defaultValue={activeSopConfig.mandatoryFields.join(', ')}
                  onBlur={(e) => saveSop(activeSopProjectId, { mandatoryFields: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                  className="w-full text-[13px] rounded-lg border px-2.5 py-1.5" style={{ borderColor: 'var(--qms-border)' }} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Escalation chain (comma-separated)</label>
                <input defaultValue={activeSopConfig.escalationChain.join(', ')}
                  onBlur={(e) => saveSop(activeSopProjectId, { escalationChain: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                  className="w-full text-[13px] rounded-lg border px-2.5 py-1.5" style={{ borderColor: 'var(--qms-border)' }} />
              </div>

              <p className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
                The FO portal reads these settings live — no code change needed to apply.
              </p>

              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => resetSop(activeSopProjectId)}>Reset to defaults</Button>
              </div>
            </div>
          )}

          {activeSopProject && projectConfigs[activeSopProject.id] && (
            <div className="mt-4 rounded-xl border p-4" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
              <h3 className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>Manpower required</h3>
              <div className="grid grid-cols-3 gap-2 text-[12px]">
                {(Object.keys(ROLE_LABELS) as ManpowerRoleKey[]).map((key) => (
                  <div key={key} className="flex justify-between px-2 py-1 rounded-lg" style={{ background: 'var(--qms-surface-strong)' }}>
                    <span style={{ color: 'var(--qms-text-muted)' }}>{ROLE_LABELS[key]}</span>
                    <span className="font-semibold" style={{ color: 'var(--qms-text)' }}>{projectConfigs[activeSopProject.id].manpowerRequired[key]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <ConvertProjectModal
        open={convertOpen}
        onClose={() => setConvertOpen(false)}
        eligibleProjects={eligibleProjects}
        onConfirm={(projectId, manpower, territory) => convertProject(projectId, manpower, territory)}
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
            assignFo({ ...args, projectId: assignProjectId, foName: fo?.name ?? args.foId })
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
        onUnassignFo={unassignFo}
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
