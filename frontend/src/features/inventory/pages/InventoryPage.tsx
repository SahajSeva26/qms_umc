import { useState } from 'react'
import {
  LayoutDashboard, Gauge, Library, CalendarClock, Cpu, Wrench, Warehouse as WarehouseIcon,
  Truck, Route, UsersRound, ClipboardList, Package, Contact, ShoppingCart, LineChart,
  Sparkles, History, ArrowRightLeft, Dot, QrCode, PackageCheck,
} from 'lucide-react'
import { FiUpload, FiDownload } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'
import InventoryKpiStrip from '@/features/inventory/components/InventoryKpiStrip'
import OverviewTab from '@/features/inventory/components/OverviewTab'
import DashboardsTab from '@/features/inventory/components/DashboardsTab'
import InventoryMasterTab from '@/features/inventory/components/InventoryMasterTab'
import ExpiryFEFOTab from '@/features/inventory/components/ExpiryFEFOTab'
import DevicesTab from '@/features/inventory/components/DevicesTab'
import CalibrationTab from '@/features/inventory/components/CalibrationTab'
import WarehouseTab from '@/features/inventory/components/WarehouseTab'
import TransfersTab from '@/features/inventory/components/TransfersTab'
import VendorsTab from '@/features/inventory/components/VendorsTab'
import ConsumablesTab from '@/features/inventory/components/ConsumablesTab'
import MovementsTab from '@/features/inventory/components/MovementsTab'
import AssignmentsTab from '@/features/inventory/components/AssignmentsTab'
import FOInventoryTab from '@/features/inventory/components/FOInventoryTab'
import ForecastTab from '@/features/inventory/components/ForecastTab'
import FieldOpsTab from '@/features/inventory/components/FieldOpsTab'
import ProcurementTab from '@/features/inventory/components/ProcurementTab'
import AuditTab from '@/features/inventory/components/AuditTab'
import CopilotTab from '@/features/inventory/components/CopilotTab'
import LogMovementModal from '@/features/inventory/components/LogMovementModal'
import { useDeviceFleetUnits } from '@/features/inventory/hooks/useInventory'
import type { DashboardSubView } from '@/features/inventory/inventory.types'

type InventoryTabId =
  | 'overview' | 'dashboards' | 'masters' | 'expiry' | 'devices' | 'calibration'
  | 'warehouse' | 'transfers' | 'assignments' | 'foinventory' | 'fieldops'
  | 'consumables' | 'vendors' | 'procurement' | 'forecast' | 'copilot' | 'audit' | 'movements'

const TABS: { id: InventoryTabId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'dashboards', label: 'Dashboards', icon: Gauge },
  { id: 'masters', label: 'Item Master', icon: Library },
  { id: 'expiry', label: 'Expiry / FEFO', icon: CalendarClock },
  { id: 'devices', label: 'Devices', icon: Cpu },
  { id: 'calibration', label: 'Calibration', icon: Wrench },
  { id: 'warehouse', label: 'Warehouse', icon: WarehouseIcon },
  { id: 'transfers', label: 'Transfers', icon: Truck },
  { id: 'assignments', label: 'Assignments', icon: Route },
  { id: 'foinventory', label: 'FO Inventory', icon: UsersRound },
  { id: 'fieldops', label: 'Field Ops', icon: ClipboardList },
  { id: 'consumables', label: 'Consumables', icon: Package },
  { id: 'vendors', label: 'Vendors', icon: Contact },
  { id: 'procurement', label: 'Procurement', icon: ShoppingCart },
  { id: 'forecast', label: 'Forecast', icon: LineChart },
  { id: 'copilot', label: 'Copilot', icon: Sparkles },
  { id: 'audit', label: 'Audit', icon: History },
  { id: 'movements', label: 'Movements', icon: ArrowRightLeft },
]

// Every tab is built; kept as a set (not just "always true") so a future
// still-unbuilt tab can drop out of it and fall through to ComingSoonTab.
const BUILT_TABS = new Set<InventoryTabId>(['overview', 'dashboards', 'masters', 'expiry', 'devices', 'calibration', 'warehouse', 'transfers', 'assignments', 'foinventory', 'fieldops', 'vendors', 'consumables', 'procurement', 'movements', 'forecast', 'copilot', 'audit'])

function ComingSoonTab({ label }: { label: string }) {
  return (
    <div
      className="text-center rounded-[14px]"
      style={{ padding: 48, fontSize: 12, color: 'var(--qms-text-muted)', border: '1.5px dashed var(--qms-border-strong)', background: 'rgba(36,81,240,.03)' }}
    >
      {label} — coming soon.
    </div>
  )
}

// Every tab is still mock/localStorage-backed (useInventory.ts) except
// "masters" (InventoryMasterTab.tsx), which is wired to the real backend —
// the other tabs get their own migration once their backend modules exist.
const InventoryPage = () => {
  const [tab, setTab] = useState<InventoryTabId>('overview')
  // Lifted (not owned by DashboardsTab) so Copilot's "Readiness →" card can
  // jump straight to the Readiness sub-view in one click.
  const [dashSub, setDashSub] = useState<DashboardSubView>('exec')

  // Despite the label, "New transfer" opens the same "Log inventory movement"
  // modal as the Movements tab — not a separate Transfer modal.
  const [logMovementOpen, setLogMovementOpen] = useState(false)
  const { units } = useDeviceFleetUnits()

  const activeLabel = TABS.find((t) => t.id === tab)?.label ?? ''

  const navigateTab = (t: string) => setTab(t as InventoryTabId)

  const renderTab = () => {
    switch (tab) {
      case 'overview': return <OverviewTab />
      case 'dashboards': return <DashboardsTab onNavigateTab={navigateTab} sub={dashSub} onSubChange={setDashSub} />
      case 'masters': return <InventoryMasterTab />
      case 'expiry': return <ExpiryFEFOTab />
      case 'devices': return <DevicesTab />
      case 'calibration': return <CalibrationTab />
      case 'warehouse': return <WarehouseTab />
      case 'transfers': return <TransfersTab />
      case 'assignments': return <AssignmentsTab />
      case 'foinventory': return <FOInventoryTab />
      case 'vendors': return <VendorsTab />
      case 'consumables': return <ConsumablesTab />
      case 'movements': return <MovementsTab />
      case 'forecast': return <ForecastTab />
      case 'fieldops': return <FieldOpsTab />
      case 'procurement': return <ProcurementTab />
      case 'copilot': return (
        <CopilotTab
          onNavigateTab={navigateTab}
          onOpenReadiness={() => { setDashSub('readiness'); setTab('dashboards') }}
        />
      )
      case 'audit': return <AuditTab />
      default: return <ComingSoonTab label={activeLabel} />
    }
  }

  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-3 mb-3.5 flex-wrap">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--qms-text-muted)' }}>
            Operations · Inventory &amp; Devices
          </p>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>Inventory &amp; Devices</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2.5 py-1" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-soft)' }}>
              <Dot size={14} style={{ color: 'var(--qms-emerald, #10b981)' }} /> Fleet · live
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2.5 py-1" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-soft)' }}>
              <QrCode size={12} /> QR-tracked
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2.5 py-1" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-soft)' }}>
              <Wrench size={12} /> Calibration alerts
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2.5 py-1" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-soft)' }}>
              <PackageCheck size={12} /> Consumables reorder
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" onClick={() => toast.info('Import — wiring comes next pass')}><FiUpload size={14} /> Import</Button>
          <Button variant="ghost" onClick={() => toast.info('Export — wiring comes next pass')}><FiDownload size={14} /> Export</Button>
          <Button
            className="text-white"
            style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
            onClick={() => setLogMovementOpen(true)}
          >
            <ArrowRightLeft size={14} /> New transfer
          </Button>
        </div>
      </div>

      <InventoryKpiStrip onNavigateTab={(t) => setTab(t as InventoryTabId)} />

      <div className="flex gap-1 mb-4 border-b overflow-x-auto" style={{ borderColor: 'var(--qms-border)' }}>
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-3 py-2.5 text-[12.5px] font-semibold border-b-2 transition-colors whitespace-nowrap"
              style={{
                color: tab === t.id ? 'var(--qms-text)' : 'var(--qms-text-muted)',
                borderBottomColor: tab === t.id ? 'var(--qms-brand)' : 'transparent',
              }}
            >
              <Icon size={13} /> {t.label}
              {!BUILT_TABS.has(t.id) && (
                <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-soft)' }}>soon</span>
              )}
            </button>
          )
        })}
      </div>

      {renderTab()}

      <LogMovementModal open={logMovementOpen} onClose={() => setLogMovementOpen(false)} units={units} />
    </div>
  )
}

export default InventoryPage
