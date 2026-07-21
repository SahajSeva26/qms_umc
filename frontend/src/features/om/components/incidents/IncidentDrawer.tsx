import { FiCheck, FiZap } from 'react-icons/fi'
import SideDrawer from '@/components/ui/SideDrawer'
import { Button } from '@/components/ui/button'
import type { Incident } from '@/features/fo/fo.types'
import { notifyChannels } from '@/features/fo/fo.service'
import type { DeviceCatalogItem } from '@/types/device.types'
import {
  CATEGORY_ICON, categoryLabel, deviceName, fmtDt, fmtMins, slaDisplay, severityStyle, statusStyle, statusLabel,
} from './incidents.ui'

interface IncidentDrawerProps {
  incident: Incident | null
  devices: DeviceCatalogItem[]
  onClose: () => void
  onAssign: (incident: Incident) => void
  onStart: (incident: Incident) => void
  onResolve: (incident: Incident) => void
  onClose_: (incident: Incident) => void
  onCancel: (incident: Incident) => void
}

// Full ticket lifecycle, including CLOSED — mirrors incidents.js's
// inOpenTicket() `stages` array exactly (the stepper always shows all 5
// steps even though the Kanban board itself only has 4 columns).
const STAGES: Incident['status'][] = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']

const IncidentDrawer = ({ incident, devices, onClose, onAssign, onStart, onResolve, onClose_, onCancel }: IncidentDrawerProps) => {
  if (!incident) {
    return <SideDrawer open={false} title="Incident" onClose={onClose}><div /></SideDrawer>
  }

  const t = incident
  const sla = slaDisplay(t)
  const sevStyle = severityStyle(t.severity)
  const statStyle = statusStyle(t.status)
  const curIdx = STAGES.indexOf(t.status)
  const recipients = notifyChannels(t)
  const Icon = CATEGORY_ICON[t.category]

  return (
    <SideDrawer open={!!incident} title={`${t.id} · ${t.title}`} onClose={onClose}>
      <div className="space-y-3">
        {/* Summary card */}
        <div className="rounded-xl border p-3" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface)' }}>
          <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full tracking-wide" style={{ background: sevStyle.bg, color: sevStyle.color }}>{t.severity}</span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full tracking-wide" style={{ background: statStyle.bg, color: statStyle.color }}>{statusLabel(t.status)}</span>
            {t.status !== 'CANCELLED' && sla.breachedBy > 0 && (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full tracking-wide" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
                SLA BREACHED · {fmtMins(sla.breachedBy)} over
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 font-extrabold text-[14px]" style={{ color: 'var(--qms-text)' }}>
            <Icon size={14} /> {t.title}
          </div>
          <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
            {categoryLabel(t.category)}{t.city ? ` · ${t.city}` : ''}{t.deviceId ? ` · device ${deviceName(devices, t.deviceId)}` : ''}
          </div>
          {t.notes && <div className="text-[12px] mt-1.5 whitespace-pre-wrap" style={{ color: 'var(--qms-text)' }}>{t.notes}</div>}
        </div>

        {/* Stepper + timestamps */}
        <div className="rounded-xl border p-3" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface)' }}>
          <div className="flex items-center gap-1.5 mb-3">
            {STAGES.map((s, i) => {
              const done = i < curIdx
              const cur = i === curIdx
              const dotBg = done ? 'var(--success)' : cur ? 'var(--qms-brand)' : 'var(--qms-surface-strong)'
              const dotColor = done || cur ? '#fff' : 'var(--qms-text-soft)'
              return (
                <div key={s} className="flex items-center gap-1.5 flex-1">
                  <div className="w-5.5 h-5.5 rounded-full grid place-items-center text-[11px] font-extrabold shrink-0" style={{ background: dotBg, color: dotColor }}>
                    {done ? <FiCheck size={12} /> : i + 1}
                  </div>
                  {i < STAGES.length - 1 && <div className="flex-1 h-0.5" style={{ background: i < curIdx ? 'var(--success)' : 'var(--qms-border)' }} />}
                </div>
              )
            })}
          </div>
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <div>
              <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>Raised</div>
              <div className="font-bold" style={{ color: 'var(--qms-text)' }}>{fmtDt(t.createdAt)}</div>
              <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>by {t.raisedByName || '—'}</div>
            </div>
            <div>
              <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>Assignee</div>
              <div className="font-bold" style={{ color: 'var(--qms-text)' }}>{t.assignedToName || '—'}</div>
              {t.assignedAt && <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{fmtDt(t.assignedAt)}</div>}
            </div>
            <div>
              <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>Started</div>
              <div style={{ color: 'var(--qms-text)' }}>{t.startedAt ? fmtDt(t.startedAt) : '—'}</div>
            </div>
            <div>
              <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>Resolved</div>
              <div style={{ color: 'var(--qms-text)' }}>{t.resolvedAt ? fmtDt(t.resolvedAt) : '—'}</div>
            </div>
          </div>
        </div>

        {/* SLA bar */}
        <div className="rounded-xl border p-3" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface)' }}>
          <div className="text-[11px] mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>SLA progress</div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--qms-surface-strong)' }}>
            <div className="h-full rounded-full" style={{ width: `${sla.pct}%`, background: sla.color }} />
          </div>
          <div className="flex justify-between text-[11px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
            <span>{fmtMins(sla.elapsedMin)} / {fmtMins(sla.slaMin)}</span>
            <span>{sla.breachedBy > 0 ? <b style={{ color: 'var(--danger)' }}>+{fmtMins(sla.breachedBy)} over</b> : 'within SLA'}</span>
          </div>
        </div>

        {/* Replacement suggestion. incidents.js:238-243 has an analogous
            panel with a "km away" distance suffix (itself a broken
            template-literal in the prototype — see PROGRESS.md). This
            codebase's device catalog/suggestReplacement() carry no distance
            concept at all (no km field exists anywhere on a device or on
            Incident), so rather than fabricate a field just to reproduce a
            cosmetic prototype typo, the distance suffix is omitted here. */}
        {t.replacementDeviceId && (
          <div className="rounded-xl border border-dashed p-3" style={{ borderColor: 'var(--qms-brand)', background: 'color-mix(in srgb, var(--qms-brand) 6%, transparent)' }}>
            <div className="flex items-center gap-1.5 font-extrabold text-[13px]" style={{ color: 'var(--qms-brand)' }}>
              <FiZap size={13} /> Replacement suggestion
            </div>
            <div className="text-[12px] mt-1.5">
              <b>{deviceName(devices, t.replacementDeviceId)}</b> ({t.replacementDeviceId})
            </div>
            {t.replacementNotes && <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>{t.replacementNotes}</div>}
          </div>
        )}

        {/* Notifications fan-out */}
        <div className="rounded-xl border p-3" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface)' }}>
          <div className="text-[11px] mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>Notifications fan-out (simulated)</div>
          <div className="flex flex-wrap gap-1">
            {recipients.map((r) => (
              <span key={r} className="text-[11px] font-semibold px-2 py-1 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text)' }}>{r}</span>
            ))}
          </div>
        </div>

        {/* Resolution notes */}
        {t.resolvedNotes && (
          <div className="rounded-xl border p-3" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface)' }}>
            <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>Resolution</div>
            <div className="text-[12px] mt-1 whitespace-pre-wrap" style={{ color: 'var(--qms-text)' }}>{t.resolvedNotes}</div>
          </div>
        )}

        {/* Audit trail */}
        <div className="rounded-xl border p-3" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface)' }}>
          <div className="text-[11px] mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>Audit trail</div>
          {(t.history ?? []).slice().reverse().map((a, i) => (
            <div key={i} className="text-[11px] py-1 border-t first:border-t-0" style={{ borderColor: 'var(--qms-border)' }}>
              <b>{fmtDt(a.at)}</b> · {a.by} · {a.action}{a.note ? ` · ${a.note}` : ''}
            </div>
          ))}
          {(!t.history || t.history.length === 0) && <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>No history yet</div>}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {t.status === 'OPEN' && <Button size="sm" onClick={() => onAssign(t)}>Assign</Button>}
          {t.status === 'ASSIGNED' && <Button size="sm" onClick={() => onStart(t)}>Start work</Button>}
          {t.status === 'IN_PROGRESS' && <Button size="sm" onClick={() => onResolve(t)}>Resolve</Button>}
          {t.status === 'RESOLVED' && <Button size="sm" onClick={() => onClose_(t)}>Close</Button>}
          {(t.status === 'OPEN' || t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS') && (
            <Button size="sm" variant="outline" style={{ color: 'var(--danger)' }} onClick={() => onCancel(t)}>Cancel</Button>
          )}
        </div>
      </div>
    </SideDrawer>
  )
}

export default IncidentDrawer
