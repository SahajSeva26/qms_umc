import { usePermission } from '@/hooks/usePermission'
import { Button } from '@/components/ui/button'
import { useInventoryMasterReport } from '@/features/inventory/real/hooks/useInventoryMasterReport'
import { useInventoryDeviceReport } from '@/features/inventory/real/hooks/useInventoryDeviceReport'
import { useInventoryConsumableReport } from '@/features/inventory/real/hooks/useInventoryConsumableReport'
import { INVENTORY_DEVICE_STATUS_LABEL, INVENTORY_DEVICE_STATUSES } from '@/types/inventoryDevice.types'
import { INVENTORY_CONSUMABLE_STATUS_LABEL } from '@/types/inventoryConsumable.types'
import { INVENTORY_MASTER_TYPE_LABEL, INVENTORY_MASTER_TYPES } from '@/types/inventoryMaster.types'

const BAR_COLORS = ['#3b6dff', '#14b8a6', '#8b5cf6', '#f59e0b', '#ec4899', '#0ea5e9', '#10b981', '#f43f5e']

interface Bar { label: string; value: number; color: string }

// The prototype charts fleet-by-device-TYPE, which our 2-value type field can't reproduce (see ui-revisions.md).
// Shows the real breakdowns we DO have instead: catalog/device/consumable counts, as bars not tiles.
const BarRow = ({ bar, max }: { bar: Bar; max: number }) => (
  <div className="grid items-center gap-2 py-1" style={{ gridTemplateColumns: '140px 1fr 44px' }}>
    <div className="text-[12px] truncate" style={{ color: 'var(--qms-text)' }} title={bar.label}>{bar.label}</div>
    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--qms-surface-strong)' }}>
      <div className="h-full rounded-full" style={{ width: `${max ? (bar.value / max) * 100 : 0}%`, background: bar.color }} />
    </div>
    <div className="text-[12px] font-bold text-right" style={{ color: 'var(--qms-text)' }}>{bar.value}</div>
  </div>
)

const Card = ({ title, bars, emptyLabel }: { title: string; bars: Bar[]; emptyLabel: string }) => {
  const max = Math.max(...bars.map((b) => b.value), 1)
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
      <p className="text-[11px] font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--qms-text-muted)' }}>{title}</p>
      {bars.every((b) => b.value === 0) ? (
        <p className="text-[12px] py-4 text-center" style={{ color: 'var(--qms-text-muted)' }}>{emptyLabel}</p>
      ) : (
        bars.map((bar) => <BarRow key={bar.label} bar={bar} max={max} />)
      )}
    </div>
  )
}

const InventoryOverviewPanel = () => {
  const { hasAnyPermission } = usePermission()
  const canViewMasters = hasAnyPermission(['inventory-master:manage'])
  const canViewDevices = hasAnyPermission(['inventory-device:manage'])
  const canViewConsumables = hasAnyPermission(['inventory-consumable:manage'])

  const { report: masterReport, isLoading: mLoading, error: mError, refetch: refetchMaster } = useInventoryMasterReport(canViewMasters)
  const { report: deviceReport, isLoading: dLoading, error: dError, refetch: refetchDevice } = useInventoryDeviceReport(canViewDevices)
  const { report: consumableReport, isLoading: cLoading, error: cError, refetch: refetchConsumable } = useInventoryConsumableReport(canViewConsumables)

  const isLoading = (canViewMasters && mLoading) || (canViewDevices && dLoading) || (canViewConsumables && cLoading)
  const hasError = !!((canViewMasters && mError) || (canViewDevices && dError) || (canViewConsumables && cError))
  const retry = () => {
    if (canViewMasters) refetchMaster()
    if (canViewDevices) refetchDevice()
    if (canViewConsumables) refetchConsumable()
  }
  const canViewAny = canViewMasters || canViewDevices || canViewConsumables

  if (!canViewAny) {
    return (
      <div className="px-4 py-10 text-center text-[13px] rounded-xl border" style={{ color: 'var(--qms-text-muted)', borderColor: 'var(--qms-border)' }}>
        You don't have permission to view this overview.
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-4 h-40 animate-pulse" style={{ background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)' }} />
        ))}
      </div>
    )
  }

  // A fetch failure must never render as "0 devices" / "0 lots" — that's
  // indistinguishable from a genuinely empty organisation.
  if (hasError) {
    return (
      <div className="px-4 py-10 text-center text-[13px] rounded-xl border" style={{ color: 'var(--qms-text-muted)', borderColor: 'var(--qms-border)' }}>
        <p className="mb-3">Couldn't load the overview.</p>
        <Button variant="outline" size="sm" onClick={retry}>Retry</Button>
      </div>
    )
  }

  const catalogByType = new Map(masterReport?.catalog.byType.map((t) => [t.type, t.count]) ?? [])
  const catalogBars: Bar[] = INVENTORY_MASTER_TYPES.map((t, i) => ({
    label: INVENTORY_MASTER_TYPE_LABEL[t],
    value: catalogByType.get(t) ?? 0,
    color: BAR_COLORS[i % BAR_COLORS.length],
  }))

  const deviceByStatus = new Map(deviceReport?.devices.byStatus.map((s) => [s.status, s.count]) ?? [])
  const deviceBars: Bar[] = INVENTORY_DEVICE_STATUSES.map((s, i) => ({
    label: INVENTORY_DEVICE_STATUS_LABEL[s],
    value: deviceByStatus.get(s) ?? 0,
    color: BAR_COLORS[i % BAR_COLORS.length],
  }))

  const consumableByStatus = new Map(consumableReport?.consumables.byStatus.map((s) => [s.status, s.count]) ?? [])
  const consumableBars: Bar[] = [
    { label: INVENTORY_CONSUMABLE_STATUS_LABEL.active, value: consumableByStatus.get('active') ?? 0, color: BAR_COLORS[0] },
    { label: INVENTORY_CONSUMABLE_STATUS_LABEL.expired, value: consumableByStatus.get('expired') ?? 0, color: BAR_COLORS[7] },
  ]

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
      {canViewMasters && <Card title="Catalog by type" bars={catalogBars} emptyLabel="No catalog items yet." />}
      {canViewDevices && <Card title="Devices by status" bars={deviceBars} emptyLabel="No devices yet." />}
      {canViewConsumables && <Card title="Consumable lots by status" bars={consumableBars} emptyLabel="No consumable lots yet." />}
    </div>
  )
}

export default InventoryOverviewPanel
