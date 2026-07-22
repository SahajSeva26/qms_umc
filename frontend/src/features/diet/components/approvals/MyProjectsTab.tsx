import { useMemo } from 'react'
import type { Camp } from '@/types/camp.types'
import { CLIENTS } from '@/types/client.types'
import { PROJECTS } from '@/features/crm/clients/clients.mock'
import {
  isDietProject, coordScopedProjects, coordScopedClients, dietitianName, isTokenLocked, tokenHoursLeft, clientName,
} from '@/features/diet/dietitians.service'
import { fmtDate } from './helpers'

interface MyProjectsTabProps {
  camps: Camp[]
  adminLike: boolean
  coordId: string | null
}

const MyProjectsTab = ({ camps, adminLike, coordId }: MyProjectsTabProps) => {
  const noScope = !adminLike && !coordId

  const projects = useMemo(() => {
    const base = adminLike ? PROJECTS : coordScopedProjects(coordId || '')
    return base.filter(isDietProject)
  }, [adminLike, coordId])

  const clients = useMemo(() => {
    const base = adminLike ? CLIENTS : coordScopedClients(coordId || '')
    const dietClientIds = new Set(projects.map((p) => p.clientId))
    return base.filter((c) => dietClientIds.has(c.id))
  }, [adminLike, coordId, projects])

  const myCamps = useMemo(() => {
    const projectIds = new Set(projects.map((p) => p.id))
    return camps.filter((c) => c.type === 'Diet' && (!c.projectId || projectIds.has(c.projectId)))
  }, [camps, projects])

  if (noScope) {
    return (
      <div className="rounded-xl border p-8 text-center" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <p className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>Couldn't resolve your coordinator profile in the People master. Ask Admin to link your login.</p>
      </div>
    )
  }

  const liveOpen = myCamps.filter((c) => !/CANCEL/i.test(c.status) && c.status !== 'CLOSED').length
  const closed = myCamps.filter((c) => c.status === 'CLOSED').length
  const locked = myCamps.filter((c) => isTokenLocked(c)).length

  return (
    <div>
      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))' }}>
        <Kpi label="Companies" value={String(clients.length)} />
        <Kpi label="Projects" value={String(projects.length)} />
        <Kpi label="Diet camps total" value={String(myCamps.length)} />
        <Kpi label="Live / Open" value={String(liveOpen)} color="#047857" />
        <Kpi label="Closed" value={String(closed)} />
        <Kpi label="Locked submissions" value={String(locked)} color={locked > 0 ? '#b91c1c' : '#94a3b8'} />
      </div>

      <div className="rounded-xl border p-4 mb-4" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <h3 className="text-[13.5px] font-bold mb-2" style={{ color: 'var(--qms-text)' }}>My projects ({projects.length})</h3>
        {projects.length === 0 ? (
          <p className="text-[12.5px] py-4 text-center" style={{ color: 'var(--qms-text-muted)' }}>No projects assigned to you yet — ask Admin to set you as Project Coordinator on a project.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]" style={{ color: 'var(--qms-text)' }}>
              <thead>
                <tr>
                  <Th>Project</Th><Th>Company</Th><Th>Type</Th><Th>Status</Th><Th align="right">Diet camps</Th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => {
                  const campCount = myCamps.filter((c) => c.projectId === p.id).length
                  return (
                    <tr key={p.id} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                      <td className="py-1.5 px-2"><b>{p.name}</b> <span style={{ color: 'var(--qms-text-muted)' }}>{p.id}</span></td>
                      <td className="py-1.5 px-2">{clientName(p.clientId)}</td>
                      <td className="py-1.5 px-2">
                        {p.type}{' '}
                        {p.type === 'Mixed' ? (
                          <span title="Diet team can assign dietitians only — FO & Lab are view-only on mixed projects" className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,.18)', color: '#92400e' }}>DIET ASSIGN · FO/LAB VIEW-ONLY</span>
                        ) : (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,.16)', color: '#047857' }}>DIET ASSIGN</span>
                        )}
                      </td>
                      <td className="py-1.5 px-2">{p.status}</td>
                      <td className="py-1.5 px-2 text-right"><b>{campCount}</b></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border p-4" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <h3 className="text-[13.5px] font-bold mb-2" style={{ color: 'var(--qms-text)' }}>My diet camps ({myCamps.length})</h3>
        {myCamps.length === 0 ? (
          <p className="text-[12.5px] py-4 text-center" style={{ color: 'var(--qms-text-muted)' }}>No diet camps in your scope yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]" style={{ color: 'var(--qms-text)' }}>
              <thead>
                <tr><Th>Camp</Th><Th>Date</Th><Th>City</Th><Th>Dietitian</Th><Th>Status</Th><Th>Link</Th></tr>
              </thead>
              <tbody>
                {myCamps.map((c) => {
                  let link: { text: string; bg: string; color: string }
                  if (c.submissionCompleted) link = { text: 'SUBMITTED', bg: 'rgba(16,185,129,.16)', color: '#047857' }
                  else if (isTokenLocked(c)) link = { text: 'LOCKED', bg: 'rgba(244,63,94,.16)', color: '#b91c1c' }
                  else if (c.tokenActivatedAt) {
                    const hrs = tokenHoursLeft(c)
                    link = hrs !== null
                      ? { text: `${hrs.toFixed(1)}h left`, bg: 'rgba(245,158,11,.18)', color: '#92400e' }
                      : { text: 'ACTIVE', bg: 'rgba(59,109,255,.14)', color: '#1d4ed8' }
                  }
                  else link = { text: 'NOT SENT', bg: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }
                  return (
                    <tr key={c.id} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                      <td className="py-1.5 px-2"><b>{c.id}</b></td>
                      <td className="py-1.5 px-2">{fmtDate(c.date)}</td>
                      <td className="py-1.5 px-2">{c.city}</td>
                      <td className="py-1.5 px-2">{c.dietitianId ? dietitianName(c.dietitianId) : '—'}</td>
                      <td className="py-1.5 px-2">{c.status}</td>
                      <td className="py-1.5 px-2"><span className="text-[10.5px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: link.bg, color: link.color }}>{link.text}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function Kpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
      <div className="text-[10.5px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--qms-text-muted)' }}>{label}</div>
      <div className="text-[21px] font-extrabold leading-tight" style={{ color: color || 'var(--qms-text)' }}>{value}</div>
    </div>
  )
}

function Th({ children, align }: { children: React.ReactNode; align?: 'right' }) {
  return <th className={`py-1.5 px-2 text-[11px] font-semibold uppercase ${align === 'right' ? 'text-right' : 'text-left'}`} style={{ color: 'var(--qms-text-muted)' }}>{children}</th>
}

export default MyProjectsTab
