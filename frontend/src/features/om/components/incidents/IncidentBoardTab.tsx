import { useMemo } from 'react'
import { FiTool } from 'react-icons/fi'
import KpiTile from '@/components/ui/KpiTile'
import type { Incident } from '@/features/fo/fo.types'
import type { DeviceCatalogItem } from '@/types/device.types'
import { computeSlaState } from '@/features/fo/fo.service'
import {
  BOARD_COLUMNS, CATEGORY_ICON, categoryLabel, deviceName, fmtMins, slaDisplay, severityStyle, severityWeight,
} from './incidents.ui'

interface IncidentBoardTabProps {
  incidents: Incident[]
  devices: DeviceCatalogItem[]
  machineFlagCount: number
  onOpenTicket: (incident: Incident) => void
}

// Kanban board — mirrors incidents.js's tabBoard(): 4 columns (OPEN,
// ASSIGNED, IN_PROGRESS, RESOLVED — CANCELLED and CLOSED are deliberately
// excluded from the board, matching the prototype's `cols` array exactly),
// each card sorted by severity then age, plus the same 5 KPI tiles.
const IncidentBoardTab = ({ incidents, devices, machineFlagCount, onOpenTicket }: IncidentBoardTabProps) => {
  const kpis = useMemo(() => {
    const active = incidents.filter((i) => i.status === 'OPEN' || i.status === 'ASSIGNED' || i.status === 'IN_PROGRESS')
    const criticalHigh = active.filter((i) => i.severity === 'CRITICAL' || i.severity === 'HIGH').length
    const slaBreached = active.filter((i) => computeSlaState(i).breached).length
    const resolvedAllTime = incidents.filter((i) => i.status === 'RESOLVED' || i.status === 'CLOSED').length
    return { activeCount: active.length, criticalHigh, slaBreached, resolvedAllTime }
  }, [incidents])

  const columns = useMemo(() => {
    return BOARD_COLUMNS.map((status) => {
      const items = incidents
        .filter((i) => i.status === status)
        .sort((a, b) => severityWeight(a.severity) - severityWeight(b.severity) || (a.createdAt < b.createdAt ? -1 : 1))
      return { status, items }
    })
  }, [incidents])

  return (
    <div className="space-y-3">
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}>
        <KpiTile label="Open + in-flight" value={String(kpis.activeCount)} sub="OPEN · ASSIGNED · IN_PROGRESS" tone="brand" icon={FiTool} />
        <KpiTile label="Critical / High" value={String(kpis.criticalHigh)} sub="Active" tone="rose" icon={FiTool} />
        <KpiTile label="SLA breached" value={String(kpis.slaBreached)} sub="Active tickets past SLA" tone={kpis.slaBreached ? 'rose' : 'emerald'} icon={FiTool} />
        <KpiTile label="Resolved (all-time)" value={String(kpis.resolvedAllTime)} tone="emerald" icon={FiTool} />
        <KpiTile label="Faulty machines" value={String(machineFlagCount)} sub="Allocation blocked" tone="amber" icon={FiTool} />
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1">
        {columns.map(({ status, items }) => {
          return (
            <div key={status} className="flex-1 min-w-[260px]">
              <div
                className="px-3 py-2.5 text-[12px] font-extrabold rounded-t-lg border border-b-0 flex justify-between"
                style={{ color: severityStyle('LOW').color, background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)' }}
              >
                <span>{status.replace('_', ' ')}</span><span>{items.length}</span>
              </div>
              <div className="border rounded-b-lg p-2 min-h-[200px] space-y-2" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface)' }}>
                {items.map((t) => {
                  const sla = slaDisplay(t)
                  const sevStyle = severityStyle(t.severity)
                  const Icon = CATEGORY_ICON[t.category]
                  return (
                    <button
                      key={t.id}
                      onClick={() => onOpenTicket(t)}
                      className="w-full text-left rounded-lg border p-2.5 transition-colors hover:bg-(--qms-surface-hover)"
                      style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
                    >
                      <div className="flex justify-between items-center gap-1.5">
                        <div className="font-extrabold text-[12px]" style={{ color: 'var(--qms-text)' }}>{t.id}</div>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full tracking-wide shrink-0" style={{ background: sevStyle.bg, color: sevStyle.color }}>{t.severity}</span>
                      </div>
                      <div className="font-bold text-[13px] mt-1" style={{ color: 'var(--qms-text)' }}>{t.title}</div>
                      <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
                        {categoryLabel(t.category)}{t.city ? ` · ${t.city}` : ''}
                      </div>
                      {t.deviceId && (
                        <div className="text-[11px] flex items-center gap-1" style={{ color: 'var(--qms-text-muted)' }}>
                          <Icon size={11} /> {deviceName(devices, t.deviceId)}
                        </div>
                      )}
                      {t.assignedToName && (
                        <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>&rarr; {t.assignedToName}</div>
                      )}
                      <div className="mt-1.5">
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--qms-surface-strong)' }}>
                          <div className="h-full rounded-full" style={{ width: `${sla.pct}%`, background: sla.color }} />
                        </div>
                        <div className="flex justify-between text-[10.5px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
                          <span>{fmtMins(sla.elapsedMin)} / {fmtMins(sla.slaMin)}</span>
                          <span>{sla.breachedBy > 0 ? <b style={{ color: 'var(--danger)' }}>+{fmtMins(sla.breachedBy)} over</b> : 'within SLA'}</span>
                        </div>
                      </div>
                    </button>
                  )
                })}
                {items.length === 0 && <div className="text-[11px] text-center py-4" style={{ color: 'var(--qms-text-muted)' }}>—</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default IncidentBoardTab
