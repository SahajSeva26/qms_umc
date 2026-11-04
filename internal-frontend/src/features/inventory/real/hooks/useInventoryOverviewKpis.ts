import { useMemo } from 'react'
import { usePermission } from '@/hooks/usePermission'
import { useInventoryMasterReport } from '@/features/inventory/real/hooks/useInventoryMasterReport'
import { useInventoryDeviceReport } from '@/features/inventory/real/hooks/useInventoryDeviceReport'
import { useInventoryConsumableReport } from '@/features/inventory/real/hooks/useInventoryConsumableReport'
import { useInventoryAssignmentReport } from '@/features/inventory/real/hooks/useInventoryAssignmentReport'
import { useInventoryRequestReport } from '@/features/inventory/real/hooks/useInventoryRequestReport'
import type { InventoryReportTile } from '@/features/inventory/real/components/InventoryReportKpiStrip'
import { FiLayers, FiHardDrive, FiCheckCircle, FiTag, FiPackage, FiAlertCircle, FiUsers, FiClipboard } from 'react-icons/fi'

// Aggregates 5 report endpoints into one KPI row — a tile is skipped (not 0) when unauthorized/loading, and a
// real fetch failure is surfaced via `hasError` so callers show a retry state instead of fake zeros.
export function useInventoryOverviewKpis() {
  const { hasAnyPermission } = usePermission()
  const canViewMasters = hasAnyPermission(['inventory-master:manage'])
  const canViewDevices = hasAnyPermission(['inventory-device:manage'])
  const canViewConsumables = hasAnyPermission(['inventory-consumable:manage'])
  const canViewAssignments = hasAnyPermission(['inventory-assignment:manage'])
  const canViewRequests = hasAnyPermission(['inventory-request:manage'])

  const { report: masterReport, isLoading: mLoading, error: mError, refetch: refetchMaster } = useInventoryMasterReport(canViewMasters)
  const { report: deviceReport, isLoading: dLoading, error: dError, refetch: refetchDevice } = useInventoryDeviceReport(canViewDevices)
  const { report: consumableReport, isLoading: cLoading, error: cError, refetch: refetchConsumable } = useInventoryConsumableReport(canViewConsumables)
  const { report: assignmentReport, isLoading: aLoading, error: aError, refetch: refetchAssignment } = useInventoryAssignmentReport(canViewAssignments)
  const { report: requestReport, isLoading: rLoading, error: rError, refetch: refetchRequest } = useInventoryRequestReport(canViewRequests)

  const isLoading = (canViewMasters && mLoading) || (canViewDevices && dLoading) || (canViewConsumables && cLoading)
    || (canViewAssignments && aLoading) || (canViewRequests && rLoading)

  const hasError = !!((canViewMasters && mError) || (canViewDevices && dError) || (canViewConsumables && cError)
    || (canViewAssignments && aError) || (canViewRequests && rError))

  const tiles = useMemo<InventoryReportTile[]>(() => {
    const out: InventoryReportTile[] = []
    if (canViewMasters && masterReport) {
      out.push({ key: 'catalog', label: 'Catalog Items', value: masterReport.summary.catalogItems, tone: 'brand', icon: FiLayers })
    }
    if (canViewDevices && deviceReport) {
      const byStatus = new Map(deviceReport.devices.byStatus.map((s) => [s.status, s.count]))
      out.push({ key: 'devices', label: 'Total Devices', value: deviceReport.summary.totalDevices, tone: 'teal', icon: FiHardDrive })
      out.push({ key: 'devices-available', label: 'Available', value: byStatus.get('available') ?? 0, tone: 'emerald', icon: FiCheckCircle })
      out.push({ key: 'devices-assigned', label: 'Assigned', value: byStatus.get('assigned') ?? 0, tone: 'violet', icon: FiTag })
    }
    if (canViewConsumables && consumableReport) {
      out.push({ key: 'lots', label: 'Consumable Lots', value: consumableReport.summary.consumableLots, tone: 'brand', icon: FiPackage })
      out.push({ key: 'expired', label: 'Expired (by date)', value: consumableReport.consumables.expiredByDate, tone: 'rose', icon: FiAlertCircle })
    }
    if (canViewAssignments && assignmentReport) {
      out.push({ key: 'fos-holding', label: 'FOs Holding Inventory', value: assignmentReport.summary.fieldOfficersHoldingInventory, tone: 'amber', icon: FiUsers })
    }
    if (canViewRequests && requestReport) {
      out.push({ key: 'requests-pending', label: 'Pending Requests', value: requestReport.summary.pendingRequests, tone: 'amber', icon: FiClipboard })
    }
    return out
  }, [canViewMasters, masterReport, canViewDevices, deviceReport, canViewConsumables, consumableReport, canViewAssignments, assignmentReport, canViewRequests, requestReport])

  const canViewAny = canViewMasters || canViewDevices || canViewConsumables || canViewAssignments || canViewRequests

  const refetch = () => {
    if (canViewMasters) refetchMaster()
    if (canViewDevices) refetchDevice()
    if (canViewConsumables) refetchConsumable()
    if (canViewAssignments) refetchAssignment()
    if (canViewRequests) refetchRequest()
  }

  return { tiles, isLoading, hasError, canViewAny, refetch }
}
