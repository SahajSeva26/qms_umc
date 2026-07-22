import { useEffect, useMemo, useState } from 'react'
import { FiCheckCircle, FiXCircle, FiPackage } from 'react-icons/fi'
import type { Camp } from '@/types/camp.types'
import type { Project } from '@/types/project.types'
import type { ConsumableLot } from '@/features/fo/fo.types'
import { resolveForCamp, consumablesForTest } from '@/features/fo/foConfig.service'

interface ConsumablesStageProps {
  camp: Camp
  project: Project | undefined
  consumables: ConsumableLot[]
  onResolveLots: (lotIds: string[]) => void
}

interface NeedRow {
  consumableId: string
  qtyNeeded: number
  matched: ConsumableLot[]
  inHand: number
}

function daysUntil(iso?: string): number | null {
  if (!iso) return null
  return Math.floor((new Date(iso).getTime() - Date.now()) / 86_400_000)
}

// Fuzzy-matches a consumable id/name (e.g. 'GLUCOSE_STRIP') against this FO's
// raw inventory lots by id/type/name substring, per the research spec.
function matchLots(consumableId: string, lots: ConsumableLot[]): ConsumableLot[] {
  const needle = consumableId.toLowerCase().replace(/_/g, ' ')
  const needleTokens = needle.split(' ').filter(Boolean)
  return lots.filter((lot) => {
    const hay = `${lot.id} ${lot.type} ${lot.name}`.toLowerCase()
    if (hay.includes(consumableId.toLowerCase())) return true
    return needleTokens.every((tok) => hay.includes(tok))
  })
}

const ConsumablesStage = ({ camp, project, consumables, onResolveLots }: ConsumablesStageProps) => {
  const [needRows, setNeedRows] = useState<NeedRow[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    async function run() {
      const cfg = await resolveForCamp(camp, project)
      const patients = camp.patientsExpected || 40
      const totals = new Map<string, number>()
      for (const testId of cfg.tests) {
        const entries = await consumablesForTest(testId)
        for (const entry of entries) {
          totals.set(entry.consumableId, (totals.get(entry.consumableId) ?? 0) + entry.qtyPerTest * patients)
        }
      }
      if (cancelled) return
      const rows: NeedRow[] = Array.from(totals.entries()).map(([consumableId, qtyNeeded]) => {
        const matched = matchLots(consumableId, consumables)
        const inHand = matched.reduce((sum, l) => sum + l.qty, 0)
        return { consumableId, qtyNeeded, matched, inHand }
      })
      setNeedRows(rows)
      setLoading(false)

      // Auto-FIFO: first 6 nearest-expiry lots across everything this row
      // set touches (fully automatic, no manual picker per the spec).
      const touchedIds = new Set(rows.flatMap((r) => r.matched.map((l) => l.id)))
      const pool = touchedIds.size > 0 ? consumables.filter((l) => touchedIds.has(l.id)) : consumables
      const sorted = [...pool].sort((a, b) => {
        const da = daysUntil(a.expiry) ?? Infinity
        const db = daysUntil(b.expiry) ?? Infinity
        return da - db
      })
      onResolveLots(sorted.slice(0, 6).map((l) => l.id))
    }
    run()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camp.id, camp.projectId, camp.patientsExpected, project?.id, consumables])

  const sortedInventory = useMemo(
    () => [...consumables].sort((a, b) => (daysUntil(a.expiry) ?? Infinity) - (daysUntil(b.expiry) ?? Infinity)),
    [consumables]
  )

  if (loading) {
    return <div className="text-center py-10 text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>Resolving consumable plan…</div>
  }

  const hasRows = needRows && needRows.length > 0

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="rounded-lg px-3.5 py-2.5 text-[12px]" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
        Informational stage — consumable plan is auto-computed from the project's test config and current FIFO stock. No action needed here.
      </div>

      {hasRows ? (
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <div className="px-3.5 py-2.5 text-[12px] font-bold uppercase tracking-wide border-b" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
            Consumable plan · {camp.patientsExpected || 40} patients expected
          </div>
          {needRows!.map((row) => {
            const short = row.inHand < row.qtyNeeded
            return (
              <div key={row.consumableId} className="flex items-center justify-between gap-3 px-3.5 py-2.5 border-t" style={{ borderColor: 'var(--qms-border)' }}>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[13px]" style={{ color: 'var(--qms-text)' }}>{row.consumableId.replace(/_/g, ' ')}</div>
                  <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>Carry ≈ {row.qtyNeeded} · in hand {row.inHand}</div>
                </div>
                <span
                  className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full shrink-0"
                  style={short ? { background: 'var(--danger-soft)', color: 'var(--danger)' } : { background: 'var(--success-soft)', color: 'var(--success)' }}
                >
                  {short ? <><FiXCircle size={11} /> short {row.qtyNeeded - row.inHand}</> : <><FiCheckCircle size={11} /> enough</>}
                </span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <div className="px-3.5 py-2.5 text-[12px] font-bold uppercase tracking-wide border-b flex items-center gap-2" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
            <FiPackage size={13} /> Raw inventory (nearest expiry first)
          </div>
          {sortedInventory.map((lot) => {
            const days = daysUntil(lot.expiry)
            const pillStyle = days == null ? { bg: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }
              : days < 0 ? { bg: 'var(--danger-soft)', color: 'var(--danger)' }
              : days < 30 ? { bg: 'var(--warning-soft)', color: 'var(--warning)' }
              : { bg: 'var(--success-soft)', color: 'var(--success)' }
            return (
              <div key={lot.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 border-t" style={{ borderColor: 'var(--qms-border)' }}>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[13px]" style={{ color: 'var(--qms-text)' }}>{lot.name}</div>
                  <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>Lot {lot.lot ?? lot.batch ?? '—'} · qty {lot.qty}</div>
                </div>
                <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: pillStyle.bg, color: pillStyle.color }}>
                  {days == null ? '—' : days < 0 ? 'EXPIRED' : `${days}d`}
                </span>
              </div>
            )
          })}
          {sortedInventory.length === 0 && (
            <div className="text-center py-6 text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>No inventory on record.</div>
          )}
        </div>
      )}
    </div>
  )
}

export default ConsumablesStage
