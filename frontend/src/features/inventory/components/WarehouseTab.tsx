import { useMemo, useState } from 'react'
import { FiHome, FiNavigation2, FiWatch as FiApple, FiTruck, FiRepeat } from 'react-icons/fi'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { toast } from '@/components/ui/sonner'
import { useWarehouse, useWarehouseNetwork } from '@/features/inventory/hooks/useInventory'
import { inr, inrShort, locOptions, locLabel } from '@/features/inventory/inventory.service'
import type { NewTransferInput } from '@/features/inventory/inventory.service'
import { CENTRAL, type WarehouseLocCode } from '@/features/inventory/inventory.types'

// Exact port of inventory-warehouse.js's tabWarehouse() + openTransfer()/
// saveTransfer(). Network model: ONE central warehouse at Head Office
// (authoritative bulk stock = item.qtyOnHand on the shared qms.inventory.items
// store) — FO field stock / Dietitian stock / In-transit are derived/display
// valuations, not separately-editable stores. Row click on the stock table
// opens the Item Master drawer (out of scope for this tab's own build — the
// call-through is a no-op stub until that feature exists).
const WarehouseTab = () => {
  const warehouse = useWarehouse()
  const { people, dietitians, transfers, saveTransfer } = warehouse
  const network = useWarehouseNetwork(warehouse)

  // WH.locFilter — exact port of the prototype's module-level mutable state.
  // Toggling a location card sets .active visual state only; per the
  // prototype's own dead-code path, it does NOT filter the stock table below
  // (no consumer of locFilter besides the card's own active class).
  const [locFilter, setLocFilter] = useState<WarehouseLocCode | 'ALL'>('ALL')
  const [transferOpen, setTransferOpen] = useState(false)

  const lowN = useMemo(
    () => network.stock.filter((it) => (it.qtyOnHand || 0) <= (it.reorderLevel || 0)).length,
    [network.stock],
  )
  const inTransitCount = useMemo(() => transfers.filter((t) => t.status === 'IN_TRANSIT').length, [transfers])

  const toggleLoc = (code: WarehouseLocCode) => setLocFilter((cur) => (cur === code ? 'ALL' : code))

  const handleCreateTransfer = async (input: NewTransferInput) => {
    if (input.from === input.to) {
      toast.error('Pick different source and destination')
      return
    }
    if (!input.qty) {
      toast.error('Enter quantity')
      return
    }
    const t = await saveTransfer(input)
    setTransferOpen(false)
    toast.success(`Transfer raised · ${locLabel(input.from, people)} → ${locLabel(input.to, people)}`)
    void t
  }

  return (
    <div>
      {/* .wh-loc — 4-card network-location strip; collapses to 2 cols under 900px */}
      <div className="grid grid-cols-2 min-[900px]:grid-cols-4 gap-2.5 mb-3.5">
        <LocCard
          active={locFilter === 'CENTRAL'}
          icon={<FiHome size={13} />}
          color="var(--qms-brand)"
          label="Central WH · HO"
          value={inrShort(network.central)}
          sub={`${network.stock.length} SKUs in bulk`}
          onClick={() => toggleLoc('CENTRAL')}
        />
        <LocCard
          active={locFilter === 'FO'}
          icon={<FiNavigation2 size={13} />}
          color="var(--qms-teal)"
          label="FO field stock"
          value={inrShort(network.foVal)}
          sub={`${network.fos.length} field officers`}
          onClick={() => toggleLoc('FO')}
        />
        <LocCard
          active={locFilter === 'DIET'}
          icon={<FiApple size={13} />}
          color="#10b981"
          label="Dietitian stock"
          value={inrShort(network.dietVal)}
          sub={`${dietitians.length} dietitians`}
          onClick={() => toggleLoc('DIET')}
        />
        <LocCard
          active={locFilter === 'TRANSIT'}
          icon={<FiTruck size={13} />}
          color="#f59e0b"
          label="In-transit"
          value={inrShort(network.transit)}
          sub={`${inTransitCount} shipments`}
          onClick={() => toggleLoc('TRANSIT')}
        />
      </div>

      {/* .inv-filter — sticky header bar */}
      <div
        className="flex gap-2 items-center flex-wrap mb-3 rounded-[10px] border sticky z-25"
        style={{ padding: '10px 12px', background: 'var(--qms-surface)', borderColor: 'var(--qms-border)', top: 60 }}
      >
        <span
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[.04em]"
          style={{ color: 'var(--qms-text-muted)' }}
        >
          <FiHome size={13} /> Central Warehouse · Head Office
        </span>
        <span className="text-xs ml-auto" style={{ color: 'var(--qms-text-muted)' }}>
          {network.stock.length} SKUs · {inrShort(network.central)} bulk value · {lowN} below reorder
        </span>
        <Button onClick={() => setTransferOpen(true)}>
          <FiRepeat size={14} /> New transfer
        </Button>
      </div>

      {/* .inv-card padding:0;overflow:auto — Central Warehouse stock table */}
      <div className="rounded-2xl border overflow-auto" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <table className="border-collapse text-xs" style={{ width: '100%', minWidth: 720 }}>
          <thead>
            <tr>
              {['Code', 'Item', 'Type', 'Central on hand', 'Reorder', 'Value', 'Status'].map((h, i) => (
                <th
                  key={h}
                  className={`text-left font-bold uppercase tracking-[.04em] ${i >= 3 && i <= 5 ? 'text-right' : ''}`}
                  style={{ padding: '8px 6px', fontSize: 10, color: 'var(--qms-text-muted)', borderBottom: '1px dashed var(--qms-border)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {network.stock.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center" style={{ padding: 24, color: 'var(--qms-text-muted)' }}>
                  No stock items.
                </td>
              </tr>
            ) : (
              network.stock.map((it) => {
                const value = (it.qtyOnHand || 0) * (it.purchaseCost || 0)
                const low = (it.qtyOnHand || 0) <= (it.reorderLevel || 0)
                return (
                  <tr
                    key={it.id}
                    className="cursor-pointer hover:bg-[rgba(59,109,255,.03)]"
                    onClick={() => openItemMasterDrawer(it.id)}
                  >
                    <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)' }}>
                      <b style={{ color: 'var(--qms-text)' }}>{it.code || '—'}</b>
                    </td>
                    <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>{it.name}</td>
                    <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text-soft)' }}>{it.itemType}</td>
                    <td className="text-right tabular-nums" style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>
                      {it.qtyOnHand ?? 0} {it.uom || ''}
                    </td>
                    <td className="text-right tabular-nums" style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>
                      {it.reorderLevel ?? '—'}
                    </td>
                    <td className="text-right tabular-nums" style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>
                      {inr(value)}
                    </td>
                    <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)' }}>
                      {low ? (
                        <StatusPill bg="rgba(245,158,11,.16)" fg="#b45309" label="Below reorder" />
                      ) : (
                        <StatusPill bg="rgba(16,185,129,.15)" fg="#059669" label="OK" />
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <NewTransferModal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        items={network.stock}
        locs={locOptions(people)}
        onSave={handleCreateTransfer}
      />
    </div>
  )
}

// Row click on the Central Warehouse stock table opens the Item Master
// drawer (window.QMS_InvMasters.openItem(it.id) in the prototype) — that
// feature is a separate build task, so the call-through is a no-op stub
// until it exists, matching the task boundary ("wire the onclick call-through
// if the Item Master feature exists; otherwise a no-op/TODO is acceptable").
function openItemMasterDrawer(_itemId: string): void {
  // TODO: wire to the Item Master drawer once that feature is built.
}

function LocCard({
  active, icon, color, label, value, sub, onClick,
}: {
  active: boolean
  icon: React.ReactNode
  color: string
  label: string
  value: string
  sub: string
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      className="relative overflow-hidden cursor-pointer transition-[border-color,transform] duration-150 hover:-translate-y-0.5"
      style={{
        padding: '13px 14px',
        borderRadius: 12,
        background: 'var(--qms-surface)',
        border: `1px solid ${active ? color : 'var(--qms-border)'}`,
        boxShadow: active ? `inset 0 0 0 1px ${color}` : 'none',
      }}
    >
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.03em]" style={{ color: 'var(--qms-text-muted)' }}>
        <span className="grid place-items-center text-white" style={{ width: 24, height: 24, borderRadius: 7, background: color }}>
          {icon}
        </span>
        {label}
      </div>
      <div className="mt-1.5 font-extrabold" style={{ fontSize: 20, color: 'var(--qms-text)' }}>{value}</div>
      <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{sub}</div>
    </div>
  )
}

function StatusPill({ bg, fg, label }: { bg: string; fg: string; label: string }) {
  return (
    <span
      className="inline-flex items-center font-bold uppercase tracking-[.03em] rounded-full"
      style={{ padding: '2px 8px', fontSize: 10, background: bg, color: fg }}
    >
      {label}
    </span>
  )
}

// New-transfer modal — exact port of window.QMS_InvWh.openTransfer()/
// saveTransfer() (inventory-warehouse.js:294-332). Shared by both the
// Warehouse tab's own "New transfer" button (no preset) and the Transfers
// tab's Emergency Balancing panel (a preset payload) — this component takes
// an optional preset so both call sites reuse it identically; the Transfers
// tab spec documents its own preset-passing call site, not duplicated here.
function NewTransferModal({
  open, onClose, items, locs, onSave, preset,
}: {
  open: boolean
  onClose: () => void
  items: { id: string; name: string; qtyOnHand?: number | null }[]
  locs: { code: string; label: string }[]
  onSave: (input: NewTransferInput) => void | Promise<void>
  preset?: { itemId?: string; from?: string; to?: string; qty?: number }
}) {
  const defaultFrom = preset?.from || CENTRAL
  const defaultTo = preset?.to || (locs[1]?.code ?? CENTRAL)
  const defaultItem = preset?.itemId || items[0]?.id || ''

  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(defaultTo)
  const [itemId, setItemId] = useState(defaultItem)
  const [qty, setQty] = useState(String(preset?.qty ?? 20))
  const [courier, setCourier] = useState('150')
  const [freight, setFreight] = useState('100')
  const [packaging, setPackaging] = useState('50')
  const [handling, setHandling] = useState('40')
  const [notes, setNotes] = useState('')

  // Reset the form to its defaults every time the modal (re)opens — mirrors
  // the prototype rebuilding the modal body's DOM from scratch on each
  // openTransfer() call.
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
          <Button onClick={handleSave}><FiRepeat size={13} /> Create transfer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FieldNum({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>{label}</label>
      <Input type="number" value={value} onChange={(e) => onChange(e.target.value)} min={0} />
    </div>
  )
}

export default WarehouseTab
