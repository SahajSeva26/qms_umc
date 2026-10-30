import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { DatePicker } from '@qms/ui'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import FieldLabel from '@/components/ui/FieldLabel'
import MutationStatusBanner from '@/components/ui/MutationStatusBanner'
import { useUpdateInventoryDevice } from '@/features/inventory/real/hooks/useUpdateInventoryDevice'
import {
  completeDeviceCalibrationSchema,
  type CompleteDeviceCalibrationFormValues,
} from '@/features/inventory/real/schemas/inventoryDevice.schemas'
import type { InventoryDeviceEntity } from '@/types/inventoryDevice.types'

const today = () => format(new Date(), 'yyyy-MM-dd')
const CALIBRATION_START_MONTH = new Date(new Date().getFullYear() - 10, 0)
const CALIBRATION_END_MONTH = new Date(new Date().getFullYear() + 10, 11)

interface MarkDeviceCalibratedModalProps {
  device: InventoryDeviceEntity
  onClose: () => void
}

const MarkDeviceCalibratedModal = ({ device, onClose }: MarkDeviceCalibratedModalProps) => {
  const mutation = useUpdateInventoryDevice(device.id)
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CompleteDeviceCalibrationFormValues>({
    resolver: zodResolver(completeDeviceCalibrationSchema),
    defaultValues: {
      lastCalibrationDate: today(),
      nextCalibrationDate: '',
    },
  })

  const onSubmit = (values: CompleteDeviceCalibrationFormValues) => {
    mutation.mutate(values, { onSuccess: onClose })
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !mutation.isPending) onClose() }}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>Mark calibration complete</DialogTitle>
        </DialogHeader>

        <div className="rounded-xl border px-3 py-2 text-[12px]" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-strong)' }}>
          <div className="font-semibold" style={{ color: 'var(--qms-text)' }}>{device.item.name ?? device.item.id}</div>
          <div className="font-mono" style={{ color: 'var(--qms-text-muted)' }}>{device.serialNumber}</div>
        </div>

        <p className="text-[12px] leading-5" style={{ color: 'var(--qms-text-muted)' }}>
          This records the completed calibration and its next due date.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <FieldLabel>Calibration completed *</FieldLabel>
            <Controller
              control={control}
              name="lastCalibrationDate"
              render={({ field }) => (
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  className="w-full"
                  startMonth={CALIBRATION_START_MONTH}
                  endMonth={CALIBRATION_END_MONTH}
                />
              )}
            />
            {errors.lastCalibrationDate && <p className="text-[11px] mt-1 text-danger">{errors.lastCalibrationDate.message}</p>}
          </div>

          <div>
            <FieldLabel>Next calibration due *</FieldLabel>
            <Controller
              control={control}
              name="nextCalibrationDate"
              render={({ field }) => (
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  className="w-full"
                  startMonth={CALIBRATION_START_MONTH}
                  endMonth={CALIBRATION_END_MONTH}
                />
              )}
            />
            {errors.nextCalibrationDate && <p className="text-[11px] mt-1 text-danger">{errors.nextCalibrationDate.message}</p>}
          </div>

          <MutationStatusBanner mutation={mutation} errorFallback="Could not record the calibration — try again." showSuccess={false} />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Mark done'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default MarkDeviceCalibratedModal
