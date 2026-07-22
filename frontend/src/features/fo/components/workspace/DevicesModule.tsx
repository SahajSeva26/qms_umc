import { useMemo } from 'react'
import { FiCpu, FiCheckCircle, FiAlertTriangle, FiTool } from 'react-icons/fi'
import type { Person } from '@/types/people.types'
import type { DeviceCatalogItem } from '@/types/device.types'
import { Button } from '@/components/ui/button'
import KpiTile from '@/components/ui/KpiTile'
import { formatDate } from '@/utils/formatters'

interface DevicesModuleProps {
  me: Person
  devices: DeviceCatalogItem[]
  /** Lifted to the parent Workspace page — switches to Incidents and opens
   * Raise SOS pre-filled with category=machine_failure + this device, since
   * IncidentsModule already owns that modal's state. */
  onReportIssue: (deviceId: string) => void
}

type DeviceStatus = 'WORKING' | 'FAULTY' | 'CAL_DUE'

// Deterministic placeholder calibration data — DeviceCatalogItem has no
// serial/calibration fields yet (Phase 2 per device.types.ts's header
// comment), so derive stable per-id values rather than random ones.
function calibrationInfoFor(id: string): { serial: string; calibratedOn: string; status: DeviceStatus } {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  const daysAgo = hash % 400
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  const calDueDays = 365 - daysAgo
  const status: DeviceStatus = hash % 11 === 0 ? 'FAULTY' : calDueDays < 30 ? 'CAL_DUE' : 'WORKING'
  return { serial: `SN-${id.toUpperCase()}-${(1000 + (hash % 9000))}`, calibratedOn: d.toISOString(), status }
}

const STATUS_STYLE: Record<DeviceStatus, { bg: string; color: string; label: string }> = {
  WORKING: { bg: 'var(--success-soft)', color: 'var(--success)', label: 'WORKING' },
  FAULTY: { bg: 'var(--danger-soft)', color: 'var(--danger)', label: 'FAULTY' },
  CAL_DUE: { bg: 'var(--warning-soft)', color: 'var(--warning)', label: 'CAL DUE' },
}

const DevicesModule = ({ me, devices, onReportIssue }: DevicesModuleProps) => {
  const myDevices = useMemo(() => {
    return (me.machinesAssigned ?? []).map((id) => {
      const catalog = devices.find((d) => d.id === id) ?? { id, name: id, category: '—', unitsAvailable: 0 }
      return { ...catalog, ...calibrationInfoFor(id) }
    })
  }, [me.machinesAssigned, devices])

  const kpis = useMemo(() => {
    const working = myDevices.filter((d) => d.status === 'WORKING')
    const faulty = myDevices.filter((d) => d.status === 'FAULTY')
    const calDue = myDevices.filter((d) => d.status === 'CAL_DUE')
    return { allocated: myDevices.length, working: working.length, faulty: faulty.length, calDue: calDue.length }
  }, [myDevices])

  return (
    <div className="space-y-4">
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}>
        <KpiTile label="Allocated" value={String(kpis.allocated)} tone="brand" icon={FiCpu} />
        <KpiTile label="Working" value={String(kpis.working)} tone="emerald" icon={FiCheckCircle} />
        <KpiTile label="Faulty" value={String(kpis.faulty)} tone="rose" icon={FiAlertTriangle} />
        <KpiTile label="Cal due < 30d" value={String(kpis.calDue)} tone="amber" icon={FiTool} />
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ background: 'var(--qms-surface-strong)' }}>
                {['Device', 'Type', 'Serial', 'Calibration date', 'Status', ''].map((h) => (
                  <th key={h} className="text-left font-semibold px-3 py-2.5 text-[11px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {myDevices.map((d) => (
                <tr key={d.id} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                  <td className="px-3 py-2.5 font-semibold" style={{ color: 'var(--qms-text)' }}>{d.name}</td>
                  <td className="px-3 py-2.5 text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>{d.category}</td>
                  <td className="px-3 py-2.5 text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>{d.serial}</td>
                  <td className="px-3 py-2.5 text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>{formatDate(d.calibratedOn)}</td>
                  <td className="px-3 py-2.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: STATUS_STYLE[d.status].bg, color: STATUS_STYLE[d.status].color }}>{STATUS_STYLE[d.status].label}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <Button size="sm" variant="outline" onClick={() => onReportIssue(d.id)}>Report</Button>
                  </td>
                </tr>
              ))}
              {myDevices.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>No devices assigned.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default DevicesModule
