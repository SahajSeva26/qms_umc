import type { IconType } from 'react-icons'
import type { ReactNode } from 'react'
import { FiUpload, FiDownload, FiZap, FiCpu } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import KpiTile from '@/components/ui/KpiTile'
import { useInventoryOverviewKpis } from '@/features/inventory/real/hooks/useInventoryOverviewKpis'

export interface InventoryPageTab {
  view: string
  label: string
  icon: IconType
}

interface InventoryPageShellProps {
  children: ReactNode
  /** Only the tabs this viewer can actually see — the caller filters by its own permission checks. */
  tabs: InventoryPageTab[]
  activeView: string
  onViewChange: (view: string) => void
}

// Matches the prototype's inventory.html shell — one page, tabs switched via ?view=; the page (not this shell) gates access.
// The PAGE owns all query-string updates via onViewChange — this shell must never navigate on its own.
function InventoryPageShell({ children, tabs, activeView, onViewChange }: InventoryPageShellProps) {
  const { tiles, isLoading, hasError, canViewAny, refetch } = useInventoryOverviewKpis()

  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <div className="text-[12px] mb-1" style={{ color: 'var(--qms-text-muted)' }}>Operations · Inventory Management</div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>Inventory Management</h1>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {[
              { label: 'Fleet · live', live: true },
              { label: 'QR-tracked', icon: FiCpu },
              { label: 'Calibration alerts', icon: FiZap },
              { label: 'Consumables reorder', icon: FiDownload },
            ].map((chip) => (
              <span key={chip.label} className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
                {chip.live ? <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--success)' }} /> : chip.icon && <chip.icon size={11} />}
                {chip.label}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            disabled
            title="Not wired to anything real yet"
            className="flex items-center gap-1.5 text-[13px] font-semibold px-3 py-2 rounded-xl border transition-colors opacity-50 cursor-not-allowed"
            style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }}
          >
            <FiUpload size={13} /> Import
          </button>
          <button
            disabled
            title="Not wired to anything real yet"
            className="flex items-center gap-1.5 text-[13px] font-semibold px-3 py-2 rounded-xl border transition-colors opacity-50 cursor-not-allowed"
            style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }}
          >
            <FiDownload size={13} /> Export
          </button>
        </div>
      </div>

      <div
        className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 mb-4"
        style={{ background: 'linear-gradient(135deg, color-mix(in oklab, var(--qms-brand) 12%, transparent), color-mix(in oklab, var(--qms-teal) 12%, transparent))' }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}>
            <FiZap size={15} color="#fff" />
          </div>
          <div className="text-[13px]" style={{ color: 'var(--qms-text)' }}>
            <span className="font-bold">Inventory copilot: </span>Not wired to anything real yet.
          </div>
        </div>
        <Button variant="outline" size="sm" disabled title="Not wired to anything real yet">
          Run
        </Button>
      </div>

      {canViewAny && hasError && (
        <div className="flex items-center gap-2 mb-4 text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
          <span>Couldn't load some overview numbers.</span>
          <Button variant="outline" size="sm" onClick={refetch}>Retry</Button>
        </div>
      )}

      {canViewAny && !isLoading && !hasError && tiles.length > 0 && (
        <div className="grid gap-2.5 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
          {tiles.map((tile) => (
            <KpiTile key={tile.key} label={tile.label} value={String(tile.value)} tone={tile.tone} icon={tile.icon} />
          ))}
        </div>
      )}

      <div className="flex gap-1 mb-4 border-b overflow-x-auto hide-scrollbar" style={{ borderColor: 'var(--qms-border)' }}>
        {tabs.map((tab) => {
          const active = activeView === tab.view
          const Icon = tab.icon
          return (
            <button
              key={tab.view}
              onClick={() => onViewChange(tab.view)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-semibold border-b-2 -mb-px shrink-0 transition-colors"
              style={{
                color: active ? 'var(--qms-text)' : 'var(--qms-text-muted)',
                borderBottomColor: active ? 'var(--qms-brand)' : 'transparent',
              }}
            >
              <Icon size={13} /> {tab.label}
            </button>
          )
        })}
      </div>

      {children}
    </div>
  )
}

export default InventoryPageShell
