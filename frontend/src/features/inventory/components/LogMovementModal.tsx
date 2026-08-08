import { useMemo, useState } from 'react'
import { Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { toast } from '@/components/ui/sonner'
import { useLogMovement } from '@/features/inventory/hooks/useInventory'
import { MOVEMENT_TYPE_OPTIONS, movementTypeMeta } from '@/features/inventory/inventory.types'
import type { MovementType, InventoryUnit } from '@/features/inventory/inventory.types'
import type { LogMovementInput } from '@/features/inventory/inventory.service'
import { movementSchema } from '@/features/inventory/schemas/movement.schema'
import { todayIso } from '@/features/inventory/utils/date'

const inputCls = 'w-full rounded-lg border text-xs px-2.5 py-1.5'
const inputStyle = { borderColor: 'var(--qms-border)', background: 'var(--qms-surface-input)', color: 'var(--qms-text)' }

const Field = ({ label, children, full = false }: { label: string; children: React.ReactNode; full?: boolean }) => (
  <div className={full ? 'col-span-2' : ''}>
    <label className="block text-xs font-bold mb-1" style={{ color: 'var(--qms-text-muted)' }}>{label}</label>
    {children}
  </div>
)

const blankForm = (): LogMovementInput => ({
  type: 'HANDOVER',
  date: todayIso(),
  unitId: '',
  from: '',
  to: '',
  notes: '',
})

// window.invNewMovement() (inventory.js:789-876) — the SAME "Log inventory
// movement" modal reachable from both the Movements tab's own "+ Log
// movement" button AND, per pages/inventory.html:32, the shared page-head
// "New transfer" button on EVERY tab (the prototype's own label is a slight
// misnomer — it opens this modal, not the Transfer modal in
// TransfersTab.tsx/WarehouseTab.tsx). Extracted out of MovementsTab.tsx into
// its own controlled (open/onClose) component so InventoryPage.tsx can wire
// it to the page-head button without duplicating the form.
interface LogMovementModalProps {
  open: boolean
  onClose: () => void
  units: InventoryUnit[]
}

const LogMovementModal = ({ open, onClose, units }: LogMovementModalProps) => {
  const { logMovement } = useLogMovement()

  const [form, setForm] = useState<LogMovementInput>(blankForm)
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof LogMovementInput>(k: K, v: LogMovementInput[K]) => setForm((f) => ({ ...f, [k]: v }))

  // Unit select options — first 100 units as '<serial> · <deviceType> ·
  // <location-or-assignee-name-or-—>' — exact port of invNewMovement()'s
  // <select id="mv-unit"> option builder (inventory.js:805-808).
  const unitOptions = useMemo(() => units.slice(0, 100).map((u) => ({
    id: u.id,
    label: `${u.sn} · ${u.deviceType} · ${u.location || u.assignedTo || '—'}`,
  })), [units])

  const resetIfOpening = (isOpen: boolean) => {
    if (isOpen) setForm({ ...blankForm(), unitId: unitOptions[0]?.id ?? '' })
  }

  const handleSave = async () => {
    const result = movementSchema.safeParse(form)
    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? 'Please check the highlighted fields')
      return
    }
    setSaving(true)
    try {
      const { movement } = await logMovement(form, units)
      onClose()
      toast.success(`Movement ${movement.id} logged · ${movementTypeMeta(movement.type).label}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not log movement')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); resetIfOpening(o) }}>
      <DialogContent className="max-w-[640px] w-[92vw] sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Log inventory movement</DialogTitle>
          <DialogDescription>Handover · Return · Transfer · Calibration · Procurement</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <select
              className={inputCls}
              style={inputStyle}
              value={form.type}
              onChange={(e) => set('type', e.target.value as MovementType)}
            >
              {MOVEMENT_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Date">
            <input type="date" className={inputCls} style={inputStyle} value={form.date} onChange={(e) => set('date', e.target.value)} />
          </Field>
          <Field label="Unit (serial)" full>
            <select
              className={inputCls}
              style={inputStyle}
              value={form.unitId}
              onChange={(e) => set('unitId', e.target.value)}
            >
              {unitOptions.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="From">
            <input className={inputCls} style={inputStyle} placeholder="Hub or FO name" value={form.from} onChange={(e) => set('from', e.target.value)} />
          </Field>
          <Field label="To">
            <input className={inputCls} style={inputStyle} placeholder="Hub or FO name" value={form.to} onChange={(e) => set('to', e.target.value)} />
          </Field>
          <Field label="Notes" full>
            <textarea
              className={inputCls}
              style={inputStyle}
              rows={2}
              placeholder="Camp ID, project, reason..."
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onClose()}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save size={14} /> Log movement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default LogMovementModal
