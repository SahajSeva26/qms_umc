import { useState } from 'react'
import { FiX } from 'react-icons/fi'
import { useAsyncPickerState } from '@/hooks/useAsyncPickerState'
import { useInventoryMasterPicker } from '@/features/inventory/real/hooks/useInventoryMasterPicker'
import type { InventoryMasterEntity, InventoryMasterType } from '@/types/inventoryMaster.types'
import AsyncPicker from '@/components/ui/AsyncPicker'

interface InventoryMasterMultiPickerProps {
  /** Selected device ids. */
  value: string[]
  /** Selected devices' own labels, keyed by id — needed to render chips for a selection that fell off the current search results. */
  labels: Record<string, string>
  onChange: (value: string[], labels: Record<string, string>) => void
  type: InventoryMasterType
  disabled?: boolean
}

const itemLabel = (item: InventoryMasterEntity) => `${item.name} (${item.code})`

// Multi-select devices picker over the InventoryMaster catalog — the backend
// requires devices as real catalog ObjectIds, not free text.
const InventoryMasterMultiPicker = ({ value, labels, onChange, type, disabled }: InventoryMasterMultiPickerProps) => {
  const [query, setQuery] = useState('')
  const { open, setOpen, containerRef } = useAsyncPickerState()

  const { items, isFetching, error, hasMore, loadMore, refetch } = useInventoryMasterPicker(query, type, open)

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
      <AsyncPicker<InventoryMasterEntity>
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
        getLabel={itemLabel}
        searchPlaceholder="Search devices to add…"
        clearAriaLabel="Clear"
        emptyQueryText="Start typing to search devices."
        noResultsText="No matching devices found."
        renderResult={(item) => <>{itemLabel(item)}</>}
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

export default InventoryMasterMultiPicker
