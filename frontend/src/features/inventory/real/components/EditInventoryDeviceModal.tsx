import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ReactNode } from 'react'
import type { InventoryDeviceEntity } from '@/features/inventory/real/inventoryDevice.types'
import { INVENTORY_DEVICE_STATUS_LABEL, INVENTORY_DEVICE_STATUSES } from '@/features/inventory/real/inventoryDevice.types'
import { useCreateInventoryDevice } from '@/features/inventory/real/hooks/useCreateInventoryDevice'
import { useUpdateInventoryDevice } from '@/features/inventory/real/hooks/useUpdateInventoryDevice'
import {
  createInventoryDeviceSchema,
  updateInventoryDeviceSchema,
  type InventoryDeviceCreateFormValues,
  type InventoryDeviceUpdateFormValues,
} from '@/features/inventory/real/schemas/inventoryDevice.schemas'
import InventoryMasterItemPicker from '@/features/inventory/real/components/InventoryMasterItemPicker'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import FieldLabel from '@/components/ui/FieldLabel'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import MutationStatusBanner from '@/components/ui/MutationStatusBanner'

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

interface EditInventoryDeviceModalProps {
  // null = create mode
  device: InventoryDeviceEntity | null
  onClose: () => void
}

// No status field in create mode — backend always seeds a new device to
// 'available'. Device status itself is never permission-gated, unlike the Consumable module.
const EditInventoryDeviceModal = ({ device, onClose }: EditInventoryDeviceModalProps) => {
  const isEdit = !!device
  const createMutation = useCreateInventoryDevice()
  const updateMutation = useUpdateInventoryDevice(device?.id ?? '')

  if (isEdit) {
    return (
      <EditForm
        device={device}
        onClose={onClose}
        mutation={updateMutation}
      />
    )
  }

  return <CreateForm onClose={onClose} mutation={createMutation} />
}

const CreateForm = ({ onClose, mutation }: { onClose: () => void; mutation: ReturnType<typeof useCreateInventoryDevice> }) => {
  // AsyncPicker is a controlled display component — it doesn't remember the
  // label of what it resolved the id to, so the selected item's display text
  // has to be held here alongside the form's own `item` id field.
  const [itemLabel, setItemLabel] = useState('')

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, touchedFields, isSubmitted },
  } = useForm<InventoryDeviceCreateFormValues>({
    resolver: zodResolver(createInventoryDeviceSchema),
    mode: 'onChange',
    defaultValues: {
      item: '',
      serialNumber: '',
      manufacturingDate: '',
      warrantyExpiryDate: '',
      lastCalibrationDate: '',
      nextCalibrationDate: '',
    },
  })

  const fieldError = (field: keyof InventoryDeviceCreateFormValues) =>
    (touchedFields[field] || isSubmitted) ? errors[field]?.message : undefined

  const onSubmit = (values: InventoryDeviceCreateFormValues) => {
    mutation.mutate(
      {
        item: values.item,
        serialNumber: values.serialNumber,
        manufacturingDate: values.manufacturingDate || undefined,
        warrantyExpiryDate: values.warrantyExpiryDate || undefined,
        lastCalibrationDate: values.lastCalibrationDate || undefined,
        nextCalibrationDate: values.nextCalibrationDate || undefined,
      },
      { onSuccess: onClose },
    )
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>New device</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 min-w-0" noValidate>
          <Field label="Catalog item *" error={fieldError('item')}>
            <Controller
              control={control}
              name="item"
              render={({ field }) => (
                <InventoryMasterItemPicker
                  type="device"
                  value={field.value}
                  label={itemLabel}
                  onChange={(id, label) => { field.onChange(id); setItemLabel(label) }}
                />
              )}
            />
          </Field>

          <Field label="Serial number *" error={fieldError('serialNumber')}>
            <Input type="text" className="text-[13px]" {...register('serialNumber')} />
          </Field>

          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Manufacturing date">
              <Input type="date" className="text-[13px]" {...register('manufacturingDate')} />
            </Field>
            <Field label="Warranty expiry">
              <Input type="date" className="text-[13px]" {...register('warrantyExpiryDate')} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Last calibration">
              <Input type="date" className="text-[13px]" {...register('lastCalibrationDate')} />
            </Field>
            <Field label="Next calibration">
              <Input type="date" className="text-[13px]" {...register('nextCalibrationDate')} />
            </Field>
          </div>

          <MutationStatusBanner mutation={mutation} errorFallback="Could not save the device — try again." showSuccess={false} />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Create device'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const EditForm = ({
  device, onClose, mutation,
}: {
  device: InventoryDeviceEntity
  onClose: () => void
  mutation: ReturnType<typeof useUpdateInventoryDevice>
}) => {
  const {
    register,
    handleSubmit,
    control,
  } = useForm<InventoryDeviceUpdateFormValues>({
    resolver: zodResolver(updateInventoryDeviceSchema),
    mode: 'onChange',
    defaultValues: {
      manufacturingDate: device.manufacturingDate?.slice(0, 10) ?? '',
      warrantyExpiryDate: device.warrantyExpiryDate?.slice(0, 10) ?? '',
      lastCalibrationDate: device.lastCalibrationDate?.slice(0, 10) ?? '',
      nextCalibrationDate: device.nextCalibrationDate?.slice(0, 10) ?? '',
      status: device.status,
    },
  })

  const onSubmit = (values: InventoryDeviceUpdateFormValues) => {
    mutation.mutate(
      {
        manufacturingDate: values.manufacturingDate || undefined,
        warrantyExpiryDate: values.warrantyExpiryDate || undefined,
        lastCalibrationDate: values.lastCalibrationDate || undefined,
        nextCalibrationDate: values.nextCalibrationDate || undefined,
        status: values.status,
      },
      { onSuccess: onClose },
    )
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>Edit device</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 min-w-0" noValidate>
          <ReadOnlyField label="Catalog item" value={device.item.name ? `${device.item.name} (${device.item.code})` : device.item.id} />
          <ReadOnlyField label="Serial number" value={device.serialNumber} />

          <Field label="Status">
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full text-[13px]">
                    <SelectValue>{() => INVENTORY_DEVICE_STATUS_LABEL[field.value]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {INVENTORY_DEVICE_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{INVENTORY_DEVICE_STATUS_LABEL[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Manufacturing date">
              <Input type="date" className="text-[13px]" {...register('manufacturingDate')} />
            </Field>
            <Field label="Warranty expiry">
              <Input type="date" className="text-[13px]" {...register('warrantyExpiryDate')} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Last calibration">
              <Input type="date" className="text-[13px]" {...register('lastCalibrationDate')} />
            </Field>
            <Field label="Next calibration">
              <Input type="date" className="text-[13px]" {...register('nextCalibrationDate')} />
            </Field>
          </div>

          <MutationStatusBanner mutation={mutation} errorFallback="Could not save the device — try again." showSuccess={false} />

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

export default EditInventoryDeviceModal
