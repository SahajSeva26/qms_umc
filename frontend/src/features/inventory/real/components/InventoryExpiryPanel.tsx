import { useMemo, useState } from 'react'
import { FiZap, FiClock, FiXCircle } from 'react-icons/fi'
import { usePermission } from '@/hooks/usePermission'
import { useInventoryConsumables } from '@/features/inventory/real/hooks/useInventoryConsumables'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import { expiryBand, remainingLabel, type ExpiryBand, type ExpiryBandCode } from '@/features/inventory/real/utils/expiryBand'
import type { InventoryConsumableEntity } from '@/types/inventoryConsumable.types'

const BAND_ORDER: ExpiryBandCode[] = ['GREEN', 'YELLOW', 'ORANGE', 'RED', 'EXPIRED']
const BAND_LABEL: Record<ExpiryBandCode, string> = {
  GREEN: '> 180 days',
  YELLOW: '90–180 days',
  ORANGE: '30–90 days',
  RED: '< 30 days',
  EXPIRED: 'Expired',
}
const BAND_ICON_COLOR: Record<ExpiryBandCode, string> = {
  GREEN: '#10b981',
  YELLOW: '#eab308',
  ORANGE: '#f97316',
  RED: '#f43f5e',
  EXPIRED: '#f43f5e',
}
const BAND_PILL_COLOR: Record<ExpiryBand['css'], { bg: string; text: string }> = {
  green: { bg: 'rgba(16,185,129,.15)', text: '#059669' },
  yellow: { bg: 'rgba(234,179,8,.18)', text: '#a16207' },
  orange: { bg: 'rgba(249,115,22,.16)', text: '#c2410c' },
  red: { bg: 'rgba(244,63,94,.15)', text: '#e11d48' },
}

// Capped fetch — shows all loaded lots at once (default filter is ALL, not just at-risk), not a paginated table.
const FETCH_LIMIT = '1000'

// FEFO action per band, matching the prototype's per-row action column (inventory-masters.js:341).
function fefoAction(bandCode: ExpiryBandCode, isEarliest: boolean): { label: string; css: ExpiryBand['css'] } | null {
  if (isEarliest) return { label: 'Consume first', css: 'red' }
  if (bandCode === 'EXPIRED') return { label: 'Quarantine', css: 'red' }
  if (bandCode === 'RED') return { label: 'Allocate next', css: 'orange' }
  return null
}

// Reuses the same lots InventoryConsumablesPanel shows — a band-filtered re-presentation, not a separate source.
const InventoryExpiryPanel = () => {
  const { hasAnyPermission } = usePermission()
  const canManage = hasAnyPermission(['inventory-consumable:manage'])
  const [activeBand, setActiveBand] = useState<ExpiryBandCode | 'ALL'>('ALL')

  const { data, isLoading, error, refetch } = useInventoryConsumables({
    status: canManage ? 'active' : undefined,
    limit: FETCH_LIMIT,
  })
  const items = useMemo(() => data?.data?.items ?? [], [data])
  const totalCount = data?.data?.count ?? 0
  const truncated = items.length < totalCount

  const dated = useMemo(() => {
    return items
      .filter((lot): lot is InventoryConsumableEntity & { expiryDate: string } => !!lot.expiryDate)
      .map((lot) => ({ lot, band: expiryBand(lot.expiryDate)! }))
      .sort((a, b) => new Date(a.lot.expiryDate).getTime() - new Date(b.lot.expiryDate).getTime())
  }, [items])

  const bandCounts = useMemo(() => {
    const counts: Record<ExpiryBandCode, number> = { EXPIRED: 0, RED: 0, ORANGE: 0, YELLOW: 0, GREEN: 0 }
    dated.forEach(({ band }) => { counts[band.code]++ })
    return counts
  }, [dated])

  const shown = activeBand === 'ALL' ? dated : dated.filter((d) => d.band.code === activeBand)
  const earliest = dated[0]

  return (
    <div>
      <div className="mb-3">
        <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
          {!isLoading && !error ? `${dated.length} dated lots, sorted earliest-expiry first` : 'Consumable lots by remaining shelf life.'}
        </p>
      </div>

      <div
        className="flex items-center gap-2.5 rounded-2xl px-5 py-4 mb-4"
        style={{
          background: 'linear-gradient(120deg, color-mix(in oklab, #14b8a6 18%, transparent), color-mix(in oklab, var(--qms-brand) 18%, transparent), color-mix(in oklab, #8b5cf6 18%, transparent))',
          border: '1px solid var(--qms-border-strong)',
        }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white shadow-md"
          style={{ background: 'linear-gradient(135deg, #8b5cf6, var(--qms-brand))' }}
        >
          <FiZap size={17} />
        </div>
        <div className="text-[13px]" style={{ color: 'var(--qms-text)' }}>
          <span className="font-bold">FEFO engine: </span>
          {isLoading ? 'Loading…' : error ? "Couldn't load batches." : earliest
            ? <>Earliest expiry — <b>{earliest.lot.item.name ?? earliest.lot.item.id}</b> ({remainingLabel(earliest.lot.expiryDate)}). Allocate this batch first.</>
            : 'No dated batches.'}
        </div>
      </div>

      {truncated && !isLoading && !error && (
        <p className="text-[12px] mb-3" style={{ color: 'var(--qms-text-muted)' }}>
          Showing the first {items.length} of {totalCount} lots — band counts below reflect only what's loaded.
        </p>
      )}

      <div className="flex flex-wrap gap-2 mb-3.5">
        {BAND_ORDER.map((code) => {
          const active = activeBand === code
          return (
            <button
              key={code}
              onClick={() => setActiveBand(active ? 'ALL' : code)}
              className="flex-1 min-w-38 flex items-center gap-2.5 rounded-xl border p-3 text-left transition-transform hover:-translate-y-0.5"
              style={{
                background: 'var(--qms-surface-card)',
                borderColor: active ? 'var(--qms-brand)' : 'var(--qms-border)',
                boxShadow: active ? 'inset 0 0 0 1px var(--qms-brand)' : undefined,
              }}
            >
              <div className="w-8.5 h-8.5 rounded-lg flex items-center justify-center shrink-0 text-white" style={{ background: BAND_ICON_COLOR[code] }}>
                {code === 'EXPIRED' ? <FiXCircle size={17} /> : <FiClock size={17} />}
              </div>
              <div>
                <div className="text-[12px] font-bold leading-tight" style={{ color: 'var(--qms-text)' }}>{BAND_LABEL[code]}</div>
                <div className="text-[18px] font-extrabold" style={{ color: 'var(--qms-text)' }}>{bandCounts[code]}</div>
              </div>
            </button>
          )
        })}
      </div>

      <QueryStateBlock isLoading={isLoading} error={error} loadingLabel="Loading batches…" errorLabel="Failed to load batches. Please try again." onRetry={refetch}>
        <div className="inv-card">
          <div className="overflow-x-auto">
            <table className="inv-tbl">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Batch</th>
                  <th className="num">Qty</th>
                  <th>Mfg</th>
                  <th>Expiry</th>
                  <th>Remaining</th>
                  <th>Band</th>
                  <th>FEFO action</th>
                </tr>
              </thead>
              <tbody>
                {shown.map(({ lot, band }, idx) => {
                  const isEarliest = activeBand === 'ALL' && idx === 0
                  const action = fefoAction(band.code, isEarliest)
                  const bandColor = BAND_PILL_COLOR[band.css]
                  return (
                    <tr key={lot.id} style={isEarliest ? { background: 'rgba(244,63,94,.05)' } : undefined}>
                      <td>
                        <b>{lot.item.name ?? lot.item.id}</b>
                        <div className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>{lot.item.code}</div>
                      </td>
                      <td>{lot.batch}</td>
                      <td className="num">{lot.quantity} {lot.item.unit}</td>
                      <td>{lot.manufacturingDate?.slice(0, 10) ?? '—'}</td>
                      <td>{lot.expiryDate.slice(0, 10)}</td>
                      <td>{remainingLabel(lot.expiryDate)}</td>
                      <td>
                        <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ background: bandColor.bg, color: bandColor.text }}>
                          {band.code}
                        </span>
                      </td>
                      <td>
                        {action ? (
                          <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ background: BAND_PILL_COLOR[action.css].bg, color: BAND_PILL_COLOR[action.css].text }}>
                            {action.label}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {shown.length === 0 && (
            <div className="px-4 py-10 text-center text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
              No batches in this band.
            </div>
          )}
        </div>
      </QueryStateBlock>
    </div>
  )
}

export default InventoryExpiryPanel
