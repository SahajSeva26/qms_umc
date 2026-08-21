import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ReactNode } from 'react'
import type { InventoryMasterEntity } from '@/types/inventoryMaster.types'
import { INVENTORY_MASTER_TYPE_LABEL, INVENTORY_MASTER_TYPES } from '@/types/inventoryMaster.types'
import { useCreateInventoryMaster } from '@/features/inventory/real/hooks/useCreateInventoryMaster'
import { useUpdateInventoryMaster } from '@/features/inventory/real/hooks/useUpdateInventoryMaster'
import {
  createInventoryMasterSchema,
  type InventoryMasterFormValues,
} from '@/features/inventory/real/schemas/inventoryMaster.schemas'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import FieldLabel from '@/components/ui/FieldLabel'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import MutationStatusBanner from '@/components/ui/MutationStatusBanner'

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
] as const

const Field = ({ label, error, children }: { label: string; error?: string; children: ReactNode }) => (
  <div>
    <FieldLabel>{label}</FieldLabel>
    {children}
    {error && <p className="text-[11px] mt-1 text-danger">{error}</p>}
  </div>
)

interface EditInventoryMasterModalProps {
  // null = create mode
  item: InventoryMasterEntity | null
  onClose: () => void
}

const EditInventoryMasterModal = ({ item, onClose }: EditInventoryMasterModalProps) => {
  const isEdit = !!item
  const createMutation = useCreateInventoryMaster()
  const updateMutation = useUpdateInventoryMaster(item?.id ?? '')
  const mutation = isEdit ? updateMutation : createMutation

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, touchedFields, isSubmitted },
  } = useForm<InventoryMasterFormValues>({
    // One resolver for both modes — code is always valid in edit mode (disabled,
    // pre-filled), harmless to validate; it's stripped before sending since update doesn't accept it.
    resolver: zodResolver(createInventoryMasterSchema),
    mode: 'onChange',
    defaultValues: {
      code: item?.code ?? '',
      name: item?.name ?? '',
      description: item?.description ?? '',
      sku: item?.sku ?? '',
      unit: item?.unit ?? '',
      type: item?.type ?? 'device',
      // Absent (not just falsy) unless the caller holds inventory-master:manage
      // — item.status may genuinely be undefined even in edit mode for a
      // non-manage caller, so this can't default from item?.status alone.
      status: item?.status ?? 'active',
      minStock: item?.minStock ?? 0,
      maxStock: item?.maxStock ?? 0,
    },
  })

  // Shows once a field's been touched (blurred after typing) OR once a
  // submit has been attempted at all — otherwise a first blind submit on a
  // fully blank form only ever shows the one field RHF happens to focus,
  // silently hiding every other blank required field from the user.
  const fieldError = (field: keyof InventoryMasterFormValues) =>
    (touchedFields[field] || isSubmitted) ? errors[field]?.message : undefined

  const onSubmit = (values: InventoryMasterFormValues) => {
    if (isEdit) {
      const { name, description, sku, unit, type, status, minStock, maxStock } = values
      updateMutation.mutate({ name, description, sku, unit, type, status, minStock, maxStock }, { onSuccess: onClose })
      return
    }
    createMutation.mutate(values, { onSuccess: onClose })
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>
            {isEdit ? 'Edit item' : 'New item'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 min-w-0" noValidate>
          <Field label="Code *" error={fieldError('code')}>
            <Input type="text" disabled={isEdit} className="text-[13px]" {...register('code')} />
            {isEdit && (
              <p className="text-[11px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>Code can't be changed after creation.</p>
            )}
          </Field>

          <Field label="Name *" error={fieldError('name')}>
            <Input type="text" className="text-[13px]" {...register('name')} />
          </Field>

          <Field label="Description *" error={fieldError('description')}>
            {/* Textarea auto-grows with content — capped with max-h/overflow so a
                pre-existing oversized legacy value can't stretch the dialog off-screen. */}
            <Textarea rows={2} className="text-[13px] max-h-40 overflow-y-auto" {...register('description')} />
          </Field>

          <div className="grid grid-cols-2 gap-2.5">
            <Field label="SKU *" error={fieldError('sku')}>
              <Input type="text" className="text-[13px]" {...register('sku')} />
            </Field>
            <Field label="Unit *" error={fieldError('unit')}>
              <Input type="text" className="text-[13px]" {...register('unit')} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Type">
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full text-[13px]">
                      <SelectValue>{() => INVENTORY_MASTER_TYPE_LABEL[field.value]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {INVENTORY_MASTER_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{INVENTORY_MASTER_TYPE_LABEL[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
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
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Min stock" error={fieldError('minStock')}>
              <Input type="number" className="text-[13px]" {...register('minStock', { valueAsNumber: true })} />
            </Field>
            <Field label="Max stock" error={fieldError('maxStock')}>
              <Input type="number" className="text-[13px]" {...register('maxStock', { valueAsNumber: true })} />
            </Field>
          </div>

          <MutationStatusBanner mutation={mutation} errorFallback="Could not save the item — try again." showSuccess={false} />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create item'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default EditInventoryMasterModal
