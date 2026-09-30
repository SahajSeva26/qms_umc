import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FiLayout, FiBookOpen, FiCpu, FiPackage, FiCalendar, FiTool, FiUsers, FiUserCheck, FiClipboard, FiRepeat, FiTruck } from 'react-icons/fi'
import { usePermission } from '@/hooks/usePermission'
import InventoryPageShell, { type InventoryPageTab } from '@/features/inventory/real/components/InventoryPageShell'
import InventoryOverviewPanel from '@/features/inventory/real/components/InventoryOverviewPanel'
import InventoryMasterTab from '@/features/inventory/real/components/InventoryMasterTab'
import InventoryDevicesPanel from '@/features/inventory/real/components/InventoryDevicesPanel'
import InventoryConsumablesPanel from '@/features/inventory/real/components/InventoryConsumablesPanel'
import InventoryExpiryPanel from '@/features/inventory/real/components/InventoryExpiryPanel'
import InventoryCalibrationPanel from '@/features/inventory/real/components/InventoryCalibrationPanel'
import InventoryAssignmentsPanel from '@/features/inventory/real/components/InventoryAssignmentsPanel'
import InventoryFoInventoryPanel from '@/features/inventory/real/components/InventoryFoInventoryPanel'
import InventoryRequestsPanel from '@/features/inventory/real/components/InventoryRequestsPanel'
import InventoryLedgerPanel from '@/features/inventory/real/components/InventoryLedgerPanel'
import InventoryVendorsPanel from '@/features/inventory/real/components/InventoryVendorsPanel'

type InventoryView = 'overview' | 'masters' | 'devices' | 'consumables' | 'expiry' | 'calibration' | 'assignments' | 'foinventory' | 'requests' | 'movements' | 'vendors'

// One page, one route matching the prototype's flat page-tabs shell — this page gates restricted tabs
// before mounting them (individual panels, e.g. InventoryFoInventoryPanel, have no local permission gate).
const InventoryManagementPage = () => {
  const { hasAnyPermission } = usePermission()
  const [searchParams, setSearchParams] = useSearchParams()

  const canViewVendors = hasAnyPermission(['vendor-master:search', 'vendor-master:manage'])
  const canViewAssignments = hasAnyPermission(['inventory-assignment:manage'])
  // :create is independent of :search/:manage — a create-only requester (e.g. an FO) must still see the tab.
  const canViewRequests = hasAnyPermission(['inventory-request:search', 'inventory-request:manage', 'inventory-request:create'])
  const canViewMovements = hasAnyPermission(['inventory-ledger:manage'])

  const tabs = useMemo<InventoryPageTab[]>(() => [
    { view: 'overview', label: 'Overview', icon: FiLayout },
    { view: 'masters', label: 'Item Master', icon: FiBookOpen },
    { view: 'devices', label: 'Devices', icon: FiCpu },
    { view: 'consumables', label: 'Consumables', icon: FiPackage },
    { view: 'expiry', label: 'Expiry / FEFO', icon: FiCalendar },
    { view: 'calibration', label: 'Calibration', icon: FiTool },
    ...(canViewAssignments ? [{ view: 'assignments' as const, label: 'Assignments', icon: FiUsers }] : []),
    ...(canViewAssignments ? [{ view: 'foinventory' as const, label: 'FO Inventory', icon: FiUserCheck }] : []),
    ...(canViewRequests ? [{ view: 'requests' as const, label: 'Requests', icon: FiClipboard }] : []),
    ...(canViewMovements ? [{ view: 'movements' as const, label: 'Movements', icon: FiRepeat }] : []),
    ...(canViewVendors ? [{ view: 'vendors' as const, label: 'Vendor Master', icon: FiTruck }] : []),
  ], [canViewAssignments, canViewRequests, canViewMovements, canViewVendors])

  const requestedView = searchParams.get('view') as InventoryView | null
  const view: InventoryView = requestedView && tabs.some((t) => t.view === requestedView) ? requestedView : 'overview'

  const setView = (next: string) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev)
      params.set('view', next)
      return params
    }, { replace: true })
  }

  return (
    <InventoryPageShell tabs={tabs} activeView={view} onViewChange={setView}>
      {view === 'overview' && <InventoryOverviewPanel />}
      {view === 'masters' && <InventoryMasterTab />}
      {view === 'devices' && <InventoryDevicesPanel />}
      {view === 'consumables' && <InventoryConsumablesPanel />}
      {view === 'expiry' && <InventoryExpiryPanel />}
      {view === 'calibration' && <InventoryCalibrationPanel />}
      {view === 'assignments' && canViewAssignments && <InventoryAssignmentsPanel />}
      {view === 'foinventory' && canViewAssignments && <InventoryFoInventoryPanel />}
      {view === 'requests' && canViewRequests && <InventoryRequestsPanel />}
      {view === 'movements' && canViewMovements && <InventoryLedgerPanel />}
      {view === 'vendors' && canViewVendors && <InventoryVendorsPanel />}
    </InventoryPageShell>
  )
}

export default InventoryManagementPage
