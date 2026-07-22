import { useMemo } from 'react'
import { FiPackage, FiAlertTriangle, FiXCircle, FiTrendingUp } from 'react-icons/fi'
import type { Person } from '@/types/people.types'
import type { ConsumableLot } from '@/features/fo/fo.types'
import KpiTile from '@/components/ui/KpiTile'
import { formatDate } from '@/utils/formatters'

interface InventoryModuleProps {
  me: Person
  consumables: ConsumableLot[]
}

function daysUntil(iso?: string): number | null {
  if (!iso) return null
  return Math.floor((new Date(iso).getTime() - Date.now()) / 86_400_000)
}

function expiryPill(iso?: string) {
  const days = daysUntil(iso)
  if (days === null) return { label: '—', bg: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }
  if (days < 0) return { label: 'EXPIRED', bg: 'var(--danger-soft)', color: 'var(--danger)' }
  if (days < 30) return { label: `${days}d`, bg: 'var(--warning-soft)', color: 'var(--warning)' }
  return { label: `${days}d`, bg: 'var(--success-soft)', color: 'var(--success)' }
}

type Priority = 'EXPIRED' | 'EXPIRING' | 'LOW' | 'OK'

function priorityOf(lot: ConsumableLot): Priority {
  const days = daysUntil(lot.expiry)
  if (days !== null && days < 0) return 'EXPIRED'
  if (days !== null && days < 30) return 'EXPIRING'
  if (lot.reorderAt != null && lot.qty <= lot.reorderAt) return 'LOW'
  return 'OK'
}

const PRIORITY_STYLE: Record<Priority, { bg: string; color: string }> = {
  EXPIRED: { bg: 'var(--danger-soft)', color: 'var(--danger)' },
  EXPIRING: { bg: 'var(--warning-soft)', color: 'var(--warning)' },
  LOW: { bg: 'var(--warning-soft)', color: 'var(--warning)' },
  OK: { bg: 'var(--success-soft)', color: 'var(--success)' },
}

const PRIORITY_RANK: Record<Priority, number> = { EXPIRED: 0, EXPIRING: 1, LOW: 2, OK: 3 }

const InventoryModule = ({ consumables }: InventoryModuleProps) => {
  const kpis = useMemo(() => {
    const expiringSoon = consumables.filter((c) => { const d = daysUntil(c.expiry); return d !== null && d >= 0 && d < 30 })
    const expired = consumables.filter((c) => { const d = daysUntil(c.expiry); return d !== null && d < 0 })
    const lowStock = consumables.filter((c) => c.reorderAt != null && c.qty <= c.reorderAt)
    return { total: consumables.length, expiringSoon: expiringSoon.length, expired: expired.length, lowStock: lowStock.length }
  }, [consumables])

  const fifoSuggestions = useMemo(() => {
    return [...consumables]
      .filter((c) => c.expiry)
      .sort((a, b) => (a.expiry! < b.expiry! ? -1 : 1))
      .slice(0, 5)
  }, [consumables])

  const sortedFull = useMemo(
    () => [...consumables].sort((a, b) => PRIORITY_RANK[priorityOf(a)] - PRIORITY_RANK[priorityOf(b)]),
    [consumables]
  )

  return (
    <div className="space-y-4">
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}>
        <KpiTile label="Total items" value={String(kpis.total)} tone="brand" icon={FiPackage} />
        <KpiTile label="Expiring soon" value={String(kpis.expiringSoon)} sub="0-30 days" tone="amber" icon={FiAlertTriangle} />
        <KpiTile label="Expired" value={String(kpis.expired)} sub={kpis.expired > 0 ? 'Quarantine!' : undefined} tone="rose" icon={FiXCircle} />
        <KpiTile label="Low stock" value={String(kpis.lowStock)} tone="violet" icon={FiTrendingUp} />
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="px-3.5 py-2.5 text-[12px] font-bold uppercase tracking-wide border-b" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>FIFO suggestion</div>
        <div>
          {fifoSuggestions.map((lot) => {
            const pill = expiryPill(lot.expiry)
            return (
              <div key={lot.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 border-t" style={{ borderColor: 'var(--qms-border)' }}>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate" style={{ color: 'var(--qms-text)' }}>{lot.name}</div>
                  <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>Lot {lot.lot ?? lot.batch ?? '—'}</div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: pill.bg, color: pill.color }}>{pill.label === 'EXPIRED' ? 'EXPIRED' : pill.label}</span>
                <div className="text-[12.5px] font-semibold shrink-0" style={{ color: 'var(--qms-text)' }}>{lot.qty} units</div>
                <div className="text-[11px] shrink-0" style={{ color: 'var(--qms-text-muted)' }}>~{lot.dailyConsumption ?? lot.consumptionPerCamp ?? 2} units/camp</div>
              </div>
            )
          })}
          {fifoSuggestions.length === 0 && (
            <div className="text-center py-6 text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>No lots to suggest.</div>
          )}
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="px-3.5 py-2.5 text-[12px] font-bold uppercase tracking-wide border-b" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>Full inventory</div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ background: 'var(--qms-surface-strong)' }}>
                {['Item', 'Type', 'Lot', 'Expiry', 'Qty', 'Status'].map((h) => (
                  <th key={h} className="text-left font-semibold px-3 py-2 text-[11px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedFull.map((lot) => {
                const prio = priorityOf(lot)
                return (
                  <tr key={lot.id} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                    <td className="px-3 py-2 font-semibold" style={{ color: 'var(--qms-text)' }}>{lot.name}</td>
                    <td className="px-3 py-2 text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>{lot.type}</td>
                    <td className="px-3 py-2 text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>{lot.lot ?? lot.batch ?? '—'}</td>
                    <td className="px-3 py-2 text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>{lot.expiry ? formatDate(lot.expiry) : '—'}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--qms-text)' }}>{lot.qty}</td>
                    <td className="px-3 py-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: PRIORITY_STYLE[prio].bg, color: PRIORITY_STYLE[prio].color }}>{prio}</span>
                    </td>
                  </tr>
                )
              })}
              {sortedFull.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>No inventory items.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default InventoryModule
