import { useMemo } from 'react'
import { BarChart3, Package, AlertTriangle } from 'lucide-react'
import type { Person } from '@/types/people.types'
import { useInventoryOverview, useConsumables } from '@/features/inventory/hooks/useInventory'
import { getDeviceCatalog, calibStatus } from '@/features/inventory/inventory.service'

// Exact port of inventory.js's tabOverview() (lines 416-520) — a 2-col grid
// of "Fleet by device type" + "Consumables stock health" cards, followed by
// a full-width "Calibration alerts" table. The shared KPI grid (renderKpis(),
// lines 321-362) and AI banner (renderAi(), lines 364-379) that sit above
// every tab in the prototype's shell now live in their own
// InventoryKpiStrip.tsx component, rendered once by InventoryPage regardless
// of active tab (2026-08-03 — previously duplicated in here, matching the
// prototype's real shared-header behavior instead of an Overview-only copy).
const OverviewTab = () => {
  const { people, fleetByType, statusMix, overdueUnits, criticalConsumables } = useInventoryOverview()
  const { consumables } = useConsumables()

  const deviceCatalog = useMemo(() => getDeviceCatalog(), [])
  const maxFleet = useMemo(() => Math.max(...fleetByType.map((x) => x.value), 1), [fleetByType])

  const foById = useMemo(() => {
    const map = new Map<string, Person>()
    people.forEach((p) => map.set(p.id, p))
    return map
  }, [people])

  const deviceTypeById = useMemo(() => {
    const map = new Map<string, string>()
    deviceCatalog.forEach((d) => map.set(d.id, d.type))
    return map
  }, [deviceCatalog])

  return (
    <div>
      {/* Overview body — exact port of tabOverview() */}
      <div className="grid gap-4 grid-cols-2 max-[1100px]:grid-cols-1">
        {/* Fleet by device type */}
        <div className="rounded-[14px] border p-4" style={{ background: 'var(--card)', borderColor: 'var(--qms-border)' }}>
          <div className="flex items-center gap-2 text-[13px] font-bold mb-3.5" style={{ color: 'var(--qms-text)' }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0" style={{ background: '#3b6dff' }}>
              <BarChart3 size={14} />
            </div>
            Fleet by device type
            <span className="ml-auto text-[11px] font-medium" style={{ color: 'var(--qms-text-muted)' }}>
              {deviceCatalog.length} types
            </span>
          </div>
          {fleetByType.map((b) => (
            <div key={b.full} className="grid items-center gap-2 py-1 text-xs" style={{ gridTemplateColumns: '140px 1fr 50px' }}>
              <div className="truncate" title={b.full} style={{ color: 'var(--qms-text)' }}>{b.full}</div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,.06)' }}>
                <div className="h-full" style={{ width: `${(b.value / maxFleet) * 100}%`, background: b.color }} />
              </div>
              <div className="text-right font-bold" style={{ color: 'var(--qms-text)' }}>{b.value}</div>
            </div>
          ))}
        </div>

        {/* Consumables stock health */}
        <div className="rounded-[14px] border p-4" style={{ background: 'var(--card)', borderColor: 'var(--qms-border)' }}>
          <div className="flex items-center gap-2 text-[13px] font-bold mb-3.5" style={{ color: 'var(--qms-text)' }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0" style={{ background: '#10b981' }}>
              <Package size={14} />
            </div>
            Consumables stock health
            <span className="ml-auto text-[11px] font-medium" style={{ color: 'var(--qms-text-muted)' }}>
              {consumables.length} SKUs
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5 mb-2.5">
            <div className="rounded-[10px] text-center p-3.5" style={{ background: 'rgba(16,185,129,.08)' }}>
              <div className="text-2xl font-extrabold" style={{ color: '#059669' }}>{statusMix.HEALTH}</div>
              <div className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>Healthy</div>
            </div>
            <div className="rounded-[10px] text-center p-3.5" style={{ background: 'rgba(245,158,11,.08)' }}>
              <div className="text-2xl font-extrabold" style={{ color: '#d97706' }}>{statusMix.LOW}</div>
              <div className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>At reorder</div>
            </div>
            <div className="rounded-[10px] text-center p-3.5" style={{ background: 'rgba(244,63,94,.08)' }}>
              <div className="text-2xl font-extrabold" style={{ color: 'var(--qms-rose-600, #e11d48)' }}>{statusMix.CRIT}</div>
              <div className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>Critical</div>
            </div>
          </div>

          {criticalConsumables.length === 0 ? (
            <div className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>No critical SKUs.</div>
          ) : (
            <>
              <div className="text-xs font-bold uppercase mb-1.5" style={{ color: 'var(--qms-text-muted)', letterSpacing: '.04em' }}>
                Needs PO now
              </div>
              {criticalConsumables.slice(0, 5).map((c) => (
                <div
                  key={c.id}
                  className="flex justify-between py-1.5 text-xs"
                  style={{ borderBottom: '1px dashed var(--qms-border)' }}
                >
                  <span style={{ color: 'var(--qms-text)' }}>{c.name}</span>
                  <span className="font-bold" style={{ color: 'var(--qms-rose-600, #e11d48)' }}>{c.stock} {c.uom}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Calibration alerts */}
      <div className="rounded-[14px] border p-4 mt-4" style={{ background: 'var(--card)', borderColor: 'var(--qms-border)' }}>
        <div className="flex items-center gap-2 text-[13px] font-bold mb-3.5" style={{ color: 'var(--qms-text)' }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0" style={{ background: '#f43f5e' }}>
            <AlertTriangle size={14} />
          </div>
          Calibration alerts
          <span className="ml-auto text-[11px] font-medium" style={{ color: 'var(--qms-text-muted)' }}>
            {overdueUnits.length} overdue
          </span>
        </div>

        {overdueUnits.length === 0 ? (
          <div className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>No overdue calibrations. 🎉</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  {['Serial', 'Device', 'Last calibrated', 'Days overdue', 'Location / FO'].map((h) => (
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
                {overdueUnits.map((u) => {
                  const cs = calibStatus(u)
                  const fo = foById.get(u.assignedTo)
                  return (
                    <tr key={u.id} className="hover:bg-[rgba(59,109,255,.03)]">
                      <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)' }}>
                        <b style={{ color: 'var(--qms-text)' }}>{u.sn}</b>
                      </td>
                      <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>
                        {deviceTypeById.get(u.deviceId) ?? '—'}
                      </td>
                      <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>
                        {u.lastCalibrated}
                      </td>
                      <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)' }}>
                        <span
                          className="inline-flex items-center gap-1 font-bold uppercase rounded-full"
                          style={{ padding: '2px 8px', fontSize: 10, letterSpacing: '.04em', background: 'rgba(244,63,94,.15)', color: 'var(--qms-rose-600, #e11d48)' }}
                        >
                          {Math.abs(cs.days)}d
                        </span>
                      </td>
                      <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>
                        {fo?.name || u.location || '—'}
                      </td>
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

export default OverviewTab
