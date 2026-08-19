import type { IconType } from 'react-icons'
import {
  FiPackage, FiShoppingCart, FiUser, FiTruck, FiCheckSquare, FiActivity,
  FiCpu, FiCalendar, FiAlertTriangle, FiFileText, FiUserCheck,
  FiTrendingDown, FiShield, FiStar, FiAward, FiTrendingUp, FiCheckCircle,
  FiClock, FiRefreshCw, FiTool, FiArrowUpRight,
} from 'react-icons/fi'
import {
  TbGauge, TbReceiptRupee, TbRoute, TbTent, TbBuildingWarehouse, TbPackageImport,
  TbCalendarX, TbWallet,
} from 'react-icons/tb'
import { useDashboardsData, useDashboardSubView } from '@/features/inventory/hooks/useInventory'
import { Th, Td } from '@/features/inventory/components/IntelTableUi'
import { inr, buildDashboardKpis, poTotal, assetItems as getAssetItems } from '@/features/inventory/inventory.service'
import type { DashboardsData } from '@/features/inventory/inventory.service'
import { DASHBOARD_SEGS } from '@/features/inventory/inventory.types'
import type { DashboardKpiCard, DashboardSubView, ForecastRow } from '@/features/inventory/inventory.types'
import { KPI_TONE_COLOR } from '@/features/inventory/constants/kpiToneColor'
import { SHORTAGE_BAND_STYLE } from '@/features/inventory/constants/shortageBandStyle'

export type { DashboardSubView }

// Pure read-only analytics view — 8 sub-views selected via a segmented
// control, each rendering its own KPI grid + one supporting table.

// Icon keys are a data contract with inventory.service.ts's KPI definitions.
const KPI_ICONS: Record<string, IconType> = {
  package: FiPackage,
  cpu: FiCpu,
  route: TbRoute,
  'shopping-cart': FiShoppingCart,
  'calendar-clock': FiCalendar,
  tent: TbTent,
  'list-checks': FiCheckSquare,
  'alert-triangle': FiAlertTriangle,
  warehouse: TbBuildingWarehouse,
  'file-text': FiFileText,
  'user-check': FiUserCheck,
  'package-check': TbPackageImport,
  'trending-down': FiTrendingDown,
  'shield-check': FiShield,
  'calendar-x': TbCalendarX,
  'triangle-alert': FiAlertTriangle,
  truck: FiTruck,
  contact: FiUser,
  star: FiStar,
  award: FiAward,
  'trending-up': FiTrendingUp,
  wallet: TbWallet,
  user: FiUser,
  'check-circle-2': FiCheckCircle,
  clock: FiClock,
  'refresh-cw': FiRefreshCw,
  wrench: FiTool,
}

const SEG_ICONS: Record<string, IconType> = {
  gauge: TbGauge,
  package: FiPackage,
  'shopping-cart': FiShoppingCart,
  'receipt-indian-rupee': TbReceiptRupee,
  contact: FiUser,
  truck: FiTruck,
  'list-checks': FiCheckSquare,
  activity: FiActivity,
}

// `card.tab` is optional — some tiles (Executive's "Avg readiness", Finance,
// Vendor's "Avg scorecard") render with no click-through.
function DashKpiTile({ card, onNavigate }: { card: DashboardKpiCard; onNavigate: (tab: string) => void }) {
  const color = KPI_TONE_COLOR[card.tone]
  const Icon = KPI_ICONS[card.icon] ?? FiPackage
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
        <FiArrowUpRight
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

function FormSectionH({ icon: Icon, children }: { icon: IconType; children: React.ReactNode }) {
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

// Shared by Inventory (60-day) and Operations (30-day) sub-views, sliced to
// first 10 rows; `rows` is pre-sorted by shortage DESC.
function TableFromForecast({ rows, title }: { rows: ForecastRow[]; title: string }) {
  const body = rows.slice(0, 10)
  return (
    <>
      <FormSectionH icon={FiTrendingUp}>{title}</FormSectionH>
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

// First 14 asset items; WDV uses currentValue-or-purchaseCost × pct%, Straight Line uses purchaseCost × pct%.
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

function ReadinessGauge({ label, frac }: { label: string; frac: number }) {
  const color = frac >= 0.9 ? '#059669' : frac >= 0.6 ? '#a16207' : '#e11d48'
  return (
    <span style={{ fontSize: 10, color, fontWeight: 700, marginRight: 6 }}>
      {label} {Math.round(frac * 100)}
    </span>
  )
}

// Sorted ascending by score (worst-first).
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
        <FormSectionH icon={FiTrendingDown}>Depreciation schedule</FormSectionH>
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

  return (
    <>
      <KpiGrid cards={kpis} onNavigate={onNavigate} />
      <TableFromForecast rows={data.forecast30} title="30-day procurement actions" />
    </>
  )
}

interface DashboardsTabProps {
  onNavigateTab: (tab: string) => void
  /** Optional externally-controlled sub-view + setter — lets a sibling tab's
   * deep-link preset the segmented control before this tab mounts. Falls
   * back to local useDashboardSubView() state otherwise. */
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
      <div
        className="inline-flex gap-1 p-1 rounded-[10px] mb-3.5 flex-wrap"
        style={{ background: 'var(--qms-surface-strong)' }}
      >
        {DASHBOARD_SEGS.map((s) => {
          const Icon = SEG_ICONS[s.icon] ?? TbGauge
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
