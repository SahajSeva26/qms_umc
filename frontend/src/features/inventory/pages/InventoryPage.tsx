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
import ItemMasterTab from '@/features/inventory/components/ItemMasterTab'
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

// All 17 prototype tab ids, in the prototype's own order (pages/inventory.html's
// data-inv-tab buttons) — only 4 are built so far (2026-08-03 batch 1); the
// rest render a plain "coming soon" placeholder until later batches land.
// Adding a newly-built tab is a 2-line change: import its component and add
// its case to renderTab() below — no other structural change needed.
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

// Tabs with a real built component so far — everything else falls through
// to the placeholder in renderTab().
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

// Inventory & Devices — exact port of pages/inventory.html's shell (page-head,
// chip row, KPI grid + AI banner shared above every tab, 17-tab strip).
// Mock/frontend-only, same convention as features/reminders and features/hq
// — no real backend module exists yet; when it lands this page's data hooks
// (useInventory.ts) get swapped for real API calls, the same one-module-at-a-
// time migration path already used for Camps/Doctor/GeoProfile/Lead/Division/
// Project in earlier sessions. Built incrementally in batches due to session
// quota limits — see md-files/PROGRESS.md's 2026-08-04 entry for the full
// build log and remaining-tabs list.
const InventoryPage = () => {
  const [tab, setTab] = useState<InventoryTabId>('overview')
  // Dashboards' segmented sub-view — lifted up (rather than left as
  // DashboardsTab's own internal-only state) solely so Copilot's "Readiness
  // →" card can chain window.QMS_InvIntel.setDash('readiness') +
  // window.invSetTab('dashboards') into one click, landing the user directly
  // on the Readiness dashboard. Every other route into Dashboards (tab-strip
  // click, other KPI tiles) leaves this untouched and DashboardsTab falls
  // back to its own local state whenever these aren't threaded in.
  const [dashSub, setDashSub] = useState<DashboardSubView>('exec')

  // Page-head "New transfer" button — despite the label, the prototype wires
  // this to window.invNewMovement() (pages/inventory.html:32), the SAME "Log
  // inventory movement" modal as the Movements tab's own button, not the
  // Transfer modal owned by Warehouse/Transfers. Reused here via
  // LogMovementModal.tsx rather than duplicated.
  const [logMovementOpen, setLogMovementOpen] = useState(false)
  const { units } = useDeviceFleetUnits()

  const activeLabel = TABS.find((t) => t.id === tab)?.label ?? ''

  const navigateTab = (t: string) => setTab(t as InventoryTabId)

  const renderTab = () => {
    switch (tab) {
      case 'overview': return <OverviewTab />
      case 'dashboards': return <DashboardsTab onNavigateTab={navigateTab} sub={dashSub} onSubChange={setDashSub} />
      case 'masters': return <ItemMasterTab />
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
      {/* .page-head — crumb/title/chip row + Import/Export/New transfer actions */}
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

      {/* KPI grid + AI banner — shared across every tab, rendered once here */}
      <InventoryKpiStrip onNavigateTab={(t) => setTab(t as InventoryTabId)} />

      {/* .page-tabs — 17-tab strip, horizontally scrollable */}
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
