import { useMemo, useState } from 'react'
import {
  Wallet, Package, Tent, User, GitCompare, ArrowRight, Plus, Truck, PackageCheck, Check, Info,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/sonner'
import {
  useTransfers, useTransfersRollup, useBalancingSuggestions,
} from '@/features/inventory/hooks/useInventory'
import { inr, inrShort, locOptions, locLabel, nextPodRef } from '@/features/inventory/inventory.service'
import type { NewTransferInput, DeliverPodInput } from '@/features/inventory/inventory.service'
import { CENTRAL } from '@/features/inventory/inventory.types'
import type { Transfer, TransferStatus, BalancingSuggestion } from '@/features/inventory/inventory.types'
import type { Person } from '@/types/people.types'
import { transferSchema } from '@/features/inventory/schemas/transfer.schema'
import { transferDeliverPodSchema } from '@/features/inventory/schemas/transferDeliverPod.schema'
import { sortByDateDesc } from '@/features/inventory/utils/sort'
import { todayIso } from '@/features/inventory/utils/date'
import { TableEmptyRow, InvFilterBar } from '@/features/inventory/components/IntelTableUi'
import { NewTransferModal } from '@/features/inventory/components/NewTransferModal'

// Exact port of window.QMS_InvWh.tabTransfers() (inventory-warehouse.js:218-
// 377) — the logistics rollup strip, Emergency stock-balancing panel and the
// main transfers table with dispatch/deliver+POD action flows. Reuses the
// same qms.inventory.transfers/items stores as the Warehouse tab's own "New
// transfer" entry point (useTransfers() shares those query keys).
const TransfersTab = () => {
  const data = useTransfers()
  const { people, items, transfers, saveTransfer, dispatchTransfer, saveDeliver } = data
  const rollup = useTransfersRollup(transfers)
  const suggestions = useBalancingSuggestions(people)

  const [transferOpen, setTransferOpen] = useState(false)
  const [transferPreset, setTransferPreset] = useState<{ itemId?: string; from?: string; to?: string; qty?: number } | undefined>(undefined)
  const [deliverId, setDeliverId] = useState<string | null>(null)

  // list = transfers().slice().sort(...) — newest-first by RAW STRING compare
  // on the ISO date (localeCompare, not a true date sort — exact port).
  const list = useMemo(() => sortByDateDesc(transfers), [transfers])
  const activeCount = useMemo(() => list.filter((t) => t.status !== 'DELIVERED').length, [list])

  const openNewTransfer = (preset?: { itemId?: string; from?: string; to?: string; qty?: number }) => {
    setTransferPreset(preset)
    setTransferOpen(true)
  }

  const handleCreateTransfer = async (input: NewTransferInput) => {
    const result = transferSchema.safeParse(input)
    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? 'Please check the highlighted fields')
      return
    }
    await saveTransfer(input)
    setTransferOpen(false)
    toast.success(`Transfer raised · ${locLabel(input.from, people)} → ${locLabel(input.to, people)}`)
  }

  const handleDispatch = async (t: Transfer) => {
    await dispatchTransfer(t.id)
    toast.success(`${t.id} dispatched · in transit`)
  }

  const handleDeliver = async (id: string, pod: DeliverPodInput) => {
    const result = transferDeliverPodSchema.safeParse(pod)
    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? 'Please check the highlighted fields')
      return
    }
    await saveDeliver(id, pod)
    setDeliverId(null)
    toast.success(`${id} delivered · POD ${pod.ref.trim()}`)
  }

  const balanceTransfer = (sg: BalancingSuggestion) => {
    if (!sg.suggestion) return
    openNewTransfer({ itemId: sg.item.id, from: sg.suggestion.loc, to: CENTRAL, qty: Math.min(sg.need, sg.suggestion.qty) })
  }

  const deliverTarget = deliverId ? list.find((t) => t.id === deliverId) ?? null : null

  return (
    <div>
      {/* Logistics rollup strip — .wh-loc reused, explicitly 4 cols */}
      <div className="grid grid-cols-2 min-[900px]:grid-cols-4 gap-2.5 mb-3.5">
        <RollupCard icon={<Wallet size={13} />} color="#f59e0b" label="Logistics spend" value={inrShort(rollup.totLog)} sub={`${rollup.transferCount} transfers`} />
        <RollupCard icon={<Package size={13} />} color="var(--qms-brand)" label="Cost / transfer" value={inr(rollup.costPerTransfer)} sub="avg all-in" />
        <RollupCard icon={<Tent size={13} />} color="#14b8a6" label="Cost / camp" value={inr(rollup.costPerCamp)} sub={`${rollup.campCount} camps`} />
        <RollupCard icon={<User size={13} />} color="#10b981" label="Cost / patient" value={inr(rollup.costPerPatient)} sub={`${rollup.patientCount} patients`} />
      </div>

      {/* Emergency stock-balancing panel — .wh-bal, conditional on suggestions.length > 0 */}
      {suggestions.length > 0 && (
        <div
          className="rounded-xl border mb-3.5"
          style={{ padding: 12, borderColor: 'var(--qms-border)', background: 'rgba(245,158,11,.05)' }}
        >
          <h4 className="flex items-center gap-1.5 font-extrabold" style={{ margin: '0 0 8px', fontSize: 12 }}>
            <GitCompare size={14} color="#b45309" />
            Emergency stock-balancing · recommend transfers before procurement ({suggestions.length})
          </h4>
          <div className="overflow-auto">
            <table className="border-collapse" style={{ width: '100%', fontSize: 12 }}>
              <thead>
                <tr>
                  {['Item', 'Central', 'Need', 'Recommendation', ''].map((h, i) => (
                    <th
                      key={h || `col-${i}`}
                      className={`text-left font-bold uppercase tracking-[.04em] ${i === 1 || i === 2 ? 'text-right' : ''}`}
                      style={{ padding: '8px 6px', fontSize: 10, color: 'var(--qms-text-muted)', borderBottom: '1px dashed var(--qms-border)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {suggestions.map((sg) => {
                  const pullQty = sg.suggestion ? Math.min(sg.need, sg.suggestion.qty) : 0
                  return (
                    <tr key={sg.item.id}>
                      <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)' }}>
                        <b style={{ color: 'var(--qms-text)' }}>{sg.item.name}</b>
                      </td>
                      <td className="text-right tabular-nums" style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>
                        {sg.item.qtyOnHand ?? 0}
                      </td>
                      <td className="text-right tabular-nums" style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>
                        {sg.need}
                      </td>
                      <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>
                        {sg.suggestion ? (
                          <>Pull <b>{pullQty}</b> from {locLabel(sg.suggestion.loc, people)} (has {sg.suggestion.qty})</>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>No field surplus — raise a PO</span>
                        )}
                      </td>
                      <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)' }}>
                        {sg.suggestion ? (
                          <Button variant="ghost" style={{ padding: '4px 9px' }} onClick={() => balanceTransfer(sg)}>
                            <GitCompare size={13} /> Transfer
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* .inv-filter — sticky header bar */}
      <InvFilterBar>
        <span
          className="text-xs font-bold uppercase tracking-[.04em]"
          style={{ color: 'var(--qms-text-muted)' }}
        >
          Stock transfers &amp; logistics
        </span>
        <span className="text-xs ml-auto" style={{ color: 'var(--qms-text-muted)' }}>
          {activeCount} active
        </span>
        <Button onClick={() => openNewTransfer()}>
          <Plus size={14} /> New transfer
        </Button>
      </InvFilterBar>

      {/* Main transfers table — .inv-card padding:0;overflow:auto */}
      <div className="rounded-2xl border overflow-auto" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <table className="border-collapse text-xs" style={{ width: '100%', minWidth: 820 }}>
          <thead>
            <tr>
              {['Transfer', 'Route', 'Item', 'Logistics', 'Status', 'Action'].map((h, i) => (
                <th
                  key={h}
                  className={`text-left font-bold uppercase tracking-[.04em] ${i === 3 ? 'text-right' : ''}`}
                  style={{ padding: '8px 6px', fontSize: 10, color: 'var(--qms-text-muted)', borderBottom: '1px dashed var(--qms-border)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <TableEmptyRow colSpan={6}>No transfers yet.</TableEmptyRow>
            ) : (
              list.map((t) => (
                <tr key={t.id}>
                  <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)' }}>
                    <b style={{ color: 'var(--qms-text)' }}>{t.id}</b>
                    <div className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>{t.date}</div>
                  </td>
                  <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>
                    <span className="inline-flex items-center gap-1">
                      {locLabel(t.from, people)}
                      <ArrowRight size={11} color="var(--qms-text-muted)" />
                      {locLabel(t.to, people)}
                    </span>
                  </td>
                  <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>
                    {t.itemName}
                    <div className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>{t.qty} {t.uom}</div>
                  </td>
                  <td className="text-right tabular-nums" style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>
                    {inr(t.logistics)}
                    <div className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>crt {t.courier}·frt {t.freight}</div>
                  </td>
                  <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)' }}>
                    <TransferStatusPill status={t.status} />
                  </td>
                  <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', whiteSpace: 'nowrap' }}>
                    {t.status === 'REQUESTED' && (
                      <Button style={{ padding: '4px 10px' }} onClick={() => handleDispatch(t)}>
                        <Truck size={13} /> Dispatch
                      </Button>
                    )}
                    {t.status === 'IN_TRANSIT' && (
                      <Button style={{ padding: '4px 10px' }} onClick={() => setDeliverId(t.id)}>
                        <PackageCheck size={13} /> Deliver + POD
                      </Button>
                    )}
                    {t.status === 'DELIVERED' && (
                      t.pod ? (
                        <span className="inline-flex items-center gap-1 text-xs" style={{ color: '#059669' }}>
                          <Check size={12} /> {t.pod.ref}
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>delivered</span>
                      )
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <NewTransferModal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        items={items}
        locs={locOptions(people)}
        preset={transferPreset}
        onSave={handleCreateTransfer}
        submitIcon={<Plus size={13} />}
      />

      <DeliverPodModal
        transfer={deliverTarget}
        transferCount={list.length}
        people={people}
        onClose={() => setDeliverId(null)}
        onSave={handleDeliver}
      />
    </div>
  )
}

function RollupCard({
  icon, color, label, value, sub,
}: {
  icon: React.ReactNode
  color: string
  label: string
  value: string
  sub: string
}) {
  // .wh-loc-card reused verbatim but cursor:default / no onclick — non-
  // interactive tiles (the prototype's own hover transform still technically
  // applies via the shared class since no override is added; preserved as-is
  // per the research spec's note on this minor quirk).
  return (
    <div
      className="relative overflow-hidden transition-[border-color,transform] duration-150 hover:-translate-y-0.5"
      style={{
        padding: '13px 14px',
        borderRadius: 12,
        background: 'var(--qms-surface)',
        border: '1px solid var(--qms-border)',
        cursor: 'default',
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

const STATUS_PILL_STYLE: Record<TransferStatus, { bg: string; fg: string }> = {
  REQUESTED: { bg: 'rgba(245,158,11,.16)', fg: '#b45309' },
  IN_TRANSIT: { bg: 'rgba(59,109,255,.14)', fg: 'var(--qms-brand-700, #2451f0)' },
  DELIVERED: { bg: 'rgba(16,185,129,.15)', fg: '#059669' },
}

function TransferStatusPill({ status }: { status: TransferStatus }) {
  const { bg, fg } = STATUS_PILL_STYLE[status]
  return (
    <span
      className="inline-flex items-center font-bold uppercase tracking-[.03em] rounded-full"
      style={{ padding: '2px 8px', fontSize: 10, background: bg, color: fg }}
    >
      {status.replace('_', ' ')}
    </span>
  )
}

// Deliver + POD modal — exact port of window.QMS_InvWh.openDeliver()/
// saveDeliver() (inventory-warehouse.js:346-377). `transfer` is null when
// closed; the modal is keyed by transfer.id so its internal form state resets
// whenever a different transfer is targeted.
function DeliverPodModal({
  transfer, transferCount, people, onClose, onSave,
}: {
  transfer: Transfer | null
  transferCount: number
  people: Person[]
  onClose: () => void
  onSave: (id: string, pod: DeliverPodInput) => void | Promise<void>
}) {
  if (!transfer) {
    return <Dialog open={false} onOpenChange={() => onClose()}><DialogContent /></Dialog>
  }
  return (
    <DeliverPodModalBody
      key={transfer.id}
      transfer={transfer}
      transferCount={transferCount}
      people={people}
      onClose={onClose}
      onSave={onSave}
    />
  )
}

function DeliverPodModalBody({
  transfer, transferCount, people, onClose, onSave,
}: {
  transfer: Transfer
  transferCount: number
  people: Person[]
  onClose: () => void
  onSave: (id: string, pod: DeliverPodInput) => void | Promise<void>
}) {
  const today = todayIso()
  const [ref, setRef] = useState(nextPodRef(transferCount))
  const [by, setBy] = useState('')
  const [date, setDate] = useState(today)
  const [photo, setPhoto] = useState('')

  const handleSave = () => {
    onSave(transfer.id, { ref, by, at: date, photo })
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirm delivery · {transfer.id}</DialogTitle>
          <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
            {locLabel(transfer.from, people)} → {locLabel(transfer.to, people)}
          </p>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 text-[13px]">
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Proof of delivery — reference</label>
            <Input value={ref} onChange={(e) => setRef(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Received by</label>
            <Input value={by} onChange={(e) => setBy(e.target.value)} placeholder="Name at destination" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Delivery date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Delivery photo / courier receipt</label>
            <Input value={photo} onChange={(e) => setPhoto(e.target.value)} placeholder="file ref or courier AWB" />
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs" style={{ marginTop: 8, color: 'var(--qms-text-muted)' }}>
          <Info size={12} /> POD is mandatory to close a transfer.
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}><PackageCheck size={14} /> Confirm + capture POD</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default TransfersTab
