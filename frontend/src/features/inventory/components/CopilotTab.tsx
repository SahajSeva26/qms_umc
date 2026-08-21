import type { IconType } from 'react-icons'
import {
  FiCalendar, FiAlertTriangle, FiUser, FiShoppingCart, FiRepeat, FiPower, FiTool,
} from 'react-icons/fi'
import { TbSparkles, TbRoute } from 'react-icons/tb'
import { toast } from '@/components/ui/sonner'
import { useCopilotData } from '@/features/inventory/hooks/useInventory'
import { inr, inrShort, runAutoReorder } from '@/features/inventory/inventory.service'

// 9 stacked Q&A cards in a fixed order; every answer is computed fresh on
// each render from the shared units/items/transfers/vendors/priceHistory stores.

interface CopilotTabProps {
  onNavigateTab: (tab: string) => void
  /** Card 3 ("Which camp is at risk?") also presets the Dashboards sub-view
   * to 'readiness' before switching, so the user lands there directly. */
  onOpenReadiness: () => void
}

function CopilotBanner() {
  return (
    <div
      className="fade-in flex items-center gap-4 border overflow-hidden"
      style={{
        position: 'relative',
        borderRadius: 20,
        padding: '16px 20px',
        marginBottom: 14,
        background: 'linear-gradient(120deg, rgba(123,224,212,.18), rgba(91,140,255,.18) 50%, rgba(139,92,246,.18))',
        borderColor: 'var(--qms-border-strong)',
      }}
    >
      <div
        className="shrink-0 text-white"
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: 'linear-gradient(135deg, var(--qms-violet, #8b5cf6), var(--qms-brand))',
          display: 'grid',
          placeItems: 'center',
          boxShadow: '0 10px 24px -8px rgba(139,92,246,.6)',
        }}
      >
        <TbSparkles size={18} />
      </div>
      <div className="flex-1" style={{ color: 'var(--qms-text)' }}>
        <b style={{ fontWeight: 700 }}>Inventory Copilot</b> — answers computed live from your inventory, camps, field stock and procurement.
      </div>
    </div>
  )
}

function InQ({ icon: Icon, question, children }: { icon: IconType; question: string; children: React.ReactNode }) {
  return (
    <div
      className="border"
      style={{ borderRadius: 12, padding: '12px 14px', marginBottom: 10, background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
    >
      <div className="flex items-center" style={{ gap: 7, marginBottom: 6, fontSize: 12.5, fontWeight: 800, color: 'var(--qms-text)' }}>
        <Icon style={{ width: 14, height: 14, color: 'var(--qms-brand-600, var(--qms-brand))' }} />
        {question}
      </div>
      <div className="in-q-aa" style={{ fontSize: 12.5, color: 'var(--qms-text)' }}>
        {children}
      </div>
    </div>
  )
}

function Emph({ children }: { children: React.ReactNode }) {
  return <b style={{ color: 'var(--qms-brand-700, #1d40c4)' }}>{children}</b>
}

function CopilotLink({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline"
      style={{ color: 'var(--qms-brand-600, var(--qms-brand))', textDecoration: 'none', cursor: 'pointer', font: 'inherit', background: 'none', border: 0, padding: 0 }}
    >
      {children}
    </button>
  )
}

const CopilotTab = ({ onNavigateTab, onOpenReadiness }: CopilotTabProps) => {
  const { data, isLoading } = useCopilotData()

  const handleAutoReorder = () => {
    const result = runAutoReorder()
    if (result.ok) {
      toast.success('Auto-reorder PRs raised — see Procurement')
    } else {
      toast.error('Procurement module not loaded')
    }
  }

  if (isLoading || !data) {
    return (
      <div>
        <CopilotBanner />
        <div className="text-center rounded-[14px]" style={{ padding: 48, fontSize: 12, color: 'var(--qms-text-muted)', border: '1.5px dashed var(--qms-border-strong)' }}>
          Loading insights…
        </div>
      </div>
    )
  }

  const { expiring, foExcess, campsAtRisk, cheapest, shortages30, balancing, idle, calib, forecast180, procureVal180 } = data

  return (
    <div>
      <CopilotBanner />

      {/* 1 — Which items are expiring? */}
      <InQ icon={FiCalendar} question="Which items are expiring?">
        {expiring.length === 0 ? (
          'Nothing expiring within 90 days.'
        ) : (
          <>
            <Emph>{expiring.length}</Emph> SKUs within 90 days. Soonest:{' '}
            {expiring.slice(0, 3).map((x) => `${x.it.name} (${x.band.days}d)`).join(', ')}.{' '}
            <CopilotLink onClick={() => onNavigateTab('expiry')}>Open FEFO →</CopilotLink>
          </>
        )}
      </InQ>

      {/* 2 — Which FO has excess stock? */}
      <InQ icon={TbRoute} question="Which FO has excess stock?">
        {!foExcess ? (
          'No FO holdings yet.'
        ) : (
          <>
            <Emph>{foExcess.fo.name}</Emph> holds the most — <Emph>{inrShort(foExcess.holdings.totalValue)}</Emph> across{' '}
            {foExcess.holdings.consumables.length || 0} SKUs. Consider rebalancing.{' '}
            <CopilotLink onClick={() => onNavigateTab('foinventory')}>FO inventory →</CopilotLink>
          </>
        )}
      </InQ>

      {/* 3 — Which camp is at risk? */}
      <InQ icon={FiAlertTriangle} question="Which camp is at risk?">
        {campsAtRisk.length === 0 ? (
          'All upcoming camps ≥ 70% ready.'
        ) : (
          <>
            <Emph>{campsAtRisk.length}</Emph> upcoming camps below 70% readiness. Worst:{' '}
            {campsAtRisk.slice(0, 3).map((x) => `${x.c.id} (${x.r.score}%)`).join(', ')}.{' '}
            <CopilotLink onClick={onOpenReadiness}>Readiness →</CopilotLink>
          </>
        )}
      </InQ>

      {/* 4 — Which vendor is cheapest? */}
      <InQ icon={FiUser} question="Which vendor is cheapest?">
        {!cheapest ? (
          'No price history.'
        ) : (
          <>
            <Emph>{cheapest.vendor}</Emph> has the lowest average landed cost ({inr(cheapest.avg)} avg across {cheapest.n} items).
          </>
        )}
      </InQ>

      {/* 5 — What should be procured? */}
      <InQ icon={FiShoppingCart} question="What should be procured?">
        {shortages30.length === 0 ? (
          'No 30-day shortages.'
        ) : (
          <>
            <Emph>{shortages30.length}</Emph> SKUs short within 30 days — top:{' '}
            {shortages30.slice(0, 3).map((r) => `${r.it.name} (${r.shortage})`).join(', ')}.{' '}
            <CopilotLink onClick={handleAutoReorder}>Auto-reorder →</CopilotLink>
          </>
        )}
      </InQ>

      {/* 6 — What can be transferred? */}
      <InQ icon={FiRepeat} question="What can be transferred?">
        {balancing.length === 0 ? (
          'No field surplus to rebalance.'
        ) : (
          <>
            {balancing.slice(0, 3).map((b, i) => (
              <span key={b.item.id}>
                {i > 0 ? '; ' : ''}Move <Emph>{b.qty}</Emph> {b.item.name} from {b.fromName}
              </span>
            ))}
            . <CopilotLink onClick={() => onNavigateTab('transfers')}>Transfers →</CopilotLink>
          </>
        )}
      </InQ>

      {/* 7 — Which assets are idle? */}
      <InQ icon={FiPower} question="Which assets are idle?">
        {idle.length === 0 ? (
          'Asset utilisation looks healthy.'
        ) : (
          <>
            <Emph>{idle.length}</Emph> device types underutilised:{' '}
            {idle.slice(0, 3).map((r) => `${r.it.name} (${r.pct}% deployed)`).join(', ')}.
          </>
        )}
      </InQ>

      {/* 8 — Which assets need calibration? */}
      <InQ icon={FiTool} question="Which assets need calibration?">
        {calib.length === 0 ? (
          'All calibrations current.'
        ) : (
          <>
            <Emph>{calib.length}</Emph> units due/overdue. <CopilotLink onClick={() => onNavigateTab('calibration')}>Calibration →</CopilotLink>
          </>
        )}
      </InQ>

      {/* 9 — What inventory is required next quarter? */}
      <InQ icon={FiCalendar} question="What inventory is required next quarter?">
        {forecast180.length === 0 ? (
          'No projected demand.'
        ) : (
          <>
            Over 180 days, projected procurement is <Emph>{inrShort(procureVal180)}</Emph> across{' '}
            {forecast180.filter((r) => r.procure > 0).length} SKUs.
          </>
        )}
      </InQ>
    </div>
  )
}

export default CopilotTab
