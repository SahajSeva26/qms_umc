import { useState } from 'react'
import { FiCheck } from 'react-icons/fi'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { consumableItems } from '@/features/inventory/inventory.service'
import type { NewLocalProcureInput } from '@/features/inventory/inventory.service'
import type { Holder } from '@/features/inventory/inventory.types'

// ── Modal (3): Emergency local procurement — exact port of
// openLocalProcure()/saveLocalProcure(). ──────────────────────────────────
const LocalProcureModal = ({
  open, onClose, holders, presetHolder, onSave,
}: {
  open: boolean
  onClose: () => void
  holders: Holder[]
  presetHolder?: string
  onSave: (input: NewLocalProcureInput) => void | Promise<void>
}) => {
  const items = consumableItems()
  const [holder, setHolder] = useState(() => presetHolder || holders[0]?.code || '')
  const [itemId, setItemId] = useState(() => items[0]?.id || '')
  const [qty, setQty] = useState('10')
  const [cost, setCost] = useState('0')
  const [vendor, setVendor] = useState('')
  const [invoiceNo, setInvoiceNo] = useState('')
  const [reason, setReason] = useState('')

  const resetIfOpening = (isOpen: boolean) => {
    if (isOpen) {
      setHolder(presetHolder || holders[0]?.code || '')
      setItemId(items[0]?.id || '')
      setQty('10')
      setCost('0')
      setVendor('')
      setInvoiceNo('')
      setReason('')
    }
  }

  const handleSave = () => {
    onSave({
      holder, itemId,
      qty: Number(qty) || 0,
      cost: Number(cost) || 0,
      vendor, invoiceNo, reason,
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); resetIfOpening(o) }}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Emergency local procurement</DialogTitle>
          <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>Field purchase · adds to holder stock</p>
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
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Cost ₹</label>
            <Input type="number" value={cost} onChange={(e) => setCost(e.target.value)} min={0} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Vendor</label>
            <Input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Local shop" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Invoice</label>
            <Input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="Bill no" />
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Reason</label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Stockout at camp" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}><FiCheck size={14} /> Record + add to stock</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default LocalProcureModal
