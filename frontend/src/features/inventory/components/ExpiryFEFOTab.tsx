import { useMemo, useState } from 'react'
import { FiCalendar, FiClock, FiXCircle } from 'react-icons/fi'
import SideDrawer from '@/components/ui/SideDrawer'
import { useItemMaster } from '@/features/inventory/hooks/useInventory'
import { isConsumableType } from '@/features/inventory/inventory.types'
import type { InventoryItem, ExpiryBandCode, ExpiryBandCss } from '@/features/inventory/inventory.types'
import { expiryBand, remainingLabel } from '@/features/inventory/inventory.service'
import { ItemDetailDrawerBody } from '@/features/inventory/components/ItemMasterTab'
import { EXPIRY_BAND_STYLE } from '@/features/inventory/constants/expiryBandStyle'
import { TableEmptyRow } from '@/features/inventory/components/IntelTableUi'

interface Band {
  code: ExpiryBandCode
  label: string
  css: ExpiryBandCss
  tileColor: string
}

// RED and EXPIRED share the same tile color, distinguished only by icon + label.
const BANDS: Band[] = [
  { code: 'GREEN', label: '> 180 days', css: 'green', tileColor: '#10b981' },
  { code: 'YELLOW', label: '90–180 days', css: 'yellow', tileColor: '#eab308' },
  { code: 'ORANGE', label: '30–90 days', css: 'orange', tileColor: '#f97316' },
  { code: 'RED', label: '< 30 days', css: 'red', tileColor: '#f43f5e' },
  { code: 'EXPIRED', label: 'Expired', css: 'red', tileColor: '#f43f5e' },
]

// 'grey' variant is only used by the Quarantine pill here, not by Item Master.
const BAND_STYLE: Record<ExpiryBandCss | 'grey', { bg: string; fg: string }> = {
  ...EXPIRY_BAND_STYLE,
  grey: { bg: 'rgba(0,0,0,.06)', fg: 'var(--qms-text-muted)' },
}

const BandPill = ({ css, children }: { css: ExpiryBandCss | 'grey'; children: React.ReactNode }) => {
  const s = BAND_STYLE[css]
  return (
    <span
      className="inline-flex items-center gap-1 font-bold uppercase rounded-full"
      style={{ padding: '2px 8px', fontSize: 10, letterSpacing: '.03em', background: s.bg, color: s.fg }}
    >
      {children}
    </span>
  )
}

const FefoActionCell = ({ firstActive, bandCode }: { firstActive: boolean; bandCode: ExpiryBandCode }) => {
  if (firstActive) return <BandPill css="red">Consume first</BandPill>
  if (bandCode === 'EXPIRED') return <BandPill css="grey">Quarantine</BandPill>
  if (bandCode === 'RED') return <BandPill css="orange">Allocate next</BandPill>
  return <span style={{ color: 'var(--qms-text-muted)' }}>—</span>
}

interface FefoBatch {
  it: InventoryItem
  band: { code: ExpiryBandCode; label: string; css: ExpiryBandCss }
}

const ExpiryFEFOTab = () => {
  const { items } = useItemMaster()
  const [openItemId, setOpenItemId] = useState<string | null>(null)
  const [band, setBand] = useState<ExpiryBandCode | 'ALL'>('ALL')

  // Consumable-type items with an expiry date, sorted soonest-first, over the
  // full set before any band filter narrows it.
  const batches = useMemo<FefoBatch[]>(() => {
    return items
      .filter((it) => isConsumableType(it.itemType) && it.expiryDate)
      .map((it) => ({ it, band: expiryBand(it.expiryDate)! }))
      .sort((a, b) => new Date(a.it.expiryDate!).getTime() - new Date(b.it.expiryDate!).getTime())
  }, [items])

  // Counts always run against the full batches array, not the narrowed `shown` list.
  const bandCount = (code: ExpiryBandCode) => batches.filter((b) => b.band.code === code).length

  const shown = band === 'ALL' ? batches : batches.filter((b) => b.band.code === band)

  const toggleBand = (code: ExpiryBandCode) => setBand((cur) => (cur === code ? 'ALL' : code))

  const openItem = items.find((x) => x.id === openItemId) ?? null

  return (
    <div>
      <div
        className="flex items-center gap-3 rounded-[20px] border p-3.5 mb-3.5"
        style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border-strong)' }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white"
          style={{ background: 'linear-gradient(135deg, var(--qms-violet, #8b5cf6), var(--qms-brand))' }}
        >
          <FiCalendar size={18} />
        </div>
        <div className="flex-1 text-sm" style={{ color: 'var(--qms-text-soft)' }}>
          <b style={{ color: 'var(--qms-text)' }}>FEFO engine:</b>{' '}
          {batches.length ? (
            <>
              Earliest expiry — <b style={{ color: 'var(--qms-text)' }}>{batches[0].it.name}</b> ({remainingLabel(batches[0].it.expiryDate)}). Allocate this batch first.
            </>
          ) : (
            'No dated batches.'
          )}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mb-3.5">
        {BANDS.map((b) => {
          const active = band === b.code
          const Icon = b.code === 'EXPIRED' ? FiXCircle : FiClock
          return (
            <button
              key={b.code}
              onClick={() => toggleBand(b.code)}
              className="flex-1 flex items-center gap-2.5 rounded-xl border text-left transition-transform hover:-translate-y-0.5"
              style={{
                minWidth: 120,
                padding: 12,
                background: 'var(--qms-surface)',
                borderColor: active ? 'var(--qms-brand)' : 'var(--qms-border)',
                boxShadow: active ? 'inset 0 0 0 1px var(--qms-brand)' : undefined,
              }}
            >
              <div className="rounded-[9px] grid place-items-center shrink-0 text-white" style={{ width: 34, height: 34, background: b.tileColor }}>
                <Icon size={17} />
              </div>
              <div>
                <div className="text-xs font-bold leading-tight" style={{ color: 'var(--qms-text)' }}>{b.label}</div>
                <div className="text-lg font-extrabold" style={{ color: 'var(--qms-text)' }}>{bandCount(b.code)}</div>
              </div>
            </button>
          )
        })}
      </div>

      <div className="rounded-2xl border overflow-auto" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <table className="border-collapse text-xs" style={{ width: '100%', minWidth: 780 }}>
          <thead>
            <tr>
              {['Item', 'Batch', 'Qty', 'Mfg', 'Expiry', 'Remaining', 'Band', 'FEFO action'].map((h) => (
                <th
                  key={h}
                  className={`text-left font-bold uppercase ${h === 'Qty' ? 'text-right' : ''}`}
                  style={{ padding: '8px 6px', fontSize: 10, letterSpacing: '.04em', color: 'var(--qms-text-muted)', borderBottom: '1px dashed var(--qms-border)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <TableEmptyRow colSpan={8}>No batches in this band.</TableEmptyRow>
            ) : (
              shown.map((b, idx) => {
                const it = b.it
                const firstActive = band === 'ALL' && idx === 0
                return (
                  <tr
                    key={it.id}
                    onClick={() => setOpenItemId(it.id)}
                    className={`cursor-pointer hover:bg-[rgba(59,109,255,.03)] ${firstActive ? 'bg-[rgba(244,63,94,.05)]' : ''}`}
                  >
                    <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)' }}>
                      <b style={{ color: 'var(--qms-text)' }}>{it.name}</b>
                      <div className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>{it.code}</div>
                    </td>
                    <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>{it.batchNo || '—'}</td>
                    <td className="text-right tabular-nums" style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>
                      {it.qtyOnHand ?? '—'} {it.uom || ''}
                    </td>
                    <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>{it.mfgDate || '—'}</td>
                    <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>{it.expiryDate}</td>
                    <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>{remainingLabel(it.expiryDate)}</td>
                    <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)' }}>
                      <BandPill css={b.band.css}>{b.band.code}</BandPill>
                    </td>
                    <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)' }}>
                      <FefoActionCell firstActive={firstActive} bandCode={b.band.code} />
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <SideDrawer open={!!openItem} title={openItem?.name ?? 'Item'} onClose={() => setOpenItemId(null)} widthClassName="max-w-3xl">
        {openItem && (
          <ItemDetailDrawerBody
            item={openItem}
            onEdit={() => setOpenItemId(null)}
            onClose={() => setOpenItemId(null)}
          />
        )}
      </SideDrawer>
    </div>
  )
}

export default ExpiryFEFOTab
