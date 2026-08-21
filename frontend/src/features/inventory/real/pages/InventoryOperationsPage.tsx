import { useState } from 'react'
import InventoryAssignmentsPanel from '@/features/inventory/real/components/InventoryAssignmentsPanel'
import InventoryRequestsPanel from '@/features/inventory/real/components/InventoryRequestsPanel'
import InventoryLedgerPanel from '@/features/inventory/real/components/InventoryLedgerPanel'

type InventoryOperationsView = 'assignments' | 'requests' | 'ledger'

const InventoryOperationsPage = () => {
  const [view, setView] = useState<InventoryOperationsView>('assignments')

  return (
    <div className="w-full">
      <div className="mb-3.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--qms-text-muted)' }}>
          Operations · Inventory Operations
        </p>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>Inventory Operations</h1>
      </div>

      <div
        className="inline-flex gap-1 p-1 rounded-[10px] mb-4"
        style={{ background: 'var(--qms-surface-strong, rgba(0,0,0,.04))' }}
      >
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
      </div>

      {view === 'assignments' && <InventoryAssignmentsPanel />}
      {view === 'requests' && <InventoryRequestsPanel />}
      {view === 'ledger' && <InventoryLedgerPanel />}
    </div>
  )
}

export default InventoryOperationsPage
