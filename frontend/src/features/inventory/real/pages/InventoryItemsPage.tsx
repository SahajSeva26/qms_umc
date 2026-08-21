import { useState } from 'react'
import InventoryDevicesPanel from '@/features/inventory/real/components/InventoryDevicesPanel'
import InventoryConsumablesPanel from '@/features/inventory/real/components/InventoryConsumablesPanel'

type InventoryItemsView = 'devices' | 'consumables'

const InventoryItemsPage = () => {
  const [view, setView] = useState<InventoryItemsView>('devices')

  return (
    <div className="w-full">
      <div className="mb-3.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--qms-text-muted)' }}>
          Operations · Inventory Items
        </p>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>Inventory Items</h1>
      </div>

      <div
        className="inline-flex gap-1 p-1 rounded-[10px] mb-4"
        style={{ background: 'var(--qms-surface-strong, rgba(0,0,0,.04))' }}
      >
        <button
          type="button"
          aria-pressed={view === 'devices'}
          onClick={() => setView('devices')}
          className="rounded-lg text-xs font-bold border-0"
          style={{
            padding: '6px 14px',
            background: view === 'devices' ? 'var(--qms-card)' : 'transparent',
            color: view === 'devices' ? 'var(--qms-text)' : 'var(--qms-text-muted)',
            boxShadow: view === 'devices' ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
          }}
        >
          Devices
        </button>
        <button
          type="button"
          aria-pressed={view === 'consumables'}
          onClick={() => setView('consumables')}
          className="rounded-lg text-xs font-bold border-0"
          style={{
            padding: '6px 14px',
            background: view === 'consumables' ? 'var(--qms-card)' : 'transparent',
            color: view === 'consumables' ? 'var(--qms-text)' : 'var(--qms-text-muted)',
            boxShadow: view === 'consumables' ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
          }}
        >
          Consumables
        </button>
      </div>

      {view === 'devices' ? <InventoryDevicesPanel /> : <InventoryConsumablesPanel />}
    </div>
  )
}

export default InventoryItemsPage
