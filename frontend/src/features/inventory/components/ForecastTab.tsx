import { useMemo, useState } from 'react'
import { LineChart, Calculator, RefreshCw, Check } from 'lucide-react'
import SideDrawer from '@/components/ui/SideDrawer'
import { toast } from '@/components/ui/sonner'
import { ItemDetailDrawerBody } from '@/features/inventory/components/ItemMasterTab'
import {
  useItemMaster, useForecastWindow, useDemandForecast, useConsumptionCamps, useConsumedCamps,
} from '@/features/inventory/hooks/useInventory'
import { usePeopleData } from '@/hooks/usePeopleData'
import { inr, inrShort, totalProcureCost, runAutoReorder, campConsumptionLines, upcomingCamps } from '@/features/inventory/inventory.service'
import type { CampConsumptionLine } from '@/features/inventory/inventory.service'
import type { ForecastRow } from '@/features/inventory/inventory.types'

// Exact port of window.QMS_InvIntel's Forecast tab (tabForecast()/
// viewDemand()/viewConsumption(), inventory-intel.js lines 318-393). No page-
// level KPI grid here (that's exclusive to Dashboards) — this tab's only two
// surfaces are a tab-switch segment (Demand forecast / Camp consumption
// engine) and, within Demand, a second window-selector row (30/60/90/180d).
// Zero modals of its own: table rows in the Demand sub-view open the SHARED
// Item Master detail drawer (same component ItemMasterTab.tsx exports),
// "Auto-reorder shortages" and "Apply deduction" are both toast-only
// side-effecting actions with no confirmation step, matching the prototype.

const IM_BAND_STYLE: Record<'green' | 'red', { bg: string; fg: string }> = {
  green: { bg: 'rgba(16,185,129,.15)', fg: '#059669' },
  red: { bg: 'rgba(244,63,94,.15)', fg: '#e11d48' },
}

function ImBand({ tone, children }: { tone: 'green' | 'red'; children: React.ReactNode }) {
  const s = IM_BAND_STYLE[tone]
  return (
    <span className="inline-flex items-center font-bold rounded-full" style={{ padding: '2px 8px', fontSize: 10, background: s.bg, color: s.fg }}>
      {children}
    </span>
  )
}

// .im-tbl shell — exact port of inventory-intel.js's injected CSS (lines
// 136-155): border-collapse, 12px font, dashed row borders, hover tint,
// .num right-align + tabular-nums. Wrapped inline as a '.inv-card' with
// padding:0 (the Forecast tables override the card's normal 16px padding).

function Th({ children, num }: { children: React.ReactNode; num?: boolean }) {
  return (
    <th
      className={`font-bold uppercase tracking-[.04em] ${num ? 'text-right' : 'text-left'}`}
      style={{ padding: '8px 6px', fontSize: 10, color: 'var(--qms-text-muted)', borderBottom: '1px dashed var(--qms-border)' }}
    >
      {children}
    </th>
  )
}

function Td({ children, num, bold }: { children: React.ReactNode; num?: boolean; bold?: boolean }) {
  return (
    <td className={num ? 'text-right tabular-nums' : ''} style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>
      {bold ? <b>{children}</b> : children}
    </td>
  )
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="text-center" style={{ padding: 24, color: 'var(--qms-text-muted)' }}>
        {label}
      </td>
    </tr>
  )
}

// '.inv-filter' — sticky filter/toolbar bar shared by every intel tab, exact
// port of inventory.js's injected CSS: flex row, gap 8px, padding 10px 12px,
// sticky top:60px z-index:25.
function InvFilterBar({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center gap-2 flex-wrap rounded-[10px] border mb-3 sticky z-25"
      style={{ padding: '10px 12px', background: 'var(--qms-surface)', borderColor: 'var(--qms-border)', top: 60 }}
    >
      {children}
    </div>
  )
}

const WINDOWS = [30, 60, 90, 180]

// ── Demand forecast sub-view (viewDemand()) ─────────────────────────────────
function DemandForecastView({ onOpenItem }: { onOpenItem: (id: string) => void }) {
  const { win, setWin } = useForecastWindow()
  const rows = useDemandForecast(win)

  const campsInWindow = useMemo(
    () => upcomingCamps().filter((c) => (new Date(c.date).getTime() - Date.now()) / 86400000 <= win).length,
    [win],
  )
  const totProcure = totalProcureCost(rows)

  const handleAutoReorder = () => {
    const result = runAutoReorder()
    if (result.ok) {
      toast.success('Auto-reorder PRs raised — see Procurement')
    } else {
      toast.error('Procurement module not loaded')
    }
  }

  return (
    <>
      {/* Second window-selector segment — individually bordered pills on a
          transparent background (inline style="background:transparent;
          padding:0" in the prototype), NOT the pill-group '.in-seg' look. */}
      <div className="inline-flex gap-1 mb-3.5 flex-wrap">
        {WINDOWS.map((w) => {
          const active = win === w
          return (
            <button
              key={w}
              type="button"
              onClick={() => setWin(w)}
              className="inline-flex items-center gap-1.5 rounded-lg text-xs font-bold border"
              style={{
                padding: '6px 12px',
                borderColor: 'var(--qms-border)',
                background: active ? 'var(--qms-card, var(--qms-surface))' : 'transparent',
                color: active ? 'var(--qms-text)' : 'var(--qms-text-muted)',
                boxShadow: active ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
              }}
            >
              {w} days
            </button>
          )
        })}
      </div>

      <InvFilterBar>
        <span className="text-xs font-bold uppercase" style={{ color: 'var(--qms-text-muted)' }}>
          Demand forecast · {win}-day horizon
        </span>
        <span className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>
          {campsInWindow} camps · projected procurement {inrShort(totProcure)}
        </span>
        <button
          type="button"
          onClick={handleAutoReorder}
          className="inline-flex items-center gap-1.5 rounded-[14px] text-xs font-bold text-white ml-auto"
          style={{ padding: '7px 14px', background: 'linear-gradient(135deg, var(--qms-brand-600, var(--qms-brand)), var(--qms-brand) 60%, var(--qms-teal))', border: '1px solid transparent' }}
        >
          <RefreshCw size={13} /> Auto-reorder shortages
        </button>
      </InvFilterBar>

      <div className="rounded-2xl border overflow-auto" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <table className="w-full border-collapse text-xs" style={{ minWidth: 720 }}>
          <thead>
            <tr>
              <Th>Item</Th>
              <Th num>Required</Th>
              <Th num>Available</Th>
              <Th num>Shortage</Th>
              <Th num>Procure qty</Th>
              <Th num>Procure ₹</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <EmptyRow colSpan={6} label="No demand in this window." />
            ) : (
              rows.map((r: ForecastRow) => (
                <tr
                  key={r.it.id}
                  className="cursor-pointer hover:bg-[rgba(59,109,255,.03)]"
                  onClick={() => onOpenItem(r.it.id)}
                >
                  <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)' }}>
                    <b style={{ color: 'var(--qms-text)' }}>{r.it.name}</b>
                    <div className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>{r.it.code || ''}</div>
                  </td>
                  <Td num>{r.required}</Td>
                  <Td num>{r.available}</Td>
                  <Td num>{r.shortage > 0 ? <ImBand tone="red">{r.shortage}</ImBand> : <ImBand tone="green">0</ImBand>}</Td>
                  <Td num>{r.procure || '—'}</Td>
                  <Td num>{r.procure ? inr(r.procure * (r.it.purchaseCost || 0)) : '—'}</Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

// ── Camp consumption engine sub-view (viewConsumption()) ────────────────────
function ConsumptionEngineView() {
  const camps = useConsumptionCamps()
  const { consumed, applyConsumption } = useConsumedCamps()
  const { people } = usePeopleData()
  const [campId, setCampId] = useState<string>('')
  const [applying, setApplying] = useState(false)

  // IN.camp defaults to the first (most recent) camp id when nothing is
  // selected yet and the list is non-empty — exact port of viewConsumption().
  const selectedId = campId || camps[0]?.id || ''
  const camp = camps.find((c) => c.id === selectedId) ?? null

  if (camps.length === 0) {
    return (
      <div className="text-center rounded-[14px]" style={{ padding: 24, color: 'var(--qms-text-muted)' }}>
        No camps.
      </div>
    )
  }

  const already = camp ? consumed.includes(camp.id) : false
  const lines: CampConsumptionLine[] = camp ? campConsumptionLines(camp) : []
  const patients = camp ? (camp.patientsDone || camp.patientsExpected || 0) : 0
  const totVal = lines.reduce((a, l) => a + l.value, 0)

  const handleApply = async () => {
    if (!camp || already) {
      if (camp && already) toast.info(`Already deducted for ${camp.id}`)
      return
    }
    setApplying(true)
    try {
      const result = await applyConsumption(camp.id)
      toast.success(`Consumption deducted for ${camp.id} · ${result.skuCount} SKUs`)
    } catch (err) {
      if (err instanceof Error && err.message === 'ALREADY_CONSUMED') {
        toast.info(`Already deducted for ${camp.id}`)
      }
    } finally {
      setApplying(false)
    }
  }

  return (
    <>
      <InvFilterBar>
        <span className="text-xs font-bold uppercase" style={{ color: 'var(--qms-text-muted)' }}>
          Camp consumption engine
        </span>
        <select
          className="rounded-lg border text-xs px-2.5 py-1.5"
          style={{ minWidth: 260, borderColor: 'var(--qms-border)', background: 'var(--qms-surface-input)', color: 'var(--qms-text)' }}
          value={selectedId}
          onChange={(e) => setCampId(e.target.value)}
        >
          {camps.map((c) => (
            <option key={c.id} value={c.id}>
              {c.id} · {c.date} · {c.city} · {c.status}{consumed.includes(c.id) ? ' ✓' : ''}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={already || applying}
          onClick={handleApply}
          className="inline-flex items-center gap-1.5 rounded-[14px] text-xs font-bold text-white ml-auto disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ padding: '7px 14px', background: 'linear-gradient(135deg, var(--qms-brand-600, var(--qms-brand)), var(--qms-brand) 60%, var(--qms-teal))', border: '1px solid transparent' }}
        >
          <Check size={13} /> {already ? 'Already deducted' : 'Apply deduction'}
        </button>
      </InvFilterBar>

      <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)', margin: '-6px 0 12px' }}>
        {patients} patients · auto-deduct = patients × per-patient usage + 5% wastage.{' '}
        {camp?.foId ? `Draws from FO ${people.find((p) => p.id === camp.foId)?.name || camp.foId}'s kit (else Central WH).` : 'Draws from Central WH.'}
      </div>

      <div className="rounded-2xl border overflow-auto" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <table className="w-full border-collapse text-xs" style={{ minWidth: 720 }}>
          <thead>
            <tr>
              <Th>Consumable</Th>
              <Th num>Patients</Th>
              <Th num>Per patient</Th>
              <Th num>Deduct (incl 5%)</Th>
              <Th num>On hand</Th>
              <Th num>Value</Th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <EmptyRow colSpan={6} label="No mapped consumables for this camp." />
            ) : (
              lines.map((l) => (
                <tr key={l.it.id} className="hover:bg-[rgba(59,109,255,.03)]">
                  <Td bold>{l.it.name}</Td>
                  <Td num>{l.patients}</Td>
                  <Td num>{l.perPatient}</Td>
                  <Td num>{l.qty} {l.it.uom}</Td>
                  <Td num>{l.it.qtyOnHand ?? 0}</Td>
                  <Td num>{inr(l.value)}</Td>
                </tr>
              ))
            )}
          </tbody>
          {lines.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={5} className="text-right font-bold" style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>
                  Total consumption value
                </td>
                <Td num bold>{inr(totVal)}</Td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </>
  )
}

// ── Top-level tab: the .in-seg segmented control + one of the two sub-views ─
const ForecastTab = () => {
  const [fseg, setFseg] = useState<'demand' | 'consumption'>('demand')
  const { items } = useItemMaster()
  const [openItemId, setOpenItemId] = useState<string | null>(null)
  const openItem = items.find((x) => x.id === openItemId) ?? null

  return (
    <div>
      {/* .in-seg — tab-switch segment, pill-group background */}
      <div className="inline-flex gap-1 p-1 rounded-[10px] mb-3.5 flex-wrap" style={{ background: 'var(--qms-surface-strong)' }}>
        <button
          type="button"
          onClick={() => setFseg('demand')}
          className="inline-flex items-center gap-1.5 rounded-lg text-xs font-bold border-0"
          style={{
            padding: '6px 12px',
            background: fseg === 'demand' ? 'var(--qms-card, var(--qms-surface))' : 'transparent',
            color: fseg === 'demand' ? 'var(--qms-text)' : 'var(--qms-text-muted)',
            boxShadow: fseg === 'demand' ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
          }}
        >
          <LineChart size={13} /> Demand forecast
        </button>
        <button
          type="button"
          onClick={() => setFseg('consumption')}
          className="inline-flex items-center gap-1.5 rounded-lg text-xs font-bold border-0"
          style={{
            padding: '6px 12px',
            background: fseg === 'consumption' ? 'var(--qms-card, var(--qms-surface))' : 'transparent',
            color: fseg === 'consumption' ? 'var(--qms-text)' : 'var(--qms-text-muted)',
            boxShadow: fseg === 'consumption' ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
          }}
        >
          <Calculator size={13} /> Camp consumption engine
        </button>
      </div>

      {fseg === 'demand' ? (
        <DemandForecastView onOpenItem={setOpenItemId} />
      ) : (
        <ConsumptionEngineView />
      )}

      {/* Cross-tab integration point: Demand-forecast rows open the SAME
          shared Item Master detail drawer as the Item Master/Expiry tabs. */}
      <SideDrawer open={!!openItem} title={openItem?.name ?? 'Item'} onClose={() => setOpenItemId(null)} widthClassName="max-w-3xl">
        {openItem && (
          <ItemDetailDrawerBody item={openItem} onEdit={() => setOpenItemId(null)} onClose={() => setOpenItemId(null)} />
        )}
      </SideDrawer>
    </div>
  )
}

export default ForecastTab
