import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { useCreateBrand } from '@/features/crm/brands/hooks/useCreateBrand'
import { useUpdateBrand } from '@/features/crm/brands/hooks/useUpdateBrand'
import { createBrandSchema, updateBrandSchema } from '@/features/crm/brands/schemas/brand.schemas'
import type { BrandEntity, BrandStatus } from '@/types/brand.types'

const STATUS_OPTIONS: { value: BrandStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

interface EditBrandModalProps {
  open: boolean
  // null = create mode
  brand: BrandEntity | null
  divisionId: string
  canManage: boolean
  onClose: () => void
}

const EditBrandModal = ({ open, brand, divisionId, canManage, onClose }: EditBrandModalProps) => {
  if (!open) return null
  return brand
    ? <EditForm brand={brand} canManage={canManage} onClose={onClose} />
    : <CreateForm divisionId={divisionId} onClose={onClose} />
}

const CreateForm = ({ divisionId, onClose }: { divisionId: string; onClose: () => void }) => {
  const createBrand = useCreateBrand()
  const [name, setName] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const handleSave = () => {
    const result = createBrandSchema.safeParse({ division: divisionId, name })
    if (!result.success) {
      setFormError(result.error.issues[0]?.message ?? 'Please complete the required fields.')
      return
    }
    setFormError(null)
    createBrand.mutate(result.data, { onSuccess: onClose })
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-sm" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>New brand</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
              Name *
            </Label>
            <Input type="text" value={name} onChange={(e) => setName(e.target.value)} className="text-[13px]" autoFocus />
          </div>

          {createBrand.isError && (
            <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
              {(createBrand.error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Could not create the brand — try again.'}
            </div>
          )}

          {formError && (
            <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={createBrand.isPending}>
              {createBrand.isPending ? 'Creating…' : 'Create brand'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const EditForm = ({ brand, canManage, onClose }: { brand: BrandEntity; canManage: boolean; onClose: () => void }) => {
  const updateBrand = useUpdateBrand(brand.id)
  const [status, setStatus] = useState<BrandStatus>(brand.status)
  const [formError, setFormError] = useState<string | null>(null)

  const handleSave = () => {
    const result = updateBrandSchema.safeParse({ status })
    if (!result.success) {
      setFormError(result.error.issues[0]?.message ?? 'Please complete the required fields.')
      return
    }
    setFormError(null)
    const data = result.data
    // Diff against the original snapshot (not "was ever touched") so a
    // reverted edit is never resent — same pattern as EditDivisionModal.tsx.
    const payload: typeof data = {
      ...(data.status !== undefined && data.status !== brand.status ? { status: data.status } : {}),
    }
    updateBrand.mutate(payload, { onSuccess: onClose })
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-sm" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>Edit brand</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
              Name
            </Label>
            {/* Immutable — the backend derives `code` from `name` once at create and
                never recomputes it, so a rename here would silently desync the two. */}
            <div
              className="h-8 min-w-0 flex items-center rounded-lg border px-2.5 text-[13px]"
              style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)', background: 'var(--qms-surface-strong)' }}
              title={brand.name}
            >
              <span className="truncate">{brand.name}</span>
            </div>
          </div>

          {canManage && (
            <div>
              <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                Status
              </Label>
              <Select value={status} onValueChange={(v) => setStatus(v as BrandStatus)}>
                <SelectTrigger className="w-full text-[13px]">
                  <SelectValue>{(v: string) => STATUS_OPTIONS.find((s) => s.value === v)?.label ?? 'Status'}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {!canManage && (
            <p className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
              You don't have permission to edit this brand.
            </p>
          )}

          {updateBrand.isError && (
            <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
              {(updateBrand.error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Could not update the brand — try again.'}
            </div>
          )}

          {formError && (
            <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            {canManage && (
              <Button onClick={handleSave} disabled={updateBrand.isPending}>
                {updateBrand.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default EditBrandModal
