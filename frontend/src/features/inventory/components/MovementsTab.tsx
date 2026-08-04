import { useState } from 'react'
import {
  Plus, Send, CornerDownLeft, ArrowRightLeft, Wrench, ShoppingCart, ArchiveX, Circle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMovements } from '@/features/inventory/hooks/useInventory'
import { movementTypeMeta } from '@/features/inventory/inventory.types'
import type { Movement } from '@/features/inventory/inventory.types'
import LogMovementModal from '@/features/inventory/components/LogMovementModal'

// icon name (as used by the prototype's typeMeta map) → lucide component.
// Exact port of the six MOVEMENT_TYPE_META icons + the 'circle' fallback for
// any unrecognized type.
const TYPE_ICONS: Record<string, typeof Send> = {
  send: Send,
  'corner-down-left': CornerDownLeft,
  'arrow-right-left': ArrowRightLeft,
  wrench: Wrench,
  'shopping-cart': ShoppingCart,
  'archive-x': ArchiveX,
  circle: Circle,
}

// .inv-status-pill BASE class reused with per-row inline color — exact port
// of tabMovements()'s inline-styled span (inventory.js:764-770): background
// = `${meta.color}22` (~13% alpha), color = meta.color solid.
const MovementTypePill = ({ type }: { type: string }) => {
  const meta = movementTypeMeta(type)
  const Icon = TYPE_ICONS[meta.icon] ?? Circle
  return (
    <span
      className="inline-flex items-center gap-1 font-bold uppercase rounded-full"
      style={{ padding: '2px 8px', fontSize: 10, letterSpacing: '.04em', background: `${meta.color}22`, color: meta.color }}
    >
      <Icon size={11} /> {meta.label}
    </span>
  )
}

// Exact port of tabMovements() (inventory.js lines 749-786) + window.
// invNewMovement() (789-876, extracted into LogMovementModal.tsx since the
// prototype's page-head "New transfer" button also opens this same modal
// from every other tab). No KPI tiles, no filter bar — just the
// right-aligned "+ Log movement" action row and the full-width movements
// table, newest-first by date (string descending, matching the ledger's own
// unshift-on-write order — no separate client-side sort is applied here,
// mirroring the prototype which simply renders movements() in store order).
const MovementsTab = () => {
  const { movements, units, isLoading } = useMovements()
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div>
      {/* Right-aligned action row — no KPI strip, no filter bar on this tab. */}
      <div className="flex justify-end mb-2.5">
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={14} /> Log movement
        </Button>
      </div>

      {/* single full-width .inv-card, padding:0 + overflow:hidden */}
      <div className="rounded-[14px] border overflow-hidden" style={{ padding: 0, background: 'var(--card)', borderColor: 'var(--qms-border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {['ID', 'Date', 'Type', 'Unit', 'From', 'To', 'By', 'Notes'].map((h) => (
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
              {!isLoading && movements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center" style={{ padding: 20, color: 'var(--qms-text-muted)' }}>
                    No movements logged.
                  </td>
                </tr>
              ) : (
                movements.map((m: Movement) => {
                  const serial = (m.unitId || '').split(':')[1] || m.unitId
                  return (
                    <tr key={m.id} className="hover:bg-[rgba(59,109,255,.03)]">
                      <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)' }}>
                        <b style={{ color: 'var(--qms-text)' }}>{m.id}</b>
                      </td>
                      <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>
                        {m.date}
                      </td>
                      <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)' }}>
                        <MovementTypePill type={m.type} />
                      </td>
                      <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)' }}>
                        <b style={{ color: 'var(--qms-text)' }}>{serial}</b>
                        <span className="text-xs" style={{ color: 'var(--qms-text-muted)' }}> · {m.deviceType}</span>
                      </td>
                      <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>
                        {m.from}
                      </td>
                      <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>
                        {m.to}
                      </td>
                      <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>
                        {m.by}
                      </td>
                      <td className="text-xs" style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text-muted)' }}>
                        {m.notes}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <LogMovementModal open={modalOpen} onClose={() => setModalOpen(false)} units={units} />
    </div>
  )
}

export default MovementsTab
