import {
  Gauge, Package, ShoppingCart, ReceiptIndianRupee, Contact, Truck, ListChecks, Activity,
  Cpu, Route, CalendarClock, Tent, AlertTriangle, Warehouse, FileText, UserCheck, PackageCheck,
  TrendingDown, ShieldCheck, CalendarX, TriangleAlert, Star, Award, TrendingUp, Wallet, User,
  CheckCircle2, Clock, RefreshCw, Wrench, ArrowUpRight, LineChart,
} from 'lucide-react'
import { useDashboardsData, useDashboardSubView } from '@/features/inventory/hooks/useInventory'
import { Th, Td } from '@/features/inventory/components/IntelTableUi'
import { inr, buildDashboardKpis, poTotal, assetItems as getAssetItems } from '@/features/inventory/inventory.service'
import type { DashboardsData } from '@/features/inventory/inventory.service'
import { DASHBOARD_SEGS } from '@/features/inventory/inventory.types'
import type { DashboardKpiCard, DashboardSubView, ForecastRow } from '@/features/inventory/inventory.types'
import { KPI_TONE_COLOR } from '@/features/inventory/constants/kpiToneColor'
import { SHORTAGE_BAND_STYLE } from '@/features/inventory/constants/shortageBandStyle'

export type { DashboardSubView }

// Exact port of window.QMS_InvIntel's Dashboards tab (tabDashboards()/
// dashBody(), inventory-intel.js lines 175-315). Pure read-only analytics
// view — 8 sub-views selected via a segmented-control strip, each rendering
// its own kpiGrid() + one supporting table (Executive has no table). Every
// KPI tile that carries a `tab` navigates to a DIFFERENT tab via
// onNavigateTab (window.invSetTab in the prototype); table rows are never
// clickable in this tab. Zero Dialog/Drawer state — everything here is
// derived data + a single local `sub` selector (useDashboardSubView), no
// manual DOM patching needed (the prototype's rerender()/IN.dash mutation
// collapses to plain React state).

// icon name → lucide component — union of every icon referenced by the 8
// KPI sets in the research spec (kpiGrid()'s `k.icon` uses data-lucide names
// 1:1 with these PascalCase equivalents).
const KPI_ICONS: Record<string, typeof Package> = {
  package: Package,
  cpu: Cpu,
  route: Route,
  'shopping-cart': ShoppingCart,
  'calendar-clock': CalendarClock,
  tent: Tent,
  'list-checks': ListChecks,
  'alert-triangle': AlertTriangle,
  warehouse: Warehouse,
  'file-text': FileText,
  'user-check': UserCheck,
  'package-check': PackageCheck,
  'trending-down': TrendingDown,
  'shield-check': ShieldCheck,
  'calendar-x': CalendarX,
  'triangle-alert': TriangleAlert,
  truck: Truck,
  contact: Contact,
  star: Star,
  award: Award,
  'trending-up': TrendingUp,
  wallet: Wallet,
  user: User,
  'check-circle-2': CheckCircle2,
  clock: Clock,
  'refresh-cw': RefreshCw,
  wrench: Wrench,
}

// SEG_ICONS — segmented-control strip icons, exact order/copy of
// tabDashboards()'s `segs` array (inventory-intel.js:177).
const SEG_ICONS: Record<string, typeof Gauge> = {
  gauge: Gauge,
  package: Package,
  'shopping-cart': ShoppingCart,
  'receipt-indian-rupee': ReceiptIndianRupee,
  contact: Contact,
  truck: Truck,
  'list-checks': ListChecks,
  activity: Activity,
}

// Shared KPI tile — exact visual port of kpiGrid()/.kpi (14px radius,
// translucent --qms-surface bg, colored blob accent by tone), identical to
// InventoryKpiStrip's own tile markup. `card.tab` is genuinely optional here
// (Executive's "Avg readiness", every Finance tile, Vendor's "Avg
// scorecard" render with no click-through) — exact port of kpiGrid()'s
// `${k.tab ? 'clickable' : ''}` conditional.
function DashKpiTile({ card, onNavigate }: { card: DashboardKpiCard; onNavigate: (tab: string) => void }) {
  const color = KPI_TONE_COLOR[card.tone]
  const Icon = KPI_ICONS[card.icon] ?? Package
  const clickable = !!card.tab

  const inner = (
    <>
      <div
        className="absolute rounded-full pointer-events-none"
        style={{ right: -30, top: -30, width: 140, height: 140, opacity: 0.18, filter: 'blur(30px)', background: color }}
      />
      <div className="relative flex items-center gap-2 mb-1.75">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, rgba(36,81,240,.16), rgba(20,184,166,.16))', border: '1px solid var(--qms-border-strong)', color: 'var(--qms-brand)' }}
        >
          <Icon size={15} />
        </div>
        <div className="text-[11px] font-semibold uppercase tracking-wide truncate" style={{ color: 'var(--qms-text-muted)' }}>
          {card.label}
        </div>
      </div>
      <div className="relative text-[22px] font-extrabold leading-tight mb-1" style={{ color: 'var(--qms-text)', letterSpacing: '-0.02em' }}>
        {card.value}
      </div>
      <div className="relative text-xs" style={{ color: 'var(--qms-text-muted)' }}>{card.sub}</div>
      {clickable && (
        <ArrowUpRight
          size={14}
          className="absolute bottom-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          style={{ color: 'var(--qms-brand-600, var(--qms-brand))' }}
        />
      )}
    </>
  )

  if (!clickable) {
    return (
      <div
        className="group relative text-left rounded-[14px] border p-[13px_14px] overflow-hidden"
        style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
      >
        {inner}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onNavigate(card.tab!)}
      title={`Open ${card.label} → ${card.tab}`}
      className="group relative text-left rounded-[14px] border p-[13px_14px] overflow-hidden cursor-pointer transition-transform duration-150 hover:-translate-y-0.75"
      style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--qms-brand)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--qms-border)' }}
    >
      {inner}
    </button>
  )
}

function KpiGrid({ cards, onNavigate }: { cards: DashboardKpiCard[]; onNavigate: (tab: string) => void }) {
  return (
    <div className="grid gap-2.5 mb-3.5 grid-cols-4 max-[1300px]:grid-cols-3 max-[980px]:grid-cols-2 max-[560px]:grid-cols-1">
      {cards.map((card) => (
        <DashKpiTile key={card.label} card={card} onNavigate={onNavigate} />
      ))}
    </div>
  )
}

// .form-section-h — exact port (flex row, gap:8px, margin:18px 0 10px,
// dashed bottom border, 12px/700/uppercase/.04em tracking) with a 22×22
// rounded-7 gradient icon swatch (brand-600→teal-500, white icon) — reuses
// the same inline pattern already established by DeviceDetailDrawer.tsx.
function FormSectionH({ icon: Icon, children }: { icon: typeof LineChart; children: React.ReactNode }) {
  return (
    <div
      className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.04em]"
      style={{ margin: '18px 0 10px', paddingBottom: 8, borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text-soft)' }}
    >
      <span
        className="w-[22px] h-[22px] rounded-[7px] text-white grid place-items-center flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
      >
        <Icon size={13} />
      </span>
      {children}
    </div>
  )
}

// .im-tbl — shared table shell (border-collapse, 12px font, dashed row
// borders, hover tint, .num right-align+tabular-nums) — used by all 6
// supporting tables. Wrapped in '.inv-card' (padding:0, overflow:auto).
function ImTable({ children, minWidth }: { children: React.ReactNode; minWidth?: number }) {
  return (
    <div className="rounded-2xl border overflow-auto" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
      <table className="w-full border-collapse text-xs" style={minWidth ? { minWidth } : undefined}>
        {children}
      </table>
    </div>
  )
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="text-center" style={{ padding: 18, color: 'var(--qms-text-muted)' }}>
        {label}
      </td>
    </tr>
  )
}

function ImBand({ tone, children }: { tone: 'green' | 'amber' | 'orange' | 'red'; children: React.ReactNode }) {
  const s = SHORTAGE_BAND_STYLE[tone]
  return (
    <span
      className="inline-flex items-center font-bold rounded-full"
      style={{ padding: '2px 8px', fontSize: 10, background: s.bg, color: s.fg }}
    >
      {children}
    </span>
  )
}

// tableFromForecast() — exact port (inventory-intel.js:272-276). Shared by
// the Inventory sub-view (60-day window) and Operations sub-view (30-day
// window), both sliced to first 10 rows (forecast() itself is pre-sorted by
// shortage DESC).
function TableFromForecast({ rows, title }: { rows: ForecastRow[]; title: string }) {
  const body = rows.slice(0, 10)
  return (
    <>
      <FormSectionH icon={LineChart}>{title}</FormSectionH>
      <ImTable>
        <thead>
          <tr>
            <Th>Item</Th>
            <Th num>Required</Th>
            <Th num>Available</Th>
            <Th num>Shortage</Th>
            <Th num>Procure</Th>
          </tr>
        </thead>
        <tbody>
          {body.length === 0 ? (
            <EmptyRow colSpan={5} label="No demand in window." />
          ) : (
            body.map((r) => (
              <tr key={r.it.id} className="hover:bg-[rgba(59,109,255,.03)]">
                <Td bold>{r.it.name}</Td>
                <Td num>{r.required}</Td>
                <Td num>{r.available}</Td>
                <Td num>{r.shortage ? <ImBand tone="red">{r.shortage}</ImBand> : <ImBand tone="green">0</ImBand>}</Td>
                <Td num>{r.procure || '—'}</Td>
              </tr>
            ))
          )}
        </tbody>
      </ImTable>
    </>
  )
}

// poTable() — exact port (inventory-intel.js:277-280). First 12 POs, stored order.
function PoTable({ data }: { data: DashboardsData }) {
  const body = data.pos.slice(0, 12)
  return (
    <ImTable>
      <thead>
        <tr>
          <Th>PO</Th>
          <Th>Vendor</Th>
          <Th>Item</Th>
          <Th num>Total</Th>
          <Th>Status</Th>
        </tr>
      </thead>
      <tbody>
        {body.length === 0 ? (
          <EmptyRow colSpan={5} label="No purchase orders." />
        ) : (
          body.map((p) => (
            <tr key={p.id} className="hover:bg-[rgba(59,109,255,.03)]">
              <Td bold>{p.id}</Td>
              <Td>{p.vendorName}</Td>
              <Td>{p.itemName}</Td>
              <Td num>{inr(poTotal(p))}</Td>
              <Td>{p.status}</Td>
            </tr>
          ))
        )}
      </tbody>
    </ImTable>
  )
}

// depreciationTable() — exact port (inventory-intel.js:281-288). First 14
// asset items. annual = WDV branch uses currentValue-or-purchaseCost × pct%,
// else Straight Line uses purchaseCost × pct%. Reads assetItems() directly
// (service-level export) rather than threading it through DashboardsData,
// since it's a pure re-derivation of the same item-master store already
// loaded for valuation().
function DepreciationScheduleTable() {
  const rows = getAssetItems().slice(0, 14)
  return (
    <ImTable>
      <thead>
        <tr>
          <Th>Asset</Th>
          <Th>Method</Th>
          <Th num>Cost</Th>
          <Th num>Book value</Th>
          <Th num>Annual depr.</Th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <EmptyRow colSpan={5} label="No asset items." />
        ) : (
          rows.map((it) => {
            const annual = it.deprMethod === 'Written Down Value'
              ? Math.round((it.currentValue || it.purchaseCost || 0) * (it.deprPct || 0) / 100)
              : Math.round((it.purchaseCost || 0) * (it.deprPct || 0) / 100)
            return (
              <tr key={it.id} className="hover:bg-[rgba(59,109,255,.03)]">
                <Td bold>{it.name}</Td>
                <Td>{it.deprMethod || '—'}</Td>
                <Td num>{inr(it.purchaseCost || 0)}</Td>
                <Td num>{inr(it.currentValue || 0)}</Td>
                <Td num>{inr(annual)}</Td>
              </tr>
            )
          })
        )}
      </tbody>
    </ImTable>
  )
}

// vendorTable() — exact port (inventory-intel.js:289-291). First 12 ranked
// vendors (already sorted descending by sc).
function VendorTable({ data }: { data: DashboardsData }) {
  const rows = data.ranked.slice(0, 12)
  return (
    <ImTable>
      <thead>
        <tr>
          <Th>Vendor</Th>
          <Th>Category</Th>
          <Th num>Delivery</Th>
          <Th num>Quality</Th>
          <Th num>Cost</Th>
          <Th num>Score</Th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <EmptyRow colSpan={6} label="No vendors." />
        ) : (
          rows.map((r) => (
            <tr key={r.v.id} className="hover:bg-[rgba(59,109,255,.03)]">
              <Td bold>{r.v.name}</Td>
              <Td>{r.v.category}</Td>
              <Td num>{r.v.deliveryScore}</Td>
              <Td num>{r.v.qualityScore}</Td>
              <Td num>{r.v.costScore}</Td>
              <Td num bold>{r.sc}</Td>
            </tr>
          ))
        )}
      </tbody>
    </ImTable>
  )
}

// transferTable() — exact port (inventory-intel.js:293-296). First 12
// transfers, stored order. Status underscores replaced with spaces.
function TransferTable({ data }: { data: DashboardsData }) {
  const rows = data.logisticsTransfers.slice(0, 12)
  return (
    <ImTable>
      <thead>
        <tr>
          <Th>Transfer</Th>
          <Th>Item</Th>
          <Th num>Logistics</Th>
          <Th>Status</Th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <EmptyRow colSpan={4} label="No transfers." />
        ) : (
          rows.map((t) => (
            <tr key={t.id} className="hover:bg-[rgba(59,109,255,.03)]">
              <Td bold>{t.id}</Td>
              <Td>{t.itemName}</Td>
              <Td num>{inr(t.logistics)}</Td>
              <Td>{(t.status || '').replace('_', ' ')}</Td>
            </tr>
          ))
        )}
      </tbody>
    </ImTable>
  )
}

// gauge() — exact port (inventory-intel.js:306): tiny inline factor label,
// colored by its own fraction ≥0.9 (green) / ≥0.6 (amber) / else (red).
function ReadinessGauge({ label, frac }: { label: string; frac: number }) {
  const color = frac >= 0.9 ? '#059669' : frac >= 0.6 ? '#a16207' : '#e11d48'
  return (
    <span style={{ fontSize: 10, color, fontWeight: 700, marginRight: 6 }}>
      {label} {Math.round(frac * 100)}
    </span>
  )
}

// readinessTable() — exact port (inventory-intel.js:297-305). Sorted
// ASCENDING by score (worst-first), min-width:760px to force horizontal
// scroll on narrow viewports.
function ReadinessTable({ data }: { data: DashboardsData }) {
  const rows = [...data.ready].sort((a, b) => a.r.score - b.r.score)
  return (
    <ImTable minWidth={760}>
      <thead>
        <tr>
          <Th>Camp</Th>
          <Th>Type</Th>
          <Th>Status</Th>
          <Th num>Score</Th>
          <Th>Factors</Th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <EmptyRow colSpan={5} label="No upcoming camps." />
        ) : (
          rows.map(({ c, r }) => (
            <tr key={c.id} className="hover:bg-[rgba(59,109,255,.03)]">
              <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)' }}>
                <b style={{ color: 'var(--qms-text)' }}>{c.id}</b>
                <div className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>{c.date} · {c.city || ''}</div>
              </td>
              <Td>{c.type}</Td>
              <Td>{c.status}</Td>
              <Td num>
                <ImBand tone={r.band}>{r.score}%</ImBand>
              </Td>
              <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)' }}>
                <ReadinessGauge label="Man" frac={r.manpower} />
                <ReadinessGauge label="Dev" frac={r.devices} />
                <ReadinessGauge label="Cons" frac={r.consumables} />
                <ReadinessGauge label="Log" frac={r.logistics} />
                <ReadinessGauge label="Appr" frac={r.approvals} />
              </td>
            </tr>
          ))
        )}
      </tbody>
    </ImTable>
  )
}

function DashboardBody({ sub, data, onNavigate }: { sub: DashboardSubView; data: DashboardsData; onNavigate: (tab: string) => void }) {
  const kpis = buildDashboardKpis(sub, data)

  if (sub === 'exec') {
    return (
      <>
        <KpiGrid cards={kpis} onNavigate={onNavigate} />
        <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)', margin: '-6px 0 12px' }}>
          Executive snapshot · live across all modules.
        </div>
      </>
    )
  }

  if (sub === 'inventory') {
    return (
      <>
        <KpiGrid cards={kpis} onNavigate={onNavigate} />
        <TableFromForecast rows={data.forecast60} title="Inventory pressure (60-day demand vs stock)" />
      </>
    )
  }

  if (sub === 'procurement') {
    return (
      <>
        <KpiGrid cards={kpis} onNavigate={onNavigate} />
        <PoTable data={data} />
      </>
    )
  }

  if (sub === 'finance') {
    return (
      <>
        <KpiGrid cards={kpis} onNavigate={onNavigate} />
        <FormSectionH icon={TrendingDown}>Depreciation schedule</FormSectionH>
        <DepreciationScheduleTable />
      </>
    )
  }

  if (sub === 'vendor') {
    return (
      <>
        <KpiGrid cards={kpis} onNavigate={onNavigate} />
        <VendorTable data={data} />
      </>
    )
  }

  if (sub === 'logistics') {
    return (
      <>
        <KpiGrid cards={kpis} onNavigate={onNavigate} />
        <TransferTable data={data} />
      </>
    )
  }

  if (sub === 'readiness') {
    return (
      <>
        <KpiGrid cards={kpis} onNavigate={onNavigate} />
        <ReadinessTable data={data} />
      </>
    )
  }

  // operations
  return (
    <>
      <KpiGrid cards={kpis} onNavigate={onNavigate} />
      <TableFromForecast rows={data.forecast30} title="30-day procurement actions" />
    </>
  )
}

interface DashboardsTabProps {
  /** window.invSetTab(tab) in the prototype — every Dashboards KPI tile that
   * carries a `tab` navigates to a DIFFERENT tab within the same Inventory &
   * Devices shell. InventoryPage owns the active-tab state and passes its
   * own setter down, the same wiring pattern already used for
   * InventoryKpiStrip's onNavigateTab prop. */
  onNavigateTab: (tab: string) => void
  /** Optional externally-controlled sub-view + setter — lets a sibling tab's
   * deep-link (Copilot's "Readiness →" card: `window.QMS_InvIntel.setDash(
   * 'readiness'); window.invSetTab('dashboards')`, chained in one onclick)
   * preset the segmented control before this tab mounts/re-renders. Falls
   * back to the tab's own local useDashboardSubView() state when the parent
   * doesn't pass these — every other caller (plain tab-strip clicks) is
   * unaffected. */
  sub?: DashboardSubView
  onSubChange?: (sub: DashboardSubView) => void
}

const DashboardsTab = ({ onNavigateTab, sub: subProp, onSubChange }: DashboardsTabProps) => {
  const { data, isLoading } = useDashboardsData()
  const local = useDashboardSubView()
  const sub = subProp ?? local.sub
  const setSub = onSubChange ?? local.setSub

  if (isLoading || !data) {
    return (
      <div className="text-center rounded-[14px]" style={{ padding: 48, fontSize: 12, color: 'var(--qms-text-muted)', border: '1.5px dashed var(--qms-border-strong)' }}>
        Loading dashboards…
      </div>
    )
  }

  return (
    <div>
      {/* .in-seg — segmented-control strip, 8 buttons */}
      <div
        className="inline-flex gap-1 p-1 rounded-[10px] mb-3.5 flex-wrap"
        style={{ background: 'var(--qms-surface-strong)' }}
      >
        {DASHBOARD_SEGS.map((s) => {
          const Icon = SEG_ICONS[s.icon] ?? Gauge
          const active = sub === s.id
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSub(s.id)}
              className="inline-flex items-center gap-1.5 rounded-lg text-xs font-bold border-0"
              style={{
                padding: '6px 12px',
                background: active ? 'var(--qms-card)' : 'transparent',
                color: active ? 'var(--qms-text)' : 'var(--qms-text-muted)',
                boxShadow: active ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
              }}
            >
              <Icon size={13} /> {s.label}
            </button>
          )
        })}
      </div>

      <DashboardBody sub={sub} data={data} onNavigate={onNavigateTab} />
    </div>
  )
}

export default DashboardsTab
