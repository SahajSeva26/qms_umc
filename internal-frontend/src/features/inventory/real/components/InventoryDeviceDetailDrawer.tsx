import { Fragment } from 'react'
import { FiCalendar, FiClock, FiCpu, FiEdit2, FiHash, FiInfo, FiPackage, FiTag, FiTool } from 'react-icons/fi'
import SideDrawer from '@/components/ui/SideDrawer'
import { CopyButton } from '@qms/ui'
import { Button } from '@/components/ui/button'
import { INVENTORY_DEVICE_STATUS_LABEL } from '@/types/inventoryDevice.types'
import type { InventoryDeviceEntity, InventoryDeviceStatus } from '@/types/inventoryDevice.types'
import { useInventoryMaster } from '@/features/inventory/real/hooks/useInventoryMaster'

const STATUS_STYLE: Record<InventoryDeviceStatus, { bg: string; fg: string }> = {
  available: { bg: 'var(--qms-surface-strong)', fg: 'var(--qms-text-soft)' },
  'in-transit': { bg: 'rgba(245,158,11,.15)', fg: '#d97706' },
  assigned: { bg: 'rgba(59,109,255,.14)', fg: 'var(--qms-brand-700, #2451f0)' },
  maintainance: { bg: 'rgba(245,158,11,.15)', fg: '#d97706' },
  lost: { bg: 'rgba(244,63,94,.15)', fg: '#e11d48' },
  damaged: { bg: 'rgba(244,63,94,.15)', fg: '#e11d48' },
}

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

interface InventoryDeviceDetailDrawerProps {
  device: InventoryDeviceEntity
  canManage: boolean
  canViewLedger: boolean
  onClose: () => void
  onEdit: () => void
  onViewHistory: () => void
}

// Matches the prototype's device drawer structurally, but ours is per PHYSICAL UNIT, not per catalog
// TYPE — no fleet rollup to show. Only real per-unit fields; no price (not on our model, see ui-revisions.md).
const InventoryDeviceDetailDrawer = ({ device, canManage, canViewLedger, onClose, onEdit, onViewHistory }: InventoryDeviceDetailDrawerProps) => {
  const sc = STATUS_STYLE[device.status]
  const masterQuery = useInventoryMaster(device.item.id)
  const master = masterQuery.data?.data

  return (
    <SideDrawer open title={device.item.name ?? device.item.id} onClose={onClose} widthClassName="max-w-[940px]">
      <div className="flex items-start gap-3.5 mb-5">
        <div
          className="w-15 h-15 rounded-2xl flex items-center justify-center shrink-0 text-white"
          style={{ background: 'linear-gradient(135deg, rgba(36,81,240,1), rgba(20,184,166,1))' }}
        >
          <FiCpu size={26} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[17px] font-bold leading-tight" style={{ color: 'var(--qms-text)' }}>{device.item.name ?? device.item.id}</div>
          <div className="text-[12px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
            Device{device.vendor?.name ? ` · ${device.vendor.name}` : ''}{device.item.sku || master?.sku ? ` · ${device.item.sku ?? master?.sku}` : ''}
          </div>
          <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-soft)' }}>
              <FiHash size={11} />
              <span className="font-mono">{device.serialNumber}</span>
              <CopyButton value={device.serialNumber} label="Serial number" />
            </span>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: sc.bg, color: sc.fg }}>
              {INVENTORY_DEVICE_STATUS_LABEL[device.status].toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
        <SummaryTile label="Status" value={INVENTORY_DEVICE_STATUS_LABEL[device.status]} icon={FiTag} />
        <SummaryTile label="Warranty" value={device.warrantyExpiryDate?.slice(0, 10) ?? '—'} icon={FiCalendar} />
        <SummaryTile label="Last calibration" value={device.lastCalibrationDate?.slice(0, 10) ?? '—'} icon={FiTool} />
        <SummaryTile label="Next calibration" value={device.nextCalibrationDate?.slice(0, 10) ?? '—'} icon={FiTool} />
      </div>

      {master?.description && (
        <SectionCard title="Description" icon={FiInfo} rows={[{ label: 'About', value: master.description }]} />
      )}

      <SectionCard
        title="Identity"
        icon={FiHash}
        rows={[
          { label: 'Serial number', value: device.serialNumber },
          { label: 'Item code', value: master?.code ?? device.item.code },
          { label: 'SKU', value: master?.sku ?? device.item.sku },
          { label: 'Unit', value: master?.unit ?? device.item.unit },
          { label: 'Vendor', value: device.vendor?.name },
          { label: 'Vendor code', value: device.vendor?.code },
        ]}
      />

      <SectionCard
        title="Lifecycle & calibration"
        icon={FiPackage}
        rows={[
          { label: 'Status', value: INVENTORY_DEVICE_STATUS_LABEL[device.status] },
          { label: 'Manufacturing date', value: device.manufacturingDate?.slice(0, 10) },
          { label: 'Warranty expiry', value: device.warrantyExpiryDate?.slice(0, 10) },
          { label: 'Last calibrated', value: device.lastCalibrationDate?.slice(0, 10) },
          { label: 'Next calibration', value: device.nextCalibrationDate?.slice(0, 10) },
        ]}
      />

      {masterQuery.isLoading && (
        <p className="text-[11px] mb-4" role="status" style={{ color: 'var(--qms-text-muted)' }}>Loading catalog details…</p>
      )}
      {masterQuery.error && (
        <div className="mb-4 flex items-center gap-2 text-[11px]" role="alert" style={{ color: 'var(--qms-danger)' }}>
          <span>Catalog details could not be loaded.</span>
          <button type="button" className="font-semibold underline" onClick={() => masterQuery.refetch()}>Try again</button>
        </div>
      )}

      <p className="text-[11px] mb-5" style={{ color: 'var(--qms-text-muted)' }}>
        Added {new Date(device.createdAt).toLocaleDateString()} · Updated {new Date(device.updatedAt).toLocaleDateString()}
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
}

const SummaryTile = ({ label, value, icon: Icon }: { label: string; value: string; icon: typeof FiInfo }) => (
  <div className="rounded-xl border p-3" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
    <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--qms-text-muted)' }}>
      <Icon size={11} style={{ color: 'var(--qms-brand)' }} /> {label}
    </div>
    <div className="text-[12px] font-extrabold truncate" style={{ color: 'var(--qms-text)' }} title={value}>{value}</div>
  </div>
)

export default InventoryDeviceDetailDrawer
