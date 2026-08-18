import { useState } from 'react'
import type { IconType } from 'react-icons'
import {
  FiPlus, FiSend, FiCornerDownLeft, FiRepeat, FiTool, FiShoppingCart, FiCircle,
} from 'react-icons/fi'
import { HiOutlineArchiveBoxXMark } from 'react-icons/hi2'
import { Button } from '@/components/ui/button'
import { useMovements } from '@/features/inventory/hooks/useInventory'
import { movementTypeMeta } from '@/features/inventory/inventory.types'
import type { Movement } from '@/features/inventory/inventory.types'
import LogMovementModal from '@/features/inventory/components/LogMovementModal'

const TYPE_ICONS: Record<string, IconType> = {
  send: FiSend,
  'corner-down-left': FiCornerDownLeft,
  'arrow-right-left': FiRepeat,
  wrench: FiTool,
  'shopping-cart': FiShoppingCart,
  'archive-x': HiOutlineArchiveBoxXMark,
  circle: FiCircle,
}

const MovementTypePill = ({ type }: { type: string }) => {
  const meta = movementTypeMeta(type)
  const Icon = TYPE_ICONS[meta.icon] ?? FiCircle
  return (
    <span
      className="inline-flex items-center gap-1 font-bold uppercase rounded-full"
      style={{ padding: '2px 8px', fontSize: 10, letterSpacing: '.04em', background: `${meta.color}22`, color: meta.color }}
    >
      <Icon size={11} /> {meta.label}
    </span>
  )
}

// Renders movements in store order (newest-first via unshift-on-write) — no client-side sort applied.
const MovementsTab = () => {
  const { movements, units, isLoading } = useMovements()
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div>
      <div className="flex justify-end mb-2.5">
        <Button onClick={() => setModalOpen(true)}>
          <FiPlus size={14} /> Log movement
        </Button>
      </div>

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
