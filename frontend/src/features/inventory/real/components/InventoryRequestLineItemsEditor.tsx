import { FiPlus, FiTrash2 } from 'react-icons/fi'
import { useSession } from '@/hooks/useSession'
import InventoryMasterItemPicker from '@/features/inventory/real/components/InventoryMasterItemPicker'
import AssigneeHoldingPicker from '@/features/inventory/real/components/AssigneeHoldingPicker'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import FieldLabel from '@/components/ui/FieldLabel'
import type { InventoryRequestType } from '@/types/inventoryRequest.types'
import { createRequestLineDraft, type RequestLineDraft, type StockKind } from '@/features/inventory/real/utils/requestLineDraft'

interface InventoryRequestLineItemsEditorProps {
  type: InventoryRequestType
  lines: RequestLineDraft[]
  onChange: (lines: RequestLineDraft[]) => void
}

const emptyLine = (stockKind: StockKind): RequestLineDraft => createRequestLineDraft({
  stockKind,
  itemType: stockKind === 'device' ? 'InventoryDevice' : 'InventoryConsumable',
  item: '',
  itemLabel: '',
  quantity: stockKind === 'device' ? undefined : 1,
})

// A refill line targets the global catalog; a return line targets ONLY the
// acting session's own held stock — never the global stock picker, which would let an FO pick another FO's device.
const InventoryRequestLineItemsEditor = ({ type, lines, onChange }: InventoryRequestLineItemsEditorProps) => {
  const { session } = useSession()
  const assigneeRoleId = session?.role?.id ?? ''

  const isRefill = type === 'refill'

  const updateLine = (index: number, patch: Partial<RequestLineDraft>) => {
    const next = lines.slice()
    next[index] = { ...next[index], ...patch }
    onChange(next)
  }

  const addLine = () => onChange([...lines, emptyLine('device')])
  const removeLine = (index: number) => onChange(lines.filter((_, i) => i !== index))

  // Same held item can't appear on two return lines; refill lines get the
  // same (itemType,item) dedup since re-requesting one catalog item twice is pointless.
  const duplicateAt = (index: number): boolean => {
    const line = lines[index]
    if (!line.item) return false
    return lines.some((other, i) => i !== index && other.itemType === line.itemType && other.item === line.item)
  }

  return (
    <div className="space-y-3">
      <FieldLabel>Line items *</FieldLabel>
      {lines.map((line, index) => {
        const itemTypeForPicker = line.stockKind === 'device' ? 'device' : 'consumable'
        const isDup = duplicateAt(index)
        const overQuantity = !isRefill && line.heldQuantity !== undefined && (line.quantity ?? 0) > line.heldQuantity

        return (
          <div key={line.draftId} className="rounded-lg border p-2.5 space-y-2 min-w-0" style={{ borderColor: 'var(--qms-border)' }}>
            <div className="flex items-center gap-2">
              <Select
                value={line.stockKind}
                onValueChange={(v) => updateLine(index, emptyLine(v as StockKind))}
              >
                <SelectTrigger className="w-36 text-[13px]">
                  <SelectValue>{() => (line.stockKind === 'device' ? 'Device' : 'Consumable')}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="device">Device</SelectItem>
                  <SelectItem value="consumable">Consumable</SelectItem>
                </SelectContent>
              </Select>

              {lines.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeLine(index)}
                  className="ml-auto rounded p-1 transition-colors hover:bg-(--qms-surface-hover)"
                  style={{ color: 'var(--qms-text-muted)' }}
                  aria-label="Remove line"
                >
                  <FiTrash2 size={13} />
                </button>
              )}
            </div>

            {isRefill ? (
              <InventoryMasterItemPicker
                type={itemTypeForPicker}
                value={line.item}
                label={line.itemLabel}
                onChange={(id, label) => updateLine(index, { item: id, itemLabel: label, itemType: 'InventoryMaster' })}
              />
            ) : (
              <AssigneeHoldingPicker
                assigneeRoleId={assigneeRoleId}
                inventoryType={line.stockKind === 'device' ? 'InventoryDevice' : 'InventoryConsumable'}
                value={line.item}
                excludeIds={lines.filter((_, i) => i !== index).map((l) => l.item).filter(Boolean)}
                onChange={(id, heldQuantity) =>
                  updateLine(index, {
                    item: id,
                    itemType: line.stockKind === 'device' ? 'InventoryDevice' : 'InventoryConsumable',
                    heldQuantity,
                    quantity: line.stockKind === 'device' ? 1 : Math.min(line.quantity ?? 1, heldQuantity),
                  })
                }
              />
            )}

            {line.stockKind === 'consumable' && (
              <div>
                <Input
                  type="number"
                  className="text-[13px]"
                  value={line.quantity ?? ''}
                  onChange={(e) => updateLine(index, { quantity: e.target.value ? Number(e.target.value) : undefined })}
                />
                {overQuantity && (
                  <p className="text-[11px] mt-1 text-danger">Cannot exceed the held quantity ({line.heldQuantity}).</p>
                )}
              </div>
            )}

            {isDup && <p className="text-[11px] text-danger">This item is already selected on another line.</p>}
          </div>
        )
      })}

      <button
        type="button"
        onClick={addLine}
        className="inline-flex items-center gap-1.5 text-[12px] font-semibold rounded-lg px-2.5 py-1.5 transition-colors hover:bg-(--qms-surface-hover)"
        style={{ color: 'var(--qms-brand)' }}
      >
        <FiPlus size={13} /> Add line
      </button>
    </div>
  )
}

export default InventoryRequestLineItemsEditor
