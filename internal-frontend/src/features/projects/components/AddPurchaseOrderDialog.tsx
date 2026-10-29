import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { DatePicker } from '@qms/ui'
import type { ProjectEntity } from '@/types/project.types'
import { useAddProjectPurchaseOrder } from '@/features/projects/hooks/useAddProjectPurchaseOrder'
import { getApiErrorMessage } from '@/utils/apiError'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const purchaseOrderSchema = z.object({
  number: z.string().trim().min(1, 'PO number is required.'),
  date: z.string().min(1, 'PO date is required.'),
  expiry: z.string().optional(),
}).superRefine((value, ctx) => {
  if (value.expiry && value.expiry < value.date) {
    ctx.addIssue({ code: 'custom', path: ['expiry'], message: 'Expiry cannot be before the PO date.' })
  }
})

type PurchaseOrderForm = z.infer<typeof purchaseOrderSchema>
const PURCHASE_ORDER_END_MONTH = new Date(new Date().getFullYear() + 20, 11)

interface AddPurchaseOrderDialogProps {
  project: ProjectEntity
  onClose: () => void
}

const AddPurchaseOrderDialog = ({ project, onClose }: AddPurchaseOrderDialogProps) => {
  const addPurchaseOrder = useAddProjectPurchaseOrder()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { register, control, handleSubmit, formState: { errors } } = useForm<PurchaseOrderForm>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: { number: '', date: '', expiry: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null)
    try {
      await addPurchaseOrder.mutateAsync({
        projectId: project.id,
        purchaseOrder: {
          number: values.number,
          date: values.date,
          ...(values.expiry ? { expiry: values.expiry } : {}),
        },
      })
      toast.success('Purchase order added.')
      onClose()
    } catch (error) {
      setSubmitError(getApiErrorMessage(error, 'Could not confirm whether the purchase order was added. Refresh the project before retrying.'))
    }
  })

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !addPurchaseOrder.isPending) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add purchase order</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 px-5 pb-5">
          <div>
            <Label htmlFor="new-po-number">PO number *</Label>
            <Input id="new-po-number" {...register('number')} />
            {errors.number && <p className="text-[11px] mt-1 text-danger">{errors.number.message}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>PO date *</Label>
              <Controller control={control} name="date" render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} placeholder="PO date" endMonth={PURCHASE_ORDER_END_MONTH} className="w-full" />} />
              {errors.date && <p className="text-[11px] mt-1 text-danger">{errors.date.message}</p>}
            </div>
            <div>
              <Label>Expiry</Label>
              <Controller control={control} name="expiry" render={({ field }) => <DatePicker value={field.value ?? ''} onChange={field.onChange} placeholder="Expiry date" endMonth={PURCHASE_ORDER_END_MONTH} className="w-full" />} />
              {errors.expiry && <p className="text-[11px] mt-1 text-danger">{errors.expiry.message}</p>}
            </div>
          </div>
          {submitError && <p role="alert" className="text-[12px] text-danger">{submitError}</p>}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose} disabled={addPurchaseOrder.isPending}>Cancel</Button>
            <Button type="submit" disabled={addPurchaseOrder.isPending}>{addPurchaseOrder.isPending ? 'Adding…' : 'Add PO'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default AddPurchaseOrderDialog
