import { useState } from 'react'
import { Cpu, Warehouse } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { useDeviceCatalog, useDeviceFleetUnits } from '@/features/inventory/hooks/useInventory'
import { allFos, calibStatus, deviceFleet } from '@/features/inventory/inventory.service'
import type { InventoryUnit } from '@/features/inventory/inventory.types'
import DeviceDetailDrawer from '@/features/inventory/components/DeviceDetailDrawer'

// Exact port of inventory.js's tabAssignments() (lines 650-690) +
// window.invOpenUnit() (lines 975-980). NOT a real <table> — a flat
// CSS-grid "row-pair" structure (.inv-assignment-grid: 220px name column +
// 1fr chip column), one name/chip pair per Field Officer plus one trailing
// pair for unassigned/hub units. Clicking any device chip reuses the shared
// wide Device Detail drawer (already built for the Devices tab) via
// invOpenUnit()'s unit → device resolution, then shows an info toast.
const AssignmentsTab = () => {
  const { devices } = useDeviceCatalog()
  const { units, people } = useDeviceFleetUnits()
  const [openUnitId, setOpenUnitId] = useState<string | null>(null)

  // fos() — exact port of inventory.js:145 (functionally identical to
  // allFos(), the same filter already shared by the Warehouse tab's
  // FO/Dietitian holder lists — reused here rather than re-declared).
  const list = allFos(people)

  // window.invOpenUnit() — resolves the unit, opens the shared Device
  // Detail drawer for its device, then (after a 50ms delay, exact port)
  // shows an info toast naming the serial.
  const openUnit = (unitId: string) => {
    const u = units.find((x) => x.id === unitId)
    if (!u) return
    setOpenUnitId(unitId)
    setTimeout(() => toast.info(`Showing ${u.sn} in device fleet`), 50)
  }

  const closeDrawer = () => setOpenUnitId(null)

  const openUnitRecord = units.find((u) => u.id === openUnitId) ?? null
  const openDevice = openUnitRecord ? devices.find((d) => d.id === openUnitRecord.deviceId) ?? null : null
  const openFleet = openUnitRecord ? deviceFleet(units, openUnitRecord.deviceId) : null

  if (list.length === 0) {
    return (
      <div className="kempty text-center" style={{ padding: 40, color: 'var(--qms-text-muted)' }}>
        No FOs.
      </div>
    )
  }

  const unassigned = units.filter((u) => !u.assignedTo)
  const shownUnassigned = unassigned.slice(0, 30)
  const extraUnassigned = Math.max(0, unassigned.length - 30)

  return (
    <div>
      <div
        className="grid rounded-xl border overflow-hidden"
        style={{ gridTemplateColumns: '220px 1fr', gap: 0, background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
      >
        {list.map((p) => {
          const mine = units.filter((u) => u.assignedTo === p.id)
          return (
            <FoRow key={p.id} name={p.name} hq={p.hq} states={p.states} units={mine} devices={devices} onOpenUnit={openUnit} />
          )
        })}

        {/* Trailing "In hubs / available" row */}
        <div
          className="text-xs font-bold"
          style={{ padding: '10px 12px', borderBottom: '1px dashed var(--qms-border)', background: 'rgba(0,0,0,.02)', fontSize: 12 }}
        >
          — In hubs / available —
        </div>
        <div className="flex flex-wrap gap-1" style={{ padding: '10px 12px', borderBottom: '1px dashed var(--qms-border)' }}>
          {shownUnassigned.map((u) => {
            const dev = devices.find((d) => d.id === u.deviceId)
            return (
              <span
                key={u.id}
                onClick={() => openUnit(u.id)}
                title={u.location || ''}
                className="inline-flex items-center gap-1 rounded-full font-semibold cursor-pointer"
                style={{ padding: '3px 8px', fontSize: 11, background: 'rgba(59,109,255,.1)', color: 'var(--qms-brand-700, #1d40c4)' }}
              >
                <Warehouse size={11} />
                {dev?.type || '—'} · {u.sn} · {u.location || '—'}
              </span>
            )
          })}
          {extraUnassigned > 0 && (
            <span className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>+ {extraUnassigned} more</span>
          )}
        </div>
      </div>

      <DeviceDetailDrawer device={openDevice} fleet={openFleet} people={people} onClose={closeDrawer} />
    </div>
  )
}

interface FoRowProps {
  name: string
  hq: string
  states: string[]
  units: InventoryUnit[]
  devices: ReturnType<typeof useDeviceCatalog>['devices']
  onOpenUnit: (unitId: string) => void
}

const FoRow = ({ name, hq, states, units, devices, onOpenUnit }: FoRowProps) => (
  <>
    <div
      className="font-bold"
      style={{ padding: '10px 12px', borderBottom: '1px dashed var(--qms-border)', background: 'rgba(0,0,0,.02)', fontSize: 12 }}
    >
      {name}
      <br />
      <span className="text-xs" style={{ fontWeight: 500, color: 'var(--qms-text-muted)' }}>
        {hq || ''} · {(states || []).join(', ')}
      </span>
    </div>
    <div className="flex flex-wrap gap-1" style={{ padding: '10px 12px', borderBottom: '1px dashed var(--qms-border)' }}>
      {units.length === 0 ? (
        <span className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>— No units assigned —</span>
      ) : (
        units.map((u) => {
          const dev = devices.find((d) => d.id === u.deviceId)
          const cs = calibStatus(u)
          const override =
            cs.code === 'OVER'
              ? { background: 'rgba(244,63,94,.13)', color: 'var(--qms-rose-600, #e11d48)' }
              : cs.code === 'SOON'
                ? { background: 'rgba(245,158,11,.13)', color: '#d97706' }
                : {}
          return (
            <span
              key={u.id}
              onClick={() => onOpenUnit(u.id)}
              title={`${u.sn} · ${cs.label}`}
              className="inline-flex items-center gap-1 rounded-full font-semibold cursor-pointer"
              style={{ padding: '3px 8px', fontSize: 11, background: 'rgba(59,109,255,.1)', color: 'var(--qms-brand-700, #1d40c4)', ...override }}
            >
              <Cpu size={11} />
              {dev?.type || '—'} · {u.sn}
            </span>
          )
        })
      )}
    </div>
  </>
)

export default AssignmentsTab
