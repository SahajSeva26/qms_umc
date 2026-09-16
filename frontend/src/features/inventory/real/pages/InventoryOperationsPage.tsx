import { useState } from 'react'
import { usePermission } from '@/hooks/usePermission'
import InventoryAssignmentsPanel from '@/features/inventory/real/components/InventoryAssignmentsPanel'
import InventoryRequestsPanel from '@/features/inventory/real/components/InventoryRequestsPanel'
import InventoryLedgerPanel from '@/features/inventory/real/components/InventoryLedgerPanel'

type InventoryOperationsView = 'assignments' | 'requests' | 'ledger'

// GET /inventory-assignments and GET /inventory-ledgers are both :manage-gated
// server-side (a field officer holds neither) — hide the tabs a viewer would
// otherwise 403 on, the same boundary Sidebar.tsx's nav gate mirrors elsewhere.
const InventoryOperationsPage = () => {
  const { hasAnyPermission } = usePermission()
  const canViewAssignments = hasAnyPermission(['inventory-assignment:manage'])
  const canViewLedger = hasAnyPermission(['inventory-ledger:manage'])
  const [view, setView] = useState<InventoryOperationsView>(canViewAssignments ? 'assignments' : 'requests')

  // Nothing to toggle between when Requests is the only tab a viewer can see
  // (e.g. a field officer) — show a plain "Requests" page instead of a
  // single-button toggle group.
  const isRequestsOnly = !canViewAssignments && !canViewLedger
  const pageTitle = isRequestsOnly ? 'Requests' : 'Inventory Operations'

  return (
    <div className="w-full">
      <div className="mb-3.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--qms-text-muted)' }}>
          Operations · {pageTitle}
        </p>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>{pageTitle}</h1>
      </div>

      {!isRequestsOnly && (
        <div
          className="inline-flex gap-1 p-1 rounded-[10px] mb-4"
          style={{ background: 'var(--qms-surface-strong, rgba(0,0,0,.04))' }}
        >
          {canViewAssignments && (
            <button
              type="button"
              aria-pressed={view === 'assignments'}
              onClick={() => setView('assignments')}
              className="rounded-lg text-xs font-bold border-0"
              style={{
                padding: '6px 14px',
                background: view === 'assignments' ? 'var(--qms-card)' : 'transparent',
                color: view === 'assignments' ? 'var(--qms-text)' : 'var(--qms-text-muted)',
                boxShadow: view === 'assignments' ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
              }}
            >
              Assignments
            </button>
          )}
          <button
            type="button"
            aria-pressed={view === 'requests'}
            onClick={() => setView('requests')}
            className="rounded-lg text-xs font-bold border-0"
            style={{
              padding: '6px 14px',
              background: view === 'requests' ? 'var(--qms-card)' : 'transparent',
              color: view === 'requests' ? 'var(--qms-text)' : 'var(--qms-text-muted)',
              boxShadow: view === 'requests' ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
            }}
          >
            Requests
          </button>
          {canViewLedger && (
            <button
              type="button"
              aria-pressed={view === 'ledger'}
              onClick={() => setView('ledger')}
              className="rounded-lg text-xs font-bold border-0"
              style={{
                padding: '6px 14px',
                background: view === 'ledger' ? 'var(--qms-card)' : 'transparent',
                color: view === 'ledger' ? 'var(--qms-text)' : 'var(--qms-text-muted)',
                boxShadow: view === 'ledger' ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
              }}
            >
              Ledger
            </button>
          )}
        </div>
      )}

      {view === 'assignments' && canViewAssignments && <InventoryAssignmentsPanel />}
      {view === 'requests' && <InventoryRequestsPanel />}
      {view === 'ledger' && canViewLedger && <InventoryLedgerPanel />}
    </div>
  )
}

export default InventoryOperationsPage
