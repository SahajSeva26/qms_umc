import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FiX } from 'react-icons/fi'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useAsyncPickerState } from '@/hooks/useAsyncPickerState'
import { inventoryDeviceService } from '@/features/inventory/real/inventoryDevice.service'
import { inventoryConsumableService } from '@/features/inventory/real/inventoryConsumable.service'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import type { InventoryDeviceEntity } from '@/features/inventory/real/inventoryDevice.types'
import type { InventoryConsumableEntity } from '@/features/inventory/real/inventoryConsumable.types'

type PickerMode = 'InventoryDevice' | 'InventoryConsumable'

export interface InventoryLedgerItemPickerValue {
  id: string
  inventoryType: PickerMode
  label: string
}

interface InventoryLedgerItemPickerProps {
  value: InventoryLedgerItemPickerValue | null
  onChange: (value: InventoryLedgerItemPickerValue | null) => void
}

// Narrows the Ledger to ONE device/lot — device search is live, consumable search submits on Enter (exact-match backend query).
const InventoryLedgerItemPicker = ({ value, onChange }: InventoryLedgerItemPickerProps) => {
  const [mode, setMode] = useState<PickerMode>('InventoryDevice')
  const [query, setQuery] = useState('')
  const [submittedBatch, setSubmittedBatch] = useState('')
  const debouncedSerial = useDebouncedValue(query, 300)
  const { open, setOpen, containerRef } = useAsyncPickerState()

  const deviceQuery = { serialNumber: debouncedSerial.trim(), limit: '10' }
  const { data: deviceData, isFetching: deviceFetching } = useQuery({
    queryKey: ['inventory-devices', 'ledger-item-picker', deviceQuery],
    queryFn: () => inventoryDeviceService.searchInventoryDevices(deviceQuery),
    enabled: mode === 'InventoryDevice' && !!debouncedSerial.trim(),
  })

  const consumableQuery = { batch: submittedBatch.trim(), limit: '10' }
  const { data: consumableData, isFetching: consumableFetching } = useQuery({
    queryKey: ['inventory-consumables', 'ledger-item-picker', consumableQuery],
    queryFn: () => inventoryConsumableService.searchInventoryConsumables(consumableQuery),
    enabled: mode === 'InventoryConsumable' && !!submittedBatch.trim(),
  })

  const deviceResults = deviceData?.data?.items ?? []
  const consumableResults = consumableData?.data?.items ?? []
  const isFetching = mode === 'InventoryDevice' ? deviceFetching : consumableFetching

  const switchMode = (next: PickerMode) => {
    setMode(next)
    setQuery('')
    setSubmittedBatch('')
    setOpen(false)
  }

  const pickDevice = (device: InventoryDeviceEntity) => {
    onChange({ id: device.id, inventoryType: 'InventoryDevice', label: device.serialNumber })
    setQuery('')
    setOpen(false)
  }

  const pickConsumable = (lot: InventoryConsumableEntity) => {
    const itemName = lot.item.name ?? lot.item.id
    onChange({ id: lot.id, inventoryType: 'InventoryConsumable', label: `${lot.batch} · ${itemName}` })
    setSubmittedBatch('')
    setOpen(false)
  }

  const clearSelection = () => {
    onChange(null)
    setQuery('')
    setSubmittedBatch('')
  }

  if (value) {
    return (
      <div
        className="flex items-center gap-2 h-8 min-w-0 rounded-lg border px-2.5 text-[13px] cursor-pointer"
        style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text)' }}
        onClick={clearSelection}
      >
        <span className="flex-1 min-w-0 truncate">{value.label}</span>
        <button type="button" onClick={clearSelection} aria-label="Clear item filter">
          <FiX size={13} style={{ color: 'var(--qms-text-muted)' }} />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={mode} onValueChange={(v) => switchMode(v as PickerMode)}>
        <SelectTrigger className="w-32 text-[13px]" aria-label="Find item by">
          <SelectValue>{() => (mode === 'InventoryDevice' ? 'Device' : 'Consumable')}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="InventoryDevice">Device</SelectItem>
          <SelectItem value="InventoryConsumable">Consumable</SelectItem>
        </SelectContent>
      </Select>

      <div ref={containerRef} className="relative">
        {mode === 'InventoryDevice' ? (
          <Input
            placeholder="Search serial number..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(!!e.target.value.trim()) }}
            onFocus={() => setOpen(!!query.trim())}
            className="text-[13px] w-56"
          />
        ) : (
          <div className="flex items-center gap-1.5">
            <Input
              placeholder="Enter exact batch number..."
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSubmittedBatch(''); setOpen(false) }}
              onFocus={() => setOpen(!!submittedBatch)}
              onKeyDown={(e) => { if (e.key === 'Enter' && query.trim()) { setSubmittedBatch(query.trim()); setOpen(true) } }}
              className="text-[13px] w-48"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!query.trim()}
              onClick={() => { setSubmittedBatch(query.trim()); setOpen(true) }}
            >
              Find
            </Button>
          </div>
        )}

        {open && (
          <div
            data-testid="ledger-item-picker-results"
            className="absolute left-0 right-0 top-full mt-1 z-50 p-1.5 rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10"
            style={{ minWidth: '260px' }}
          >
            {isFetching && (
              <div className="text-[12px] px-2 py-2" style={{ color: 'var(--qms-text-muted)' }}>Searching…</div>
            )}
            {mode === 'InventoryDevice' && !deviceFetching && debouncedSerial.trim() && deviceResults.length === 0 && (
              <div className="text-[12px] px-2 py-2" style={{ color: 'var(--qms-text-muted)' }}>No matching devices found.</div>
            )}
            {mode === 'InventoryConsumable' && !consumableFetching && submittedBatch && consumableResults.length === 0 && (
              <div className="text-[12px] px-2 py-2" style={{ color: 'var(--qms-text-muted)' }}>
                No active batch matches that exact number. Expired batches aren't searchable here.
              </div>
            )}
            {mode === 'InventoryDevice' && deviceResults.map((device) => (
              <button
                key={device.id}
                type="button"
                onClick={() => pickDevice(device)}
                className="w-full flex items-center justify-between gap-2 text-left text-[13px] px-2 py-1.5 rounded-md transition-colors hover:bg-(--qms-surface-hover)"
                style={{ color: 'var(--qms-text)' }}
              >
                <span className="font-mono">{device.serialNumber}</span>
                <span className="text-[12px] truncate" style={{ color: 'var(--qms-text-muted)' }}>{device.item.name ?? device.item.id}</span>
              </button>
            ))}
            {mode === 'InventoryConsumable' && consumableResults.map((lot) => (
              <button
                key={lot.id}
                type="button"
                onClick={() => pickConsumable(lot)}
                className="w-full flex items-center justify-between gap-2 text-left text-[13px] px-2 py-1.5 rounded-md transition-colors hover:bg-(--qms-surface-hover)"
                style={{ color: 'var(--qms-text)' }}
              >
                <span className="font-mono">{lot.batch}</span>
                <span className="text-[12px] truncate" style={{ color: 'var(--qms-text-muted)' }}>{lot.item.name ?? lot.item.id}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default InventoryLedgerItemPicker
