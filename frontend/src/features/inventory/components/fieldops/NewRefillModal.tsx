import { useState } from 'react'
import { FiSave } from 'react-icons/fi'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { consumableItems } from '@/features/inventory/inventory.service'
import type { NewRefillInput } from '@/features/inventory/inventory.service'
import type { Holder } from '@/features/inventory/inventory.types'

// ── Modal (1): New refill request — exact port of openRefill()/saveRefill(). ──
const NewRefillModal = ({
  open, onClose, holders, presetHolder, onSave,
}: {
  open: boolean
  onClose: () => void
  holders: Holder[]
  presetHolder?: string
  onSave: (input: NewRefillInput) => void | Promise<void>
}) => {
  const items = consumableItems()
  const defaultHolder = () => presetHolder || holders[0]?.code || ''
  const [holder, setHolder] = useState(defaultHolder)
  const [itemId, setItemId] = useState(() => items[0]?.id || '')
  const [qty, setQty] = useState('20')
  const [reason, setReason] = useState('')

  const resetIfOpening = (isOpen: boolean) => {
    if (isOpen) {
      setHolder(presetHolder || holders[0]?.code || '')
      setItemId(items[0]?.id || '')
      setQty('20')
      setReason('')
    }
  }

  const handleSave = () => {
    onSave({ holder, itemId, qty: Number(qty) || 0, reason })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); resetIfOpening(o) }}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New refill request</DialogTitle>
          <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>Field stock replenishment</p>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 text-[13px]">
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Holder</label>
            <Select value={holder} onValueChange={(v) => setHolder(v ?? '')}>
              <SelectTrigger className="w-full text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {holders.map((h) => <SelectItem key={h.code} value={h.code}>{h.kind} · {h.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Item</label>
            <Select value={itemId} onValueChange={(v) => setItemId(v ?? '')}>
              <SelectTrigger className="w-full text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {items.map((it) => <SelectItem key={it.id} value={it.id}>{it.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Quantity</label>
            <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} min={0} />
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Reason</label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Low stock / upcoming camp" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}><FiSave size={14} /> Raise request</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default NewRefillModal
