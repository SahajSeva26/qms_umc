import type { InventoryMasterType } from '@/types/inventoryMaster.types'
import { INVENTORY_MASTER_TYPE_LABEL, INVENTORY_MASTER_TYPES } from '@/types/inventoryMaster.types'
import { INVENTORY_MASTER_TYPE_META } from '@/features/inventory/real/utils/inventoryMasterTypeMeta'

interface InventoryMasterTypeStripProps {
  // undefined = viewer lacks inventory-master:manage, the count itself isn't
  // available (same gate as InventoryReportKpiStrip) — shown as "—", not 0.
  counts: Record<InventoryMasterType, number> | undefined
  activeType: InventoryMasterType | 'ALL'
  onSelectType: (type: InventoryMasterType | 'ALL') => void
}

// Same visual structure as KpiTile, but clickable (doubles as the type filter). Bare buttons, no wrapping
// grid — the caller passes this as InventoryReportKpiStrip's `extraTiles`.
const InventoryMasterTypeStrip = ({ counts, activeType, onSelectType }: InventoryMasterTypeStripProps) => (
  <>
    {INVENTORY_MASTER_TYPES.map((type) => {
      const meta = INVENTORY_MASTER_TYPE_META[type]
      const active = activeType === type
      const Icon = meta.icon
      return (
        <button
          key={type}
          onClick={() => onSelectType(active ? 'ALL' : type)}
          className="relative rounded-xl border p-3.5 overflow-hidden text-left transition-transform hover:-translate-y-0.5"
          style={{
            background: 'var(--qms-surface)',
            borderColor: active ? 'var(--qms-brand)' : 'var(--qms-border)',
            boxShadow: active ? 'inset 0 0 0 1px var(--qms-brand)' : undefined,
            backdropFilter: 'blur(20px) saturate(140%)',
          }}
        >
          <div
            className="absolute rounded-full pointer-events-none"
            style={{ right: -30, top: -30, width: 140, height: 140, opacity: 0.18, filter: 'blur(30px)', background: meta.color }}
          />
          <div className="relative flex items-center gap-2 mb-1.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, rgba(36,81,240,.16), rgba(20,184,166,.16))', border: '1px solid var(--qms-border-strong)', color: 'var(--qms-brand)' }}
            >
              <Icon size={14} />
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-wide truncate" style={{ color: 'var(--qms-text-muted)' }}>
              {INVENTORY_MASTER_TYPE_LABEL[type]}
            </div>
          </div>
          <div className="relative text-[22px] font-extrabold leading-tight" style={{ color: 'var(--qms-text)', letterSpacing: '-0.02em' }}>
            {counts ? counts[type] ?? 0 : '—'}
          </div>
        </button>
      )
    })}
  </>
)

export default InventoryMasterTypeStrip
