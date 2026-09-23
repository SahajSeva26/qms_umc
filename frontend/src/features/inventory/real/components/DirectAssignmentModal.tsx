import { useRef, useState } from 'react'
import { FiPlus, FiTrash2 } from 'react-icons/fi'
import { useDirectAssignInventory } from '@/features/inventory/real/hooks/useDirectAssignInventory'
import InventoryDeviceMultiPicker from '@/features/inventory/real/components/InventoryDeviceMultiPicker'
import InventoryMasterItemPicker from '@/features/inventory/real/components/InventoryMasterItemPicker'
import {
  createConsumableAssignmentLineDraft,
  isConsumableLineSetValid,
  type ConsumableAssignmentLineDraft,
} from '@/features/inventory/real/utils/directAssignmentDraft'
import type { InventoryAssignmentReportFieldOfficer } from '@/types/inventoryAssignment.types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import FieldLabel from '@/components/ui/FieldLabel'
import MutationStatusBanner from '@/components/ui/MutationStatusBanner'
import { toast } from '@/components/ui/sonner'

interface DirectAssignmentModalProps {
  // Roster from the parent panel (InventoryAssignmentsPanel's report data) —
  // this modal never fetches its own FO list.
  fieldOfficers: InventoryAssignmentReportFieldOfficer[]
  onClose: () => void
}

// A duplicate check per-line (mirrors isConsumableLineSetValid's dedup rule,
// but returns which specific line is the offender for an inline message).
const duplicateAt = (lines: ConsumableAssignmentLineDraft[], index: number): boolean => {
  const line = lines[index]
  if (!line.item) return false
  return lines.some((other, i) => i !== index && other.item === line.item)
}

// Manager-only: pushes devices/consumables straight to an FO, bypassing the request lifecycle.
const DirectAssignmentModal = ({ fieldOfficers, onClose }: DirectAssignmentModalProps) => {
  const mutation = useDirectAssignInventory()

  const [selectedFo, setSelectedFo] = useState('')
  const [devices, setDevices] = useState<string[]>([])
  const [deviceLabels, setDeviceLabels] = useState<Record<string, string>>({})
  const [consumableLines, setConsumableLines] = useState<ConsumableAssignmentLineDraft[]>([])
  // Synchronous double-submit guard (mutation.isPending re-renders one tick too late) — mirrors CreateEmployeeModal.tsx's submittingRef.
  const submittingRef = useRef(false)

  const hasDevices = devices.length > 0
  const consumablesOk = isConsumableLineSetValid(consumableLines)
  const canSubmit = !!selectedFo && consumablesOk && (hasDevices || consumableLines.length > 0) && !mutation.isPending

  const updateConsumableLine = (index: number, patch: Partial<ConsumableAssignmentLineDraft>) => {
    const next = consumableLines.slice()
    next[index] = { ...next[index], ...patch }
    setConsumableLines(next)
  }

  const addConsumableLine = () => setConsumableLines([...consumableLines, createConsumableAssignmentLineDraft()])
  const removeConsumableLine = (index: number) => setConsumableLines(consumableLines.filter((_, i) => i !== index))

  const handleSubmit = async () => {
    if (submittingRef.current) return
    submittingRef.current = true
    try {
      const payload = {
        devices: devices.length > 0 ? devices : undefined,
        consumables: consumableLines.length > 0
          ? consumableLines.map((l) => ({ item: l.item, quantity: l.quantity! }))
          : undefined,
      }

      const res = await mutation.mutateAsync({ fo: selectedFo, payload })
      toast.success(`Assigned successfully — FO now holds ${res.data?.count ?? 0} inventory records.`)
      onClose()
    } catch {
      // Error surfaces via MutationStatusBanner (mutation.isError) below — nothing else to do here.
    } finally {
      submittingRef.current = false
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>
            Assign inventory to FO
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 min-w-0">
          <div>
            <FieldLabel>Field officer</FieldLabel>
            <Select
              value={selectedFo}
              onValueChange={(v) => { if (v) setSelectedFo(v) }}
              disabled={fieldOfficers.length === 0}
            >
              <SelectTrigger className="w-full text-[13px]">
                <SelectValue>
                  {() => {
                    if (fieldOfficers.length === 0) return 'No field officers available'
                    const match = fieldOfficers.find((f) => f.role === selectedFo)
                    return match ? `${match.name} (${match.code})` : 'Select a field officer'
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {fieldOfficers.map((fo) => (
                  <SelectItem key={fo.role} value={fo.role}>{fo.name} ({fo.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <FieldLabel>Devices</FieldLabel>
            <InventoryDeviceMultiPicker
              value={devices}
              labels={deviceLabels}
              onChange={(value, labels) => { setDevices(value); setDeviceLabels(labels) }}
            />
          </div>

          <div className="space-y-3">
            <FieldLabel>Consumables (optional)</FieldLabel>

            {consumableLines.map((line, index) => {
              const isDup = duplicateAt(consumableLines, index)
              return (
                <div key={line.draftId} className="rounded-lg border p-2.5 space-y-2 min-w-0" style={{ borderColor: 'var(--qms-border)' }}>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <InventoryMasterItemPicker
                        type="consumable"
                        value={line.item}
                        label={line.itemLabel}
                        onChange={(id, label) => updateConsumableLine(index, { item: id, itemLabel: label })}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeConsumableLine(index)}
                      className="rounded p-1 transition-colors hover:bg-(--qms-surface-hover)"
                      style={{ color: 'var(--qms-text-muted)' }}
                      aria-label="Remove line"
                    >
                      <FiTrash2 size={13} />
                    </button>
                  </div>

                  <Input
                    type="number"
                    className="text-[13px]"
                    placeholder="Quantity"
                    value={line.quantity ?? ''}
                    onChange={(e) => updateConsumableLine(index, { quantity: e.target.value ? Number(e.target.value) : undefined })}
                  />

                  {isDup && <p className="text-[11px] text-danger">This item is already selected on another line.</p>}
                </div>
              )
            })}

            <button
              type="button"
              onClick={addConsumableLine}
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold rounded-lg px-2.5 py-1.5 transition-colors hover:bg-(--qms-surface-hover)"
              style={{ color: 'var(--qms-brand)' }}
            >
              <FiPlus size={13} /> Add consumable
            </button>
          </div>

          <MutationStatusBanner mutation={mutation} errorFallback="Could not assign inventory — try again." showSuccess={false} />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="button" disabled={!canSubmit} onClick={handleSubmit}>
              {mutation.isPending ? 'Assigning…' : 'Assign'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default DirectAssignmentModal
