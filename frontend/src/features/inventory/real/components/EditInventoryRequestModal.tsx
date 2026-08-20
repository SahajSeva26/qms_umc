import { useState } from 'react'
import type { InventoryRequestEntity, InventoryRequestType } from '@/types/inventoryRequest.types'
import { useCreateInventoryRequest } from '@/features/inventory/real/hooks/useCreateInventoryRequest'
import { useUpdateInventoryRequest } from '@/features/inventory/real/hooks/useUpdateInventoryRequest'
import InventoryRequestLineItemsEditor from '@/features/inventory/real/components/InventoryRequestLineItemsEditor'
import { createRequestLineDraft, isLineSetValid, type RequestLineDraft } from '@/features/inventory/real/utils/requestLineDraft'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import FieldLabel from '@/components/ui/FieldLabel'
import MutationStatusBanner from '@/components/ui/MutationStatusBanner'

interface EditInventoryRequestModalProps {
  // null = create mode
  request: InventoryRequestEntity | null
  onClose: () => void
}

const emptyLine = (): RequestLineDraft => createRequestLineDraft({
  stockKind: 'device',
  itemType: 'InventoryDevice',
  item: '',
  itemLabel: '',
})

// The sub-picker "kind" a line resolves to on re-open. For a return line
// itemType already IS the device/consumable distinction. For a refill line,
// itemType is always 'InventoryMaster' — the real device-vs-consumable
// distinction lives on the populated master's OWN `type` field
// (li.item.type), not on itemType. Checking itemType alone here previously
// mis-classified a consumable-typed Master as 'device' on every edit-reopen.
const linesFromRequest = (request: InventoryRequestEntity): RequestLineDraft[] =>
  request.lineItems.map((li) => createRequestLineDraft({
    stockKind: li.itemType === 'InventoryConsumable' || li.item.type === 'consumable' ? 'consumable' : 'device',
    itemType: li.itemType,
    item: li.item.id,
    itemLabel: li.item.name ?? li.item.serialNumber ?? li.item.batch ?? li.item.id,
    quantity: li.quantity,
  }))

// Edit mode is only reachable while status === 'requested'; submitting
// replaces lineItems wholesale, per the backend's own update contract.
const EditInventoryRequestModal = ({ request, onClose }: EditInventoryRequestModalProps) => {
  const isEdit = !!request
  const createMutation = useCreateInventoryRequest()
  const updateMutation = useUpdateInventoryRequest(request?.id ?? '')

  const [type, setType] = useState<InventoryRequestType>(request?.type ?? 'refill')
  const [lines, setLines] = useState<RequestLineDraft[]>(request ? linesFromRequest(request) : [emptyLine()])

  const mutation = isEdit ? updateMutation : createMutation
  const valid = isLineSetValid(lines, type)

  const handleSubmit = () => {
    const payloadLines = lines.map((l) => ({
      itemType: l.itemType,
      item: l.item,
      quantity: l.quantity,
    }))

    if (isEdit) {
      updateMutation.mutate({ lineItems: payloadLines }, { onSuccess: onClose })
      return
    }
    createMutation.mutate({ type, lineItems: payloadLines }, { onSuccess: onClose })
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>
            {isEdit ? 'Edit request' : 'New request'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 min-w-0">
          <div>
            <FieldLabel>Type</FieldLabel>
            {isEdit ? (
              <div
                className="h-8 flex items-center rounded-lg border px-2.5 text-[13px]"
                style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)', background: 'var(--qms-surface-strong)' }}
              >
                {type === 'refill' ? 'Refill' : 'Return'}
              </div>
            ) : (
              <Select value={type} onValueChange={(v) => { setType(v as InventoryRequestType); setLines([emptyLine()]) }}>
                <SelectTrigger className="w-full text-[13px]">
                  <SelectValue>{() => (type === 'refill' ? 'Refill' : 'Return')}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="refill">Refill (request stock from the warehouse)</SelectItem>
                  <SelectItem value="return">Return (give back stock you hold)</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <InventoryRequestLineItemsEditor type={type} lines={lines} onChange={setLines} />

          <MutationStatusBanner mutation={mutation} errorFallback="Could not save the request — try again." showSuccess={false} />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="button" disabled={!valid || mutation.isPending} onClick={handleSubmit}>
              {mutation.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create request'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default EditInventoryRequestModal
