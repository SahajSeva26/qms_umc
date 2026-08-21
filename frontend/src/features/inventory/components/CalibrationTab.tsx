import { useMemo } from 'react'
import { FiCheck } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'
import {
  useDeviceCatalog, useDeviceFleetUnits, useCalibrationFilters, useCalibrationRows, useMarkCalibrated,
} from '@/features/inventory/hooks/useInventory'
import type { CalibStatusCode } from '@/features/inventory/inventory.types'
import { InvFilterBar } from '@/features/inventory/components/IntelTableUi'

const STATUS_OPTS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'OVER', label: 'Overdue' },
  { value: 'SOON', label: 'Due soon' },
  { value: 'OK', label: 'Calibrated' },
]

const STATUS_PILL_STYLE: Record<CalibStatusCode, { background: string; color: string }> = {
  OVER: { background: 'rgba(244,63,94,.15)', color: 'var(--qms-rose-600, #e11d48)' },
  SOON: { background: 'rgba(245,158,11,.15)', color: '#d97706' },
  OK: { background: 'rgba(16,185,129,.15)', color: '#059669' },
}

const CalibrationTab = () => {
  const { devices } = useDeviceCatalog()
  const { units, people } = useDeviceFleetUnits()
  const { type, setType, status, setStatus, q, setQ } = useCalibrationFilters()
  const { markCalibrated } = useMarkCalibrated()

  const typeOpts = useMemo(() => ['ALL', ...new Set(devices.map((d) => d.type))], [devices])

  const rows = useCalibrationRows(units, people, type, status, q)

  const handleMarkDone = async (unitId: string, sn: string) => {
    try {
      const { unit } = await markCalibrated(unitId)
      toast.success(`${sn} calibrated · next ${unit.nextCalibration}`)
    } catch {
      toast.error('Could not mark calibrated')
    }
  }

  return (
    <div>
      <InvFilterBar>
        <span className="text-xs font-bold uppercase tracking-[.04em]" style={{ color: 'var(--qms-text-muted)' }}>
          Filters
        </span>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-lg border text-xs"
          style={{ padding: '6px 10px', borderColor: 'var(--qms-border)', background: 'var(--qms-surface)', color: 'var(--qms-text)' }}
        >
          {typeOpts.map((t) => (
            <option key={t} value={t}>{t === 'ALL' ? 'All types' : t}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border text-xs"
          style={{ padding: '6px 10px', borderColor: 'var(--qms-border)', background: 'var(--qms-surface)', color: 'var(--qms-text)' }}
        >
          {STATUS_OPTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search..."
          className="rounded-lg border text-xs"
          style={{ padding: '6px 10px', borderColor: 'var(--qms-border)', background: 'var(--qms-surface)', minWidth: 200, color: 'var(--qms-text)' }}
        />
      </InvFilterBar>

      <div className="rounded-[14px] border overflow-hidden" style={{ padding: 0, background: 'var(--card)', borderColor: 'var(--qms-border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {['Serial', 'Device type', 'Vendor / model', 'Last calibrated', 'Next due', 'Status', 'Assigned to / location', ''].map((h) => (
                  <th
                    key={h}
                    className="text-left font-bold uppercase"
                    style={{ padding: '8px 6px', fontSize: 10, letterSpacing: '.04em', color: 'var(--qms-text-muted)', borderBottom: '1px dashed var(--qms-border)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center" style={{ padding: 20, color: 'var(--qms-text-muted)' }}>
                    No units match.
                  </td>
                </tr>
              ) : (
                rows.map(({ u, dev, fo, cs }) => (
                  <tr key={u.id} className="hover:bg-[rgba(59,109,255,.03)]">
                    <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)' }}>
                      <b style={{ color: 'var(--qms-text)' }}>{u.sn}</b>
                    </td>
                    <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>
                      {dev.type}
                    </td>
                    <td className="text-xs" style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text-muted)' }}>
                      {dev.vendor} · {dev.model}
                    </td>
                    <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>
                      {u.lastCalibrated}
                    </td>
                    <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>
                      {u.nextCalibration}
                    </td>
                    <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)' }}>
                      <span
                        className="inline-flex items-center gap-1 font-bold uppercase rounded-full"
                        style={{ padding: '2px 8px', fontSize: 10, letterSpacing: '.04em', ...STATUS_PILL_STYLE[cs.code] }}
                      >
                        {cs.label}
                      </span>
                    </td>
                    <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>
                      {fo?.name || u.location || '—'}
                    </td>
                    <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)' }}>
                      {cs.code !== 'OK' && (
                        <Button
                          variant="ghost"
                          style={{ padding: '3px 8px', height: 'auto' }}
                          onClick={() => handleMarkDone(u.id, u.sn)}
                        >
                          <FiCheck size={13} /> Mark done
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default CalibrationTab
