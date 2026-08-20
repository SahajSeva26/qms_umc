import { useState } from 'react'
import { FiSearch } from 'react-icons/fi'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import InventoryMasterItemPicker from '@/features/inventory/real/components/InventoryMasterItemPicker'

type SearchMode = 'serial' | 'name'

export interface InventoryDeviceSearchBarValue {
  serial: string
  item: { id: string; label: string } | null
}

interface InventoryDeviceSearchBarProps {
  value: InventoryDeviceSearchBarValue
  onChange: (value: InventoryDeviceSearchBarValue) => void
}

// Switching modes clears the other mode's state — serial and item-name are different query shapes, not combinable.
const InventoryDeviceSearchBar = ({ value, onChange }: InventoryDeviceSearchBarProps) => {
  const [mode, setMode] = useState<SearchMode>('serial')

  const switchMode = (next: SearchMode) => {
    setMode(next)
    onChange({ serial: '', item: null })
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={mode} onValueChange={(v) => switchMode(v as SearchMode)}>
        <SelectTrigger className="w-36 text-[13px]" aria-label="Search by">
          <SelectValue>{() => (mode === 'serial' ? 'Serial number' : 'Item name')}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="serial">Serial number</SelectItem>
          <SelectItem value="name">Item name</SelectItem>
        </SelectContent>
      </Select>

      {mode === 'serial' ? (
        <div className="relative flex-1 min-w-[220px] max-w-xs">
          <FiSearch size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--qms-text-muted)' }} />
          <Input
            placeholder="Search by serial number..."
            value={value.serial}
            onChange={(e) => onChange({ serial: e.target.value, item: null })}
            className="pl-8 text-[13px]"
          />
        </div>
      ) : (
        <div className="w-56">
          <InventoryMasterItemPicker
            type="device"
            value={value.item?.id ?? ''}
            label={value.item?.label ?? ''}
            onChange={(id, label) => onChange({ serial: '', item: id ? { id, label } : null })}
          />
        </div>
      )}
    </div>
  )
}

export default InventoryDeviceSearchBar
