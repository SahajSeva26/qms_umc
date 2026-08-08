import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import type { NewTransferInput } from '@/features/inventory/inventory.service'
import { CENTRAL } from '@/features/inventory/inventory.types'

// New/Balance Transfer modal — exact port of window.QMS_InvWh.openTransfer()/
// saveTransfer() (inventory-warehouse.js:294-332). Previously reimplemented
// verbatim in both WarehouseTab.tsx (its own "New transfer" button, no
// preset) and TransfersTab.tsx (the Emergency Balancing panel's preset
// payload) — consolidated here so both share one implementation instead of
// two independently-maintained copies. `preset` (optional) prefills
// itemId/from/to/qty when opened with a specific suggestion; `submitIcon`
// preserves each caller's own exact submit-button icon (lucide's Plus for
// Transfers, react-icons' FiRepeat for Warehouse) so neither call site's
// visual output changes.
export function NewTransferModal({
  open, onClose, items, locs, onSave, preset, submitIcon,
}: {
  open: boolean
  onClose: () => void
  items: { id: string; name: string; qtyOnHand?: number | null }[]
  locs: { code: string; label: string }[]
  onSave: (input: NewTransferInput) => void | Promise<void>
  preset?: { itemId?: string; from?: string; to?: string; qty?: number }
  submitIcon: React.ReactNode
}) {
  const defaultFrom = () => preset?.from || CENTRAL
  const defaultTo = () => preset?.to || (locs[1]?.code ?? CENTRAL)
  const defaultItem = () => preset?.itemId || items[0]?.id || ''

  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(defaultTo)
  const [itemId, setItemId] = useState(defaultItem)
  const [qty, setQty] = useState(String(preset?.qty ?? 20))
  const [courier, setCourier] = useState('150')
  const [freight, setFreight] = useState('100')
  const [packaging, setPackaging] = useState('50')
  const [handling, setHandling] = useState('40')
  const [notes, setNotes] = useState('')

  // Rebuild the form to its defaults every time the modal (re)opens — mirrors
  // the prototype rebuilding the modal body's DOM from scratch on each
  // openTransfer() call (so a fresh preset from the balancing panel always
  // takes effect even if the modal was previously open with different values).
  const resetIfOpening = (isOpen: boolean) => {
    if (isOpen) {
      setFrom(preset?.from || CENTRAL)
      setTo(preset?.to || (locs[1]?.code ?? CENTRAL))
      setItemId(preset?.itemId || items[0]?.id || '')
      setQty(String(preset?.qty ?? 20))
      setCourier('150'); setFreight('100'); setPackaging('50'); setHandling('40'); setNotes('')
    }
  }

  const handleSave = () => {
    onSave({
      from, to, itemId,
      qty: Number(qty) || 0,
      courier: Number(courier) || 0,
      freight: Number(freight) || 0,
      packaging: Number(packaging) || 0,
      handling: Number(handling) || 0,
      notes,
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose()
        resetIfOpening(o)
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New stock transfer</DialogTitle>
          <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>Move stock between Central WH, FOs and dietitians</p>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 text-[13px]">
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>From</label>
            <Select value={from} onValueChange={(v) => setFrom(v ?? CENTRAL)}>
              <SelectTrigger className="w-full text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {locs.map((l) => <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>To</label>
            <Select value={to} onValueChange={(v) => setTo(v ?? CENTRAL)}>
              <SelectTrigger className="w-full text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {locs.map((l) => <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Item</label>
            <Select value={itemId} onValueChange={(v) => setItemId(v ?? '')}>
              <SelectTrigger className="w-full text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {items.map((it) => <SelectItem key={it.id} value={it.id}>{it.name} · central {it.qtyOnHand ?? 0}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <FieldNum label="Quantity" value={qty} onChange={setQty} />
          <FieldNum label="Courier ₹" value={courier} onChange={setCourier} />
          <FieldNum label="Freight ₹" value={freight} onChange={setFreight} />
          <FieldNum label="Packaging ₹" value={packaging} onChange={setPackaging} />
          <FieldNum label="Handling ₹" value={handling} onChange={setHandling} />
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Notes</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Camp ref, reason…" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>{submitIcon} Create transfer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function FieldNum({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>{label}</label>
      <Input type="number" value={value} onChange={(e) => onChange(e.target.value)} min={0} />
    </div>
  )
}
