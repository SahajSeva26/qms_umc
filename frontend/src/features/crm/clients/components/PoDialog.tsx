import { useState } from 'react'
import type {
  ClientProject,
  PoConfirmationType,
  PoStatus,
  PurchaseOrder,
} from '@/types/client.types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import DatePicker from '@/components/ui/DatePicker'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { poSchema } from '@/features/crm/clients/schemas'

interface PoDialogProps {
  /** Division's projects — the PO attaches to one of them */
  projects: ClientProject[]
  /** Present when modifying an existing PO (dialog opens pre-filled) */
  editing: { projectId: string; po: PurchaseOrder } | null
  onClose: () => void
  onSave: (projectId: string, po: PurchaseOrder, isEdit: boolean) => void | Promise<void>
}

const FieldLabel = ({ children }: { children: string }) => (
  <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>
    {children}
  </Label>
)

const PoDialog = ({ projects, editing, onClose, onSave }: PoDialogProps) => {
  const [projectId, setProjectId] = useState(editing?.projectId ?? projects[0]?.id ?? '')
  const [poNo, setPoNo] = useState(editing?.po.poNo ?? '')
  const [confirmationType, setConfirmationType] = useState<PoConfirmationType>(editing?.po.confirmationType ?? 'PO')
  const [poDate, setPoDate] = useState(editing?.po.poDate ?? '')
  const [poExpiry, setPoExpiry] = useState(editing?.po.poExpiry ?? '')
  const [campCount, setCampCount] = useState(editing ? String(editing.po.campCount) : '')
  const [value, setValue] = useState(editing ? String(editing.po.value) : '')
  const [status, setStatus] = useState<PoStatus>(editing?.po.status ?? 'ACTIVE')
  const [error, setError] = useState<string | null>(null)

  const editingProject = editing ? projects.find((p) => p.id === editing.projectId) : null

  const handleSave = async () => {
    if (!projectId) {
      setError('Select a project for this PO.')
      return
    }
    const result = poSchema.safeParse({ poNo, confirmationType, poDate, poExpiry, campCount, value, status })
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Please review the PO fields.')
      return
    }
    const po: PurchaseOrder = {
      id: editing ? editing.po.id : `po-${Date.now()}`,
      poNo: result.data.poNo,
      confirmationType: result.data.confirmationType,
      poDate: result.data.poDate,
      poExpiry: result.data.poExpiry || undefined,
      campCount: result.data.campCount,
      value: result.data.value,
      status: result.data.status,
    }
    await onSave(projectId, po, !!editing)
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>
            {editing ? 'Modify purchase order' : 'Add purchase order'}
          </DialogTitle>
        </DialogHeader>

        <div>
          <FieldLabel>Project *</FieldLabel>
          {editing ? (
            <p className="text-[13px] font-medium" style={{ color: 'var(--qms-text)' }}>
              {editingProject ? `${editingProject.id} · ${editingProject.name}` : editing.projectId}
            </p>
          ) : (
            <Select value={projectId} onValueChange={(v) => { setProjectId(v as string); setError(null) }}>
              <SelectTrigger className="w-full text-[13px]"><SelectValue placeholder="Select project" /></SelectTrigger>
              <SelectContent>
                {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.id} · {p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>PO number *</FieldLabel>
            <Input value={poNo} onChange={(e) => { setPoNo(e.target.value); setError(null) }} placeholder="PO/SUN/2026/0001" className="text-[13px]" />
          </div>
          <div>
            <FieldLabel>Confirmation type</FieldLabel>
            <Select value={confirmationType} onValueChange={(v) => setConfirmationType(v as PoConfirmationType)}>
              <SelectTrigger className="w-full text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PO">PO</SelectItem>
                <SelectItem value="AGREEMENT">Agreement</SelectItem>
                <SelectItem value="MAIL">Mail</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel>PO date *</FieldLabel>
            <DatePicker value={poDate} onChange={(iso) => { setPoDate(iso); setError(null) }} placeholder="PO date" className="w-full text-[13px]" />
          </div>
          <div>
            <FieldLabel>PO expiry</FieldLabel>
            <DatePicker value={poExpiry} onChange={setPoExpiry} placeholder="Expiry (optional)" className="w-full text-[13px]" />
          </div>
          <div>
            <FieldLabel>Camp count</FieldLabel>
            <Input type="number" min={0} value={campCount} onChange={(e) => { setCampCount(e.target.value); setError(null) }} placeholder="0" className="text-[13px]" />
          </div>
          <div>
            <FieldLabel>Value (INR)</FieldLabel>
            <Input type="number" min={0} value={value} onChange={(e) => { setValue(e.target.value); setError(null) }} placeholder="0" className="text-[13px]" />
          </div>
          <div>
            <FieldLabel>Status</FieldLabel>
            <Select value={status} onValueChange={(v) => setStatus(v as PoStatus)}>
              <SelectTrigger className="w-full text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && <p className="text-[11px] text-danger">{error}</p>}

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>{editing ? 'Save changes' : 'Add PO'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default PoDialog
