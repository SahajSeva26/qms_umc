import { useState } from 'react'
import { FiSave, FiInfo } from 'react-icons/fi'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { consumableItems } from '@/features/inventory/inventory.service'
import type { NewReportInput } from '@/features/inventory/inventory.service'
import type { Holder, IssueType } from '@/features/inventory/inventory.types'
import { ISSUE_TYPES } from '@/features/inventory/inventory.types'

// ── Modal (2): Report stock event — exact port of openReport()/saveReport(). ──
const ReportStockModal = ({
  open, onClose, holders, presetHolder, presetItem, onSave,
}: {
  open: boolean
  onClose: () => void
  holders: Holder[]
  presetHolder?: string
  presetItem?: string
  onSave: (input: NewReportInput) => void | Promise<void>
}) => {
  const items = consumableItems()
  const [holder, setHolder] = useState(() => presetHolder || holders[0]?.code || '')
  const [itemId, setItemId] = useState(() => presetItem || items[0]?.id || '')
  const [type, setType] = useState<IssueType>('CONSUMPTION')
  const [qty, setQty] = useState('1')
  const [reason, setReason] = useState('')

  const resetIfOpening = (isOpen: boolean) => {
    if (isOpen) {
      setHolder(presetHolder || holders[0]?.code || '')
      setItemId(presetItem || items[0]?.id || '')
      setType('CONSUMPTION')
      setQty('1')
      setReason('')
    }
  }

  const handleSave = () => {
    onSave({ holder, itemId, type, qty: Number(qty) || 0, reason })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); resetIfOpening(o) }}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Report stock event</DialogTitle>
          <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>Reduces the holder&apos;s allocation</p>
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
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Type</label>
            <Select value={type} onValueChange={(v) => setType((v as IssueType) ?? 'CONSUMPTION')}>
              <SelectTrigger className="w-full text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ISSUE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Quantity</label>
            <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} min={0} />
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Reason / reference</label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Camp ref, cause…" />
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs" style={{ marginTop: 8, color: 'var(--qms-text-muted)' }}>
          <FiInfo size={12} /> RETURN sends stock back to Central WH; others write it off the holder.
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}><FiSave size={14} /> Submit report</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ReportStockModal
