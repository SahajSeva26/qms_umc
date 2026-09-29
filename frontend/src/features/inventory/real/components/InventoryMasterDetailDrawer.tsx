import { Fragment } from 'react'
import { FiEdit2, FiInfo, FiHash } from 'react-icons/fi'
import SideDrawer from '@/components/ui/SideDrawer'
import CopyButton from '@/components/ui/CopyButton'
import { Button } from '@/components/ui/button'
import { INVENTORY_MASTER_TYPE_LABEL } from '@/types/inventoryMaster.types'
import type { InventoryMasterEntity } from '@/types/inventoryMaster.types'
import { INVENTORY_MASTER_TYPE_META } from '@/features/inventory/real/utils/inventoryMasterTypeMeta'

interface KvRow { label: string; value: string | number | undefined | null }

// Matches the prototype's drawer structure (inventory-masters.js openItem()) — only real catalog fields
// shown under one "Details" section; Commercial/Warranty/Batch fields live on Device/Consumable, not here (see ui-revisions.md).
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

interface InventoryMasterDetailDrawerProps {
  item: InventoryMasterEntity
  canManage: boolean
  onClose: () => void
  onEdit: () => void
}

const InventoryMasterDetailDrawer = ({ item, canManage, onClose, onEdit }: InventoryMasterDetailDrawerProps) => {
  const meta = INVENTORY_MASTER_TYPE_META[item.type]
  const Icon = meta.icon

  return (
    <SideDrawer open title={item.name} onClose={onClose} widthClassName="max-w-[940px]">
      <div className="flex items-start gap-3.5 mb-5">
        <div className="w-15 h-15 rounded-2xl flex items-center justify-center shrink-0 text-white" style={{ background: meta.color }}>
          <Icon size={26} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[17px] font-bold leading-tight" style={{ color: 'var(--qms-text)' }}>{item.name}</div>
          <div className="text-[12px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>{INVENTORY_MASTER_TYPE_LABEL[item.type]}</div>
          <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-soft)' }}>
              <FiHash size={11} />
              <span className="font-mono">{item.code}</span>
              <CopyButton value={item.code} label="Code" />
            </span>
            {item.status && (
              <span
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${item.status === 'active' ? 'bg-success-soft text-success' : ''}`}
                style={item.status !== 'active' ? { background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' } : undefined}
              >
                {item.status.toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </div>

      <SectionCard
        title="Details"
        icon={FiInfo}
        rows={[
          { label: 'Item code', value: item.code },
          { label: 'SKU', value: item.sku },
          { label: 'Unit', value: item.unit },
          { label: 'Min stock', value: item.minStock },
          { label: 'Description', value: item.description },
        ]}
      />

      <p className="text-[11px] mb-5" style={{ color: 'var(--qms-text-muted)' }}>
        Created {new Date(item.createdAt).toLocaleDateString()} · Updated {new Date(item.updatedAt).toLocaleDateString()}
      </p>

      <div className="flex gap-2">
        {canManage && (
          <Button onClick={onEdit} className="text-white" style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}>
            <FiEdit2 size={14} /> Edit
          </Button>
        )}
        <Button variant="secondary" onClick={onClose} className={canManage ? 'ml-auto' : ''}>Close</Button>
      </div>
    </SideDrawer>
  )
}

export default InventoryMasterDetailDrawer
