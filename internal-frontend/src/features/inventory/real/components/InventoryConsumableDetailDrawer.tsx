import { Fragment } from 'react'
import { FiEdit2, FiInfo, FiHash, FiPackage, FiClock } from 'react-icons/fi'
import SideDrawer from '@/components/ui/SideDrawer'
import CopyButton from '@/components/ui/CopyButton'
import { Button } from '@/components/ui/button'
import ExpiryBandPill from '@/features/inventory/real/components/ExpiryBandPill'
import type { InventoryConsumableEntity } from '@/types/inventoryConsumable.types'

interface KvRow { label: string; value: string | number | undefined | null }

const SectionCard = ({ title, icon: Icon, rows }: { title: string; icon: typeof FiInfo; rows: KvRow[] }) => {
  const visible = rows.filter((r) => r.value !== undefined && r.value !== null && r.value !== '')
  if (visible.length === 0) return null
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-white" style={{ background: 'var(--qms-brand)' }}>
          <Icon size={12} />
        </div>
        <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{title}</p>
      </div>
      <div className="rounded-xl border p-3.5" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-[13px]">
          {visible.map((r) => (
            <Fragment key={r.label}>
              <div style={{ color: 'var(--qms-text-muted)' }}>{r.label}</div>
              <div style={{ color: 'var(--qms-text)' }}>{r.value}</div>
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}

interface InventoryConsumableDetailDrawerProps {
  lot: InventoryConsumableEntity
  canManage: boolean
  canViewLedger: boolean
  onClose: () => void
  onEdit: () => void
  onViewHistory: () => void
}

// Same drawer-first structure as Item Master/Devices/Vendor Master — only real lot fields shown
// (the prototype's Batch/Expiry/Storage section needs reorderLevel/storage we don't have, see ui-revisions.md).
const InventoryConsumableDetailDrawer = ({ lot, canManage, canViewLedger, onClose, onEdit, onViewHistory }: InventoryConsumableDetailDrawerProps) => (
  <SideDrawer open title={lot.item.name ?? lot.item.id} onClose={onClose} widthClassName="max-w-[940px]">
    <div className="flex items-start gap-3.5 mb-5">
      <div
        className="w-15 h-15 rounded-2xl flex items-center justify-center shrink-0 text-white"
        style={{ background: 'linear-gradient(135deg, rgba(20,184,166,1), rgba(36,81,240,1))' }}
      >
        <FiPackage size={26} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[17px] font-bold leading-tight" style={{ color: 'var(--qms-text)' }}>{lot.item.name ?? lot.item.id}</div>
        <div className="text-[12px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>Consumable lot{lot.vendor?.name ? ` · ${lot.vendor.name}` : ''}</div>
        <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-soft)' }}>
            <FiHash size={11} />
            <span className="font-mono">{lot.batch}</span>
            <CopyButton value={lot.batch} label="Batch number" />
          </span>
          <ExpiryBandPill expiryDate={lot.expiryDate} />
          {lot.status && (
            <span
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${lot.status === 'active' ? 'bg-success-soft text-success' : ''}`}
              style={lot.status !== 'active' ? { background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' } : undefined}
            >
              {lot.status.toUpperCase()}
            </span>
          )}
        </div>
      </div>
    </div>

    <SectionCard
      title="Details"
      icon={FiInfo}
      rows={[
        { label: 'Quantity', value: lot.quantity },
        { label: 'Vendor', value: lot.vendor?.name },
        { label: 'Manufacturing date', value: lot.manufacturingDate?.slice(0, 10) },
        { label: 'Expiry date', value: lot.expiryDate?.slice(0, 10) },
      ]}
    />

    <p className="text-[11px] mb-5" style={{ color: 'var(--qms-text-muted)' }}>
      Added {new Date(lot.createdAt).toLocaleDateString()} · Updated {new Date(lot.updatedAt).toLocaleDateString()}
    </p>

    <div className="flex gap-2">
      {canManage && (
        <Button onClick={onEdit} className="text-white" style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}>
          <FiEdit2 size={14} /> Edit
        </Button>
      )}
      {canViewLedger && (
        <Button variant="outline" onClick={onViewHistory}>
          <FiClock size={14} /> Movement history
        </Button>
      )}
      <Button variant="secondary" onClick={onClose} className="ml-auto">Close</Button>
    </div>
  </SideDrawer>
)

export default InventoryConsumableDetailDrawer
