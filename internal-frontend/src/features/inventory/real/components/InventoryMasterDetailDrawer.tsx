import { Fragment } from 'react'
import { FiBox, FiEdit2, FiHash, FiInfo, FiLayers } from 'react-icons/fi'
import SideDrawer from '@/components/ui/SideDrawer'
import { CopyButton } from '@qms/ui'
import { Button } from '@/components/ui/button'
import { INVENTORY_MASTER_TYPE_LABEL } from '@/types/inventoryMaster.types'
import type { InventoryMasterEntity } from '@/types/inventoryMaster.types'
import { INVENTORY_MASTER_TYPE_META } from '@/features/inventory/real/utils/inventoryMasterTypeMeta'
import { useInventoryDevices } from '@/features/inventory/real/hooks/useInventoryDevices'
import { INVENTORY_DEVICE_STATUS_LABEL } from '@/types/inventoryDevice.types'
import { useInventoryConsumables } from '@/features/inventory/real/hooks/useInventoryConsumables'
import { INVENTORY_CONSUMABLE_STATUS_LABEL } from '@/types/inventoryConsumable.types'
import { remainingLabel } from '@/features/inventory/real/utils/expiryBand'

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
  const devicesQuery = useInventoryDevices(
    { item: item.id, page: '1', limit: '10' },
    item.type === 'device',
  )
  const deviceItems = devicesQuery.data?.data?.items ?? []
  const deviceCount = devicesQuery.data?.data?.count ?? 0
  const consumablesQuery = useInventoryConsumables(
    { item: item.id, page: '1', limit: '10' },
    item.type === 'consumable',
  )
  const consumableLots = consumablesQuery.data?.data?.items ?? []
  const consumableCount = consumablesQuery.data?.data?.count ?? 0

  return (
    <SideDrawer open title={item.name} onClose={onClose} widthClassName="max-w-[940px]">
      <div className="flex items-start gap-3.5 mb-5">
        <div className="w-15 h-15 rounded-2xl flex items-center justify-center shrink-0 text-white" style={{ background: meta.color }}>
          <Icon size={26} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[17px] font-bold leading-tight" style={{ color: 'var(--qms-text)' }}>{item.name}</div>
          <div className="text-[12px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
            {INVENTORY_MASTER_TYPE_LABEL[item.type]} · {item.sku} · {item.unit}
          </div>
          <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-soft)' }}>
              <FiHash size={11} />
              <span className="font-mono">{item.code}</span>
              <CopyButton value={item.code} label="Code" />
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-soft)' }}>
              <FiBox size={11} /> Reorder at {item.minStock} {item.unit}
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
        title="Identity"
        icon={FiHash}
        rows={[
          { label: 'Item code', value: item.code },
          { label: 'Category', value: INVENTORY_MASTER_TYPE_LABEL[item.type] },
          { label: 'SKU', value: item.sku },
          { label: 'Unit', value: item.unit },
          { label: 'Status', value: item.status ? (item.status === 'active' ? 'Active' : 'Inactive') : undefined },
        ]}
      />

      <SectionCard
        title="Description & stocking"
        icon={FiInfo}
        rows={[
          { label: 'Description', value: item.description },
          { label: 'Reorder level', value: `${item.minStock} ${item.unit}` },
          { label: 'Created', value: new Date(item.createdAt).toLocaleDateString() },
          { label: 'Updated', value: new Date(item.updatedAt).toLocaleDateString() },
        ]}
      />

      {item.type === 'device' && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-white" style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}>
              <FiLayers size={12} />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>
              Registered device units{!devicesQuery.isLoading && !devicesQuery.error ? ` (${deviceCount})` : ''}
            </p>
          </div>
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
            {devicesQuery.isLoading && (
              <p className="p-4 text-[12px]" role="status" style={{ color: 'var(--qms-text-muted)' }}>Loading registered units…</p>
            )}
            {devicesQuery.error && (
              <div className="p-4 flex items-center gap-2 text-[12px]" role="alert" style={{ color: 'var(--qms-danger)' }}>
                <span>Registered units could not be loaded.</span>
                <button type="button" className="font-semibold underline" onClick={() => devicesQuery.refetch()}>Try again</button>
              </div>
            )}
            {!devicesQuery.isLoading && !devicesQuery.error && deviceItems.length === 0 && (
              <p className="p-4 text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>No physical units are registered for this catalog item.</p>
            )}
            {!devicesQuery.isLoading && !devicesQuery.error && deviceItems.length > 0 && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--qms-border)', color: 'var(--qms-text-muted)' }}>
                        {['Serial', 'Vendor', 'Status', 'Warranty', 'Next calibration'].map((heading) => (
                          <th key={heading} className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-wide">{heading}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {deviceItems.map((device) => (
                        <tr key={device.id} style={{ borderBottom: '1px solid var(--qms-border)' }}>
                          <td className="px-3 py-2 font-mono font-semibold" style={{ color: 'var(--qms-text)' }}>{device.serialNumber}</td>
                          <td className="px-3 py-2" style={{ color: 'var(--qms-text-muted)' }}>{device.vendor?.name ?? '—'}</td>
                          <td className="px-3 py-2" style={{ color: 'var(--qms-text)' }}>{INVENTORY_DEVICE_STATUS_LABEL[device.status]}</td>
                          <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--qms-text-muted)' }}>{device.warrantyExpiryDate?.slice(0, 10) ?? '—'}</td>
                          <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--qms-text-muted)' }}>{device.nextCalibrationDate?.slice(0, 10) ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {deviceCount > deviceItems.length && (
                  <p className="px-3 py-2 text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>
                    Showing the first {deviceItems.length} of {deviceCount} registered units.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {item.type === 'consumable' && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-white" style={{ background: 'linear-gradient(135deg, var(--qms-teal), var(--qms-brand))' }}>
              <FiLayers size={12} />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>
              Stock lots{!consumablesQuery.isLoading && !consumablesQuery.error ? ` (${consumableCount})` : ''}
            </p>
          </div>
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
            {consumablesQuery.isLoading && (
              <p className="p-4 text-[12px]" role="status" style={{ color: 'var(--qms-text-muted)' }}>Loading stock lots…</p>
            )}
            {consumablesQuery.error && (
              <div className="p-4 flex items-center gap-2 text-[12px]" role="alert" style={{ color: 'var(--qms-danger)' }}>
                <span>Stock lots could not be loaded.</span>
                <button type="button" className="font-semibold underline" onClick={() => consumablesQuery.refetch()}>Try again</button>
              </div>
            )}
            {!consumablesQuery.isLoading && !consumablesQuery.error && consumableLots.length === 0 && (
              <p className="p-4 text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>No stock lots are registered for this catalog item.</p>
            )}
            {!consumablesQuery.isLoading && !consumablesQuery.error && consumableLots.length > 0 && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--qms-border)', color: 'var(--qms-text-muted)' }}>
                        {['Batch', 'Vendor', 'On hand', 'Mfg date', 'Expiry', 'Remaining', 'Status'].map((heading) => (
                          <th key={heading} className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-wide">{heading}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {consumableLots.map((lot) => (
                        <tr key={lot.id} style={{ borderBottom: '1px solid var(--qms-border)' }}>
                          <td className="px-3 py-2 font-mono font-semibold" style={{ color: 'var(--qms-text)' }}>{lot.batch}</td>
                          <td className="px-3 py-2" style={{ color: 'var(--qms-text-muted)' }}>{lot.vendor?.name ?? '—'}</td>
                          <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--qms-text)' }}>{lot.quantity} {item.unit}</td>
                          <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--qms-text-muted)' }}>{lot.manufacturingDate.slice(0, 10)}</td>
                          <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--qms-text-muted)' }}>{lot.expiryDate?.slice(0, 10) ?? '—'}</td>
                          <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--qms-text-muted)' }}>{remainingLabel(lot.expiryDate)}</td>
                          <td className="px-3 py-2" style={{ color: 'var(--qms-text)' }}>{lot.status ? INVENTORY_CONSUMABLE_STATUS_LABEL[lot.status] : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {consumableCount > consumableLots.length && (
                  <p className="px-3 py-2 text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>
                    Showing the first {consumableLots.length} of {consumableCount} stock lots.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}

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
