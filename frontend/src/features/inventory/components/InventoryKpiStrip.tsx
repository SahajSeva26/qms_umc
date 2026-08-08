import { Sparkles } from 'lucide-react'
import { useInventoryOverview } from '@/features/inventory/hooks/useInventory'
import type { InventoryKpiCard } from '@/features/inventory/inventory.types'
import {
  Cpu, Route, CheckCircle2, AlertTriangle, Clock, Wallet, Package, Box, ArrowUpRight,
} from 'lucide-react'
import { KPI_TONE_COLOR } from '@/features/inventory/constants/kpiToneColor'

// KPI grid + AI banner — exact port of inventory.js's renderKpis() (lines
// 321-362) + renderAi() (lines 364-379). Shared across every tab in the
// prototype's shell (rendered once, above the tab strip) — lifted out of
// OverviewTab.tsx (2026-08-03) into its own component so InventoryPage can
// render it once regardless of which tab is active, matching the prototype
// exactly rather than only showing it on the Overview tab.

const KPI_ICONS: Record<string, typeof Cpu> = {
  cpu: Cpu,
  route: Route,
  'check-circle-2': CheckCircle2,
  'alert-triangle': AlertTriangle,
  clock: Clock,
  wallet: Wallet,
  package: Package,
  box: Box,
}

function KpiCard({ card, onNavigate }: { card: InventoryKpiCard; onNavigate: (tab: string) => void }) {
  const color = KPI_TONE_COLOR[card.tone]
  return (
    <button
      type="button"
      onClick={() => onNavigate(card.tab)}
      title={`Open ${card.label} → ${card.tab}`}
      className="group relative text-left rounded-[14px] border p-[13px_14px] overflow-hidden cursor-pointer transition-transform duration-150 hover:-translate-y-0.75"
      style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)', backdropFilter: 'blur(20px) saturate(140%)' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--qms-brand)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--qms-border)' }}
    >
      <div
        className="absolute rounded-full pointer-events-none"
        style={{ right: -30, top: -30, width: 140, height: 140, opacity: 0.18, filter: 'blur(30px)', background: color }}
      />
      <div className="relative flex items-center gap-2 mb-1.75">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, rgba(36,81,240,.16), rgba(20,184,166,.16))', border: '1px solid var(--qms-border-strong)', color: 'var(--qms-brand)' }}
        >
          {(() => {
            const Icon = KPI_ICONS[card.icon] ?? Cpu
            return <Icon size={15} />
          })()}
        </div>
        <div className="text-[11px] font-semibold uppercase tracking-wide truncate" style={{ color: 'var(--qms-text-muted)' }}>
          {card.label}
        </div>
      </div>
      <div className="relative text-[22px] font-extrabold leading-tight mb-1" style={{ color: 'var(--qms-text)', letterSpacing: '-0.02em' }}>
        {card.value}
      </div>
      <div className="relative text-xs" style={{ color: 'var(--qms-text-muted)' }}>{card.sub}</div>
      <ArrowUpRight
        size={14}
        className="absolute bottom-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        style={{ color: 'var(--qms-brand-600, var(--qms-brand))' }}
      />
    </button>
  )
}

interface InventoryKpiStripProps {
  /** Fires when a KPI tile is clicked — exact port of window.invSetTab(tab). */
  onNavigateTab: (tab: string) => void
}

const InventoryKpiStrip = ({ onNavigateTab }: InventoryKpiStripProps) => {
  const { kpis, aiSummary, isLoading } = useInventoryOverview()

  return (
    <>
      {/* KPI grid — shared '.kpi-grid' (repeat(4,1fr), gap:10px, margin-bottom:16px;
          responsive 3/2/1 cols under 1300/980/560px) */}
      <div className="grid gap-2.5 mb-4 grid-cols-4 max-[1300px]:grid-cols-3 max-[980px]:grid-cols-2 max-[560px]:grid-cols-1">
        {kpis.map((card) => (
          <KpiCard key={card.label} card={card} onNavigate={onNavigateTab} />
        ))}
      </div>

      {/* AI banner — shared '.ai-banner' strip */}
      <div
        className="flex items-center gap-3 rounded-[20px] border p-3.5 mb-4"
        style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border-strong)' }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white"
          style={{ background: 'linear-gradient(135deg, var(--qms-violet, #8b5cf6), var(--qms-brand))' }}
        >
          <Sparkles size={18} />
        </div>
        <div className="flex-1 text-sm" style={{ color: 'var(--qms-text-soft)' }}>
          <b style={{ color: 'var(--qms-text)' }}>Inventory copilot:</b>{' '}
          <span dangerouslySetInnerHTML={{ __html: isLoading ? 'Loading insights…' : aiSummary }} />
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold rounded-[10px] border px-3 py-1.5"
          style={{ color: 'var(--qms-text-soft)', borderColor: 'var(--qms-border-strong)' }}
        >
          Run
        </button>
      </div>
    </>
  )
}

export default InventoryKpiStrip
