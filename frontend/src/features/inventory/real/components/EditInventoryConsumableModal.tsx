import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ReactNode } from 'react'
import type { InventoryConsumableEntity } from '@/types/inventoryConsumable.types'
import { useCreateInventoryConsumable } from '@/features/inventory/real/hooks/useCreateInventoryConsumable'
import { useUpdateInventoryConsumable } from '@/features/inventory/real/hooks/useUpdateInventoryConsumable'
import {
  createInventoryConsumableSchema,
  updateInventoryConsumableSchema,
  type InventoryConsumableCreateFormValues,
  type InventoryConsumableUpdateFormValues,
} from '@/features/inventory/real/schemas/inventoryConsumable.schemas'
import InventoryMasterItemPicker from '@/features/inventory/real/components/InventoryMasterItemPicker'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import FieldLabel from '@/components/ui/FieldLabel'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import MutationStatusBanner from '@/components/ui/MutationStatusBanner'

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
] as const

const Field = ({ label, error, children }: { label: string; error?: string; children: ReactNode }) => (
  <div>
    <FieldLabel>{label}</FieldLabel>
    {children}
    {error && <p className="text-[11px] mt-1 text-danger">{error}</p>}
  </div>
)

const ReadOnlyField = ({ label, value }: { label: string; value: string }) => (
  <div>
    <FieldLabel>{label}</FieldLabel>
    <div
      className="h-8 min-w-0 flex items-center rounded-lg border px-2.5 text-[13px]"
      style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)', background: 'var(--qms-surface-strong)' }}
      title={value}
    >
      <span className="truncate">{value}</span>
    </div>
  </div>
)

interface EditInventoryConsumableModalProps {
  // null = create mode
  lot: InventoryConsumableEntity | null
  onClose: () => void
  // Only a manager can see/set a lot's status — passed down from the panel's
  // own permission check rather than re-checked here.
  canManageStatus: boolean
}

// No status field in create mode — the backend always seeds a new lot to
// 'active'. In edit mode, status is only shown when canManageStatus is true.
const EditInventoryConsumableModal = ({ lot, onClose, canManageStatus }: EditInventoryConsumableModalProps) => {
  const isEdit = !!lot
  const createMutation = useCreateInventoryConsumable()
  const updateMutation = useUpdateInventoryConsumable(lot?.id ?? '')

  if (isEdit) {
    return <EditForm lot={lot} onClose={onClose} mutation={updateMutation} canManageStatus={canManageStatus} />
  }

  return <CreateForm onClose={onClose} mutation={createMutation} />
}

const CreateForm = ({ onClose, mutation }: { onClose: () => void; mutation: ReturnType<typeof useCreateInventoryConsumable> }) => {
  // AsyncPicker is a controlled display component — it doesn't remember the
  // label of what it resolved the id to, so the selected item's display text
  // has to be held here alongside the form's own `item` id field.
  const [itemLabel, setItemLabel] = useState('')

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, touchedFields, isSubmitted },
  } = useForm<InventoryConsumableCreateFormValues>({
    resolver: zodResolver(createInventoryConsumableSchema),
    mode: 'onChange',
    defaultValues: {
      item: '',
      batch: '',
      manufacturingDate: '',
      expiryDate: '',
      quantity: 0,
    },
  })

  const fieldError = (field: keyof InventoryConsumableCreateFormValues) =>
    (touchedFields[field] || isSubmitted) ? errors[field]?.message : undefined

  const onSubmit = (values: InventoryConsumableCreateFormValues) => {
    mutation.mutate(
      {
        item: values.item,
        batch: values.batch,
        manufacturingDate: values.manufacturingDate,
        expiryDate: values.expiryDate,
        quantity: values.quantity,
      },
      { onSuccess: onClose },
    )
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>New consumable lot</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 min-w-0" noValidate>
          <Field label="Catalog item *" error={fieldError('item')}>
            <Controller
              control={control}
              name="item"
              render={({ field }) => (
                <InventoryMasterItemPicker
                  type="consumable"
                  value={field.value}
                  label={itemLabel}
                  onChange={(id, label) => { field.onChange(id); setItemLabel(label) }}
                />
              )}
            />
          </Field>

          <Field label="Batch *" error={fieldError('batch')}>
            <Input type="text" className="text-[13px]" {...register('batch')} />
          </Field>

          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Manufacturing date *" error={fieldError('manufacturingDate')}>
              <Input type="date" className="text-[13px]" {...register('manufacturingDate')} />
            </Field>
            <Field label="Expiry date *" error={fieldError('expiryDate')}>
              <Input type="date" className="text-[13px]" {...register('expiryDate')} />
            </Field>
          </div>

          <Field label="Quantity" error={fieldError('quantity')}>
            <Input type="number" className="text-[13px]" {...register('quantity', { valueAsNumber: true })} />
          </Field>

          <MutationStatusBanner mutation={mutation} errorFallback="Could not save the lot — try again." showSuccess={false} />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Create lot'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const EditForm = ({
  lot, onClose, mutation, canManageStatus,
}: {
  lot: InventoryConsumableEntity
  onClose: () => void
  mutation: ReturnType<typeof useUpdateInventoryConsumable>
  canManageStatus: boolean
}) => {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, touchedFields, isSubmitted },
  } = useForm<InventoryConsumableUpdateFormValues>({
    resolver: zodResolver(updateInventoryConsumableSchema),
    mode: 'onChange',
    defaultValues: {
      batch: lot.batch,
      manufacturingDate: lot.manufacturingDate?.slice(0, 10) ?? '',
      expiryDate: lot.expiryDate?.slice(0, 10) ?? '',
      quantity: lot.quantity,
      status: lot.status,
    },
  })

  const fieldError = (field: keyof InventoryConsumableUpdateFormValues) =>
    (touchedFields[field] || isSubmitted) ? errors[field]?.message : undefined

  const onSubmit = (values: InventoryConsumableUpdateFormValues) => {
    mutation.mutate(
      {
        batch: values.batch,
        manufacturingDate: values.manufacturingDate,
        expiryDate: values.expiryDate,
        quantity: values.quantity,
        // Omitted entirely (not sent as `status: undefined`) unless the
        // caller can actually manage status — matches the backend's own
        // visibility gate: a non-manager can't set what they can't even see.
        ...(canManageStatus ? { status: values.status } : {}),
      },
      { onSuccess: onClose },
    )
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>Edit consumable lot</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 min-w-0" noValidate>
          <ReadOnlyField label="Catalog item" value={lot.item.name ? `${lot.item.name} (${lot.item.code})` : lot.item.id} />

          <Field label="Batch *" error={fieldError('batch')}>
            <Input type="text" className="text-[13px]" {...register('batch')} />
          </Field>

          {canManageStatus && (
            <Field label="Status">
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full text-[13px]">
                      <SelectValue>{() => STATUS_OPTIONS.find((s) => s.value === field.value)?.label}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Manufacturing date *" error={fieldError('manufacturingDate')}>
              <Input type="date" className="text-[13px]" {...register('manufacturingDate')} />
            </Field>
            <Field label="Expiry date *" error={fieldError('expiryDate')}>
              <Input type="date" className="text-[13px]" {...register('expiryDate')} />
            </Field>
          </div>

          <Field label="Quantity" error={fieldError('quantity')}>
            <Input type="number" className="text-[13px]" {...register('quantity', { valueAsNumber: true })} />
          </Field>

          <MutationStatusBanner mutation={mutation} errorFallback="Could not save the lot — try again." showSuccess={false} />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default EditInventoryConsumableModal
