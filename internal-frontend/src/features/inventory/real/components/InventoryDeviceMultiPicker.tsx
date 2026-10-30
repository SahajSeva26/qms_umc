import { useState } from 'react'
import { FiX } from 'react-icons/fi'
import { useAsyncPickerState } from '@/hooks/useAsyncPickerState'
import { useInventoryDeviceMultiPicker } from '@/features/inventory/real/hooks/useInventoryDeviceMultiPicker'
import type { InventoryDeviceEntity } from '@/types/inventoryDevice.types'
import AsyncPicker from '@/components/ui/AsyncPicker'

interface InventoryDeviceMultiPickerProps {
  /** Selected InventoryDevice unit ids. */
  value: string[]
  /** Selected devices' own labels, keyed by id — needed to render chips for a selection that fell off the current search results. */
  labels: Record<string, string>
  onChange: (value: string[], labels: Record<string, string>) => void
  disabled?: boolean
}

const deviceLabel = (device: InventoryDeviceEntity) =>
  `${device.serialNumber} — ${device.item?.name ?? device.item?.code ?? 'Unknown item'}`

// useInventoryDeviceMultiPicker debounces internally, so the raw query string passes straight through.
const InventoryDeviceMultiPicker = ({ value, labels, onChange, disabled }: InventoryDeviceMultiPickerProps) => {
  const [query, setQuery] = useState('')
  const { open, setOpen, containerRef } = useAsyncPickerState()

  const { items, isFetching, error, hasMore, loadMore, refetch } = useInventoryDeviceMultiPicker(query, open)

  const addItem = (id: string, label: string) => {
    if (!id || value.includes(id)) return
    onChange([...value, id], { ...labels, [id]: label })
  }

  const removeItem = (id: string) => {
    onChange(value.filter((v) => v !== id), labels)
  }

  return (
    <div className="space-y-1.5">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((id) => (
            <span
              key={id}
              className="flex items-center gap-1 h-7 pl-2.5 pr-1.5 rounded-full border text-[12px]"
              style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text)' }}
            >
              {labels[id] ?? id}
              <button type="button" onClick={() => removeItem(id)} aria-label={`Remove ${labels[id] ?? id}`} disabled={disabled}>
                <FiX size={12} style={{ color: 'var(--qms-text-muted)' }} />
              </button>
            </span>
          ))}
        </div>
      )}
      <AsyncPicker<InventoryDeviceEntity>
        value=""
        label=""
        onChange={addItem}
        query={query}
        onQueryChange={setQuery}
        open={open}
        onOpenChange={setOpen}
        containerRef={containerRef}
        results={items.filter((item) => !value.includes(item.id))}
        isFetching={isFetching && items.length === 0}
        getId={(item) => item.id}
        getLabel={deviceLabel}
        searchPlaceholder="Search available devices by serial number…"
        clearAriaLabel="Clear"
        emptyQueryText="Type a serial number to search."
        noResultsText="No matching available devices found."
        renderResult={(item) => <>{deviceLabel(item)}</>}
        isError={!!error}
        errorText="Couldn't search devices. Try again."
        onRetry={() => refetch()}
        hasMore={hasMore}
        isLoadingMore={isFetching && items.length > 0}
        onLoadMore={loadMore}
        disabled={disabled}
      />
    </div>
  )
}

export default InventoryDeviceMultiPicker
