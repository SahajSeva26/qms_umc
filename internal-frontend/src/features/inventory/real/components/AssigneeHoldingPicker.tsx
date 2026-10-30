import { useAssigneeHoldings } from '@/features/inventory/real/hooks/useAssigneeHoldings'
import type { InventoryAssignmentType } from '@/types/inventoryAssignment.types'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

interface AssigneeHoldingPickerProps {
  assigneeRoleId: string
  inventoryType: InventoryAssignmentType
  value: string
  onChange: (id: string, quantity: number) => void
  // items already chosen on other lines of the same request — excluded from
  // this line's options so the same held item can't be picked twice.
  excludeIds?: string[]
}

const holdingLabel = (holding: { inventory: { serialNumber?: string; batch?: string; id: string }; quantity: number }) => {
  const identifier = holding.inventory.serialNumber ?? holding.inventory.batch ?? holding.inventory.id
  return `${identifier} (qty held: ${holding.quantity})`
}

// A plain Select, not a typeahead — the holdings set is small/bounded and
// already fully fetched. The only correct source for a return-line item; never the global picker.
const AssigneeHoldingPicker = ({ assigneeRoleId, inventoryType, value, onChange, excludeIds = [] }: AssigneeHoldingPickerProps) => {
  const { data, isFetching } = useAssigneeHoldings(assigneeRoleId, inventoryType)
  const holdings = (data?.data?.items ?? []).filter((h) => !excludeIds.includes(h.inventory.id) || h.inventory.id === value)

  const selected = holdings.find((h) => h.inventory.id === value)

  return (
    <Select
      value={value}
      onValueChange={(id) => {
        if (!id) return
        const holding = holdings.find((h) => h.inventory.id === id)
        if (holding) onChange(id, holding.quantity)
      }}
    >
      <SelectTrigger className="w-full text-[13px]">
        <SelectValue>{() => (selected ? holdingLabel(selected) : isFetching ? 'Loading…' : 'Select held item...')}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {holdings.length === 0 && !isFetching && (
          <div className="px-2 py-1.5 text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
            Nothing currently held.
          </div>
        )}
        {holdings.map((h) => (
          <SelectItem key={h.id} value={h.inventory.id}>{holdingLabel(h)}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export default AssigneeHoldingPicker
