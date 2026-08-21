import { useState } from 'react'
import {
  FiFileText, FiShoppingCart, FiChevronRight, FiPlus, FiRefreshCw, FiCheck, FiX, FiSend,
  FiSave, FiUserCheck,
} from 'react-icons/fi'
import { TbPackageImport } from 'react-icons/tb'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import SideDrawer from '@/components/ui/SideDrawer'
import { toast } from '@/components/ui/sonner'
import { useProcurement, useProcurementSeg } from '@/features/inventory/hooks/useInventory'
import {
  inr, inrShort, poTotal, poFlow, vendorByName, itemById,
} from '@/features/inventory/inventory.service'
import type {
  PrFormValues, PoCreateFormValues, GrnFormValues, GrnDefaults,
} from '@/features/inventory/inventory.service'
import {
  PR_CHAIN, PR_SOURCES, PAY_TERMS,
} from '@/features/inventory/inventory.types'
import { isoDateOffset } from '@/features/inventory/utils/date'
import { TableEmptyRow, InvFilterBar } from '@/features/inventory/components/IntelTableUi'
import type {
  PurchaseRequisition, PurchaseOrder, GoodsReceiptNote, InventoryItem, Vendor,
} from '@/features/inventory/inventory.types'
import { purchaseRequestSchema } from '@/features/inventory/schemas/purchaseRequest.schema'
import { purchaseOrderSchema } from '@/features/inventory/schemas/purchaseOrder.schema'
import { grnSchema } from '@/features/inventory/schemas/grn.schema'

function PrStep({ label, state }: { label: string; state: 'pending' | 'done' | 'cur' | 'rej' }) {
  const style =
    state === 'done' ? { background: 'rgba(16,185,129,.15)', color: '#059669' } :
    state === 'cur' ? { background: 'rgba(59,109,255,.15)', color: 'var(--qms-brand-700, #2451f0)' } :
    state === 'rej' ? { background: 'rgba(244,63,94,.15)', color: '#e11d48' } :
    { background: 'rgba(0,0,0,.06)', color: 'var(--qms-text-muted)' }
  return (
    <span
      className="font-bold uppercase tracking-[.03em] rounded-full"
      style={{ fontSize: 9.5, padding: '2px 7px', ...style }}
    >
      {label}
    </span>
  )
}

function PrFlow({ steps }: { steps: { label: string; state: 'pending' | 'done' | 'cur' | 'rej' }[] }) {
  return (
    <div className="flex gap-1 items-center flex-wrap">
      {steps.map((s, i) => (
        <span key={s.label} className="inline-flex items-center gap-1">
          <PrStep label={s.label} state={s.state} />
          {i < steps.length - 1 && <FiChevronRight size={11} color="var(--qms-text-muted)" />}
        </span>
      ))}
    </div>
  )
}

// Also reused for the PR status pill (Approved/Rejected).
type PoStatusVariant = 'OPEN' | 'PENDING' | 'AWAITING' | 'DELAYED' | 'CLOSED' | 'CANCELLED'
const PO_STATUS_STYLE: Record<PoStatusVariant, React.CSSProperties> = {
  OPEN: { background: 'rgba(59,109,255,.14)', color: 'var(--qms-brand-700, #2451f0)' },
  PENDING: { background: 'rgba(245,158,11,.16)', color: '#b45309' },
  AWAITING: { background: 'rgba(245,158,11,.16)', color: '#b45309' },
  DELAYED: { background: 'rgba(244,63,94,.15)', color: '#e11d48' },
  CLOSED: { background: 'rgba(16,185,129,.15)', color: '#059669' },
  CANCELLED: { background: 'rgba(0,0,0,.08)', color: 'var(--qms-text-muted)', textDecoration: 'line-through' },
}
function PoStatusPill({ variant, children }: { variant: PoStatusVariant; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center font-bold uppercase tracking-[.03em] rounded-full"
      style={{ fontSize: 10, padding: '2px 8px', ...PO_STATUS_STYLE[variant] }}
    >
      {children}
    </span>
  )
}

const CARD_CLS = 'rounded-[14px] border overflow-auto'
const CARD_STYLE = { background: 'var(--qms-surface-card)', borderColor: 'var(--qms-border)' }
const TH_CLS = 'text-left font-bold uppercase tracking-[.04em]'
const TH_STYLE = { padding: '8px 6px', fontSize: 10, color: 'var(--qms-text-muted)', borderBottom: '1px dashed var(--qms-border)' }
const TD_STYLE = { padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)' }

// The real persisted PR → PO → GRN pipeline, as opposed to the Consumables
// tab's fire-and-forget "Raise PO" toast.
const ProcurementTab = () => {
  const proc = useProcurement()
  const { prs, pos, grns, vendors, items } = proc
  const { seg, setSeg } = useProcurementSeg()

  const [prModalOpen, setPrModalOpen] = useState(false)
  const [prPreset, setPrPreset] = useState<{ itemId?: string; qty?: number; source?: string } | undefined>(undefined)
  const [poCreateOpen, setPoCreateOpen] = useState(false)
  const [grnPoId, setGrnPoId] = useState<string | null>(null)
  const [openPoId, setOpenPoId] = useState<string | null>(null)

  const pendingPrCount = prs.filter((p) => p.status === 'PENDING').length
  const awaitingPoCount = pos.filter((p) => p.status === 'AWAITING').length

  const handleAdvancePR = async (id: string, approve: boolean) => {
    const pr = await proc.advancePR(id, approve)
    if (!approve) toast.error(`${pr.id} rejected at ${pr.stage}`)
    else if (pr.status === 'APPROVED') toast.success(`${pr.id} fully approved → ready for PO`)
    else toast.success(`${pr.id} approved · now with ${pr.stage}`)
  }

  const handlePrToPO = async (prId: string) => {
    const po = await proc.prToPO(prId)
    setSeg('PO')
    toast.success(`${po.id} generated by Logistics · awaiting Ops Manager approval`)
  }

  const handleAutoReorder = async () => {
    const { raised, hadLowItems } = await proc.autoReorder()
    if (!hadLowItems) { toast.info('No items below reorder level'); return }
    toast[raised ? 'success' : 'info'](raised ? `${raised} auto-reorder PR(s) raised` : 'All low items already have open PRs')
  }

  const handleApprovePO = async (id: string) => {
    const po = await proc.approvePO(id)
    toast.success(`${po.id} approved by Ops Manager · open for receipt`)
  }
  const handleRejectPO = async (id: string) => {
    const po = await proc.rejectPO(id)
    toast.error(`${po.id} rejected by Ops Manager`)
  }

  const openGrnFor = (poId: string) => {
    const po = pos.find((p) => p.id === poId)
    if (!po) { toast.error('PO not found'); return }
    if (po.status === 'AWAITING') { toast.error('PO awaiting Ops Manager approval — approve first'); return }
    if (po.status === 'CANCELLED' || po.status === 'CLOSED') { toast.info(po.status.toLowerCase()); return }
    setGrnPoId(poId)
  }

  const openPrModal = (preset?: { itemId?: string; qty?: number; source?: string }) => {
    setPrPreset(preset)
    setPrModalOpen(true)
  }

  return (
    <div>
      <div className="inline-flex gap-1 mb-3.5 rounded-[10px]" style={{ padding: 4, background: 'var(--qms-surface-strong,rgba(0,0,0,.04))' }}>
        <SegTab active={seg === 'PR'} onClick={() => setSeg('PR')} icon={<FiFileText size={13} />}>
          Requisitions ({pendingPrCount})
        </SegTab>
        <SegTab active={seg === 'PO'} onClick={() => setSeg('PO')} icon={<FiShoppingCart size={13} />}>
          Purchase Orders ({awaitingPoCount} ⏳)
        </SegTab>
        <SegTab active={seg === 'GRN'} onClick={() => setSeg('GRN')} icon={<TbPackageImport size={13} />}>
          Goods Receipt ({grns.length})
        </SegTab>
      </div>

      {seg === 'PR' && (
        <PrView
          prs={prs}
          onAdvance={handleAdvancePR}
          onPrToPO={handlePrToPO}
          onAutoReorder={handleAutoReorder}
          onNewPR={() => openPrModal()}
        />
      )}
      {seg === 'PO' && (
        <PoView
          pos={pos}
          onOpenPO={setOpenPoId}
          onApprove={handleApprovePO}
          onReject={handleRejectPO}
          onReceive={openGrnFor}
          onGenerate={() => setPoCreateOpen(true)}
        />
      )}
      {seg === 'GRN' && <GrnView grns={grns} />}

      <NewPrModal
        open={prModalOpen}
        onClose={() => setPrModalOpen(false)}
        items={items}
        preset={prPreset}
        onSave={async (form) => {
          const pr = await proc.savePR(form)
          setPrModalOpen(false)
          toast.success('Raised ' + pr.id)
        }}
      />

      <GeneratePoModal
        open={poCreateOpen}
        onClose={() => setPoCreateOpen(false)}
        items={items}
        vendors={vendors}
        onSave={async (form) => {
          const po = await proc.savePOCreate(form)
          setPoCreateOpen(false)
          setSeg('PO')
          toast.success(`${po.id} generated · awaiting Ops Manager approval`)
        }}
      />

      <GoodsReceiptModal
        poId={grnPoId}
        pos={pos}
        grnCount={grns.length}
        onClose={() => setGrnPoId(null)}
        onSave={async (poId, form) => {
          const { grn, newQtyOnHand } = await proc.saveGRN(poId, form)
          setGrnPoId(null)
          setSeg('GRN')
          toast.success(`${grn.id} · +${form.acceptedQty} to stock${newQtyOnHand != null ? ` (now ${newQtyOnHand})` : ''}`)
        }}
      />

      <PoDetailDrawer
        poId={openPoId}
        pos={pos}
        grns={grns}
        onClose={() => setOpenPoId(null)}
        onApprove={handleApprovePO}
        onReject={handleRejectPO}
        onReceive={openGrnFor}
      />
    </div>
  )
}

function SegTab({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex gap-1.5 items-center rounded-lg font-bold transition-colors"
      style={{
        border: 'none',
        padding: '6px 14px',
        fontSize: 12,
        background: active ? 'var(--qms-surface-card)' : 'transparent',
        color: active ? 'var(--qms-text)' : 'var(--qms-text-muted)',
        boxShadow: active ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
      }}
    >
      {icon} {children}
    </button>
  )
}

function prFlowSteps(pr: PurchaseRequisition): { label: string; state: 'pending' | 'done' | 'cur' | 'rej' }[] {
  return PR_CHAIN.map((s) => {
    const done = pr.history.some((h) => h.stage === s && h.action === 'approved')
    const cur = pr.stage === s && pr.status === 'PENDING'
    const rej = pr.status === 'REJECTED' && pr.stage === s
    return { label: s, state: done ? 'done' : cur ? 'cur' : rej ? 'rej' : 'pending' }
  })
}

function PrView({
  prs, onAdvance, onPrToPO, onAutoReorder, onNewPR,
}: {
  prs: PurchaseRequisition[]
  onAdvance: (id: string, approve: boolean) => void
  onPrToPO: (id: string) => void
  onAutoReorder: () => void
  onNewPR: () => void
}) {
  return (
    <div>
      <InvFilterBar>
        <span className="text-xs font-bold uppercase tracking-[.04em]" style={{ color: 'var(--qms-text-muted)' }}>
          Purchase Requisitions
        </span>
        <span className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>
          Workflow · {PR_CHAIN.join(' → ')}
        </span>
        <Button variant="ghost" className="ml-auto" onClick={onAutoReorder}>
          <FiRefreshCw size={14} /> Auto-reorder scan
        </Button>
        <Button onClick={onNewPR}>
          <FiPlus size={14} /> New PR
        </Button>
      </InvFilterBar>

      <div className={CARD_CLS} style={CARD_STYLE}>
        <table className="text-xs border-collapse" style={{ width: '100%', minWidth: 760 }}>
          <thead>
            <tr>
              {['PR', 'Item', 'Qty', 'Approval flow', 'Status', 'Action'].map((h, i) => (
                <th key={h} className={`${TH_CLS} ${i === 2 ? 'text-right' : ''}`} style={TH_STYLE}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {prs.length === 0 ? (
              <TableEmptyRow colSpan={6}>No requisitions.</TableEmptyRow>
            ) : (
              prs.map((pr) => (
                <tr key={pr.id}>
                  <td style={TD_STYLE}>
                    <b style={{ color: 'var(--qms-text)' }}>{pr.id}</b>
                    <div className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>{pr.date}</div>
                  </td>
                  <td style={{ ...TD_STYLE, color: 'var(--qms-text)' }}>
                    {pr.itemName}
                    <div className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>{pr.source}</div>
                  </td>
                  <td className="text-right tabular-nums" style={{ ...TD_STYLE, color: 'var(--qms-text)' }}>{pr.qty} {pr.uom}</td>
                  <td style={TD_STYLE}><PrFlow steps={prFlowSteps(pr)} /></td>
                  <td style={TD_STYLE}>
                    {pr.status === 'APPROVED' ? (
                      <PoStatusPill variant="CLOSED">Approved</PoStatusPill>
                    ) : pr.status === 'REJECTED' ? (
                      <PoStatusPill variant="DELAYED">Rejected</PoStatusPill>
                    ) : (
                      <PoStatusPill variant="PENDING">{pr.stage}</PoStatusPill>
                    )}
                  </td>
                  <td style={{ ...TD_STYLE, whiteSpace: 'nowrap' }}>
                    {pr.status === 'PENDING' ? (
                      <span className="inline-flex gap-1">
                        <Button variant="ghost" style={{ padding: '4px 8px' }} onClick={() => onAdvance(pr.id, true)}><FiCheck size={13} /></Button>
                        <Button variant="ghost" style={{ padding: '4px 8px' }} onClick={() => onAdvance(pr.id, false)}><FiX size={13} /></Button>
                      </span>
                    ) : pr.status === 'APPROVED' ? (
                      <Button style={{ padding: '4px 10px' }} onClick={() => onPrToPO(pr.id)}><FiShoppingCart size={13} /> PO</Button>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PoView({
  pos, onOpenPO, onApprove, onReject, onReceive, onGenerate,
}: {
  pos: PurchaseOrder[]
  onOpenPO: (id: string) => void
  onApprove: (id: string) => void
  onReject: (id: string) => void
  onReceive: (id: string) => void
  onGenerate: () => void
}) {
  const awaiting = pos.filter((p) => p.status === 'AWAITING')
  const open = pos.filter((p) => p.status !== 'CLOSED' && p.status !== 'CANCELLED')
  const openVal = open.reduce((a, p) => a + poTotal(p), 0)

  return (
    <div>
      <InvFilterBar>
        <span className="text-xs font-bold uppercase tracking-[.04em]" style={{ color: 'var(--qms-text-muted)' }}>
          Purchase Orders
        </span>
        <span className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>
          {awaiting.length} awaiting OM approval · {open.length} open · {inrShort(openVal)} committed
        </span>
        <Button className="ml-auto" onClick={onGenerate}>
          <FiPlus size={14} /> Generate PO
        </Button>
      </InvFilterBar>

      <div className={CARD_CLS} style={CARD_STYLE}>
        <table className="text-xs border-collapse" style={{ width: '100%', minWidth: 820 }}>
          <thead>
            <tr>
              {['PO', 'Vendor', 'Item', 'Total', 'Approval flow', 'Status', 'Action'].map((h, i) => (
                <th key={h} className={`${TH_CLS} ${i === 3 ? 'text-right' : ''}`} style={TH_STYLE}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pos.length === 0 ? (
              <TableEmptyRow colSpan={7}>No purchase orders.</TableEmptyRow>
            ) : (
              pos.map((p) => (
                <tr key={p.id} className="cursor-pointer" onClick={() => onOpenPO(p.id)}>
                  <td style={TD_STYLE}>
                    <b style={{ color: 'var(--qms-text)' }}>{p.id}</b>
                    <div className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>{p.date} · {p.createdBy || 'Logistics'}</div>
                  </td>
                  <td style={{ ...TD_STYLE, color: 'var(--qms-text)' }}>{p.vendorName}</td>
                  <td style={{ ...TD_STYLE, color: 'var(--qms-text)' }}>
                    {p.itemName}
                    <div className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>{p.qty} {p.uom} @ {inr(p.unitRate)}</div>
                  </td>
                  <td className="text-right tabular-nums" style={{ ...TD_STYLE, color: 'var(--qms-text)' }}>{inr(poTotal(p))}</td>
                  <td style={TD_STYLE}><PrFlow steps={poFlow(p)} /></td>
                  <td style={TD_STYLE}>
                    <PoStatusPill variant={p.status as PoStatusVariant}>{p.status === 'AWAITING' ? 'OM approval' : p.status}</PoStatusPill>
                  </td>
                  <td style={{ ...TD_STYLE, whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                    {p.status === 'AWAITING' ? (
                      <span className="inline-flex gap-1">
                        <Button style={{ padding: '4px 9px' }} title="Ops Manager approve" onClick={() => onApprove(p.id)}><FiCheck size={13} /></Button>
                        <Button variant="ghost" style={{ padding: '4px 9px' }} title="Reject" onClick={() => onReject(p.id)}><FiX size={13} /></Button>
                      </span>
                    ) : (p.status === 'OPEN' || p.status === 'PENDING' || p.status === 'DELAYED') ? (
                      <Button style={{ padding: '4px 10px' }} onClick={() => onReceive(p.id)}><TbPackageImport size={13} /> Receive</Button>
                    ) : p.status === 'CLOSED' ? (
                      <span className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>received</span>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>cancelled</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function GrnView({ grns }: { grns: GoodsReceiptNote[] }) {
  return (
    <div>
      <InvFilterBar>
        <span className="text-xs font-bold uppercase tracking-[.04em]" style={{ color: 'var(--qms-text-muted)' }}>
          Goods Receipt Notes
        </span>
        <span className="text-xs ml-auto" style={{ color: 'var(--qms-text-muted)' }}>
          Accepted qty auto-updates item stock
        </span>
      </InvFilterBar>

      <div className={CARD_CLS} style={CARD_STYLE}>
        <table className="text-xs border-collapse" style={{ width: '100%', minWidth: 780 }}>
          <thead>
            <tr>
              {['GRN', 'PO', 'Item', 'Recd', 'Accepted', 'Rejected', 'Batch / expiry'].map((h, i) => (
                <th key={h} className={`${TH_CLS} ${i >= 3 && i <= 5 ? 'text-right' : ''}`} style={TH_STYLE}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grns.length === 0 ? (
              <TableEmptyRow colSpan={7}>No goods receipts yet. Receive an open PO.</TableEmptyRow>
            ) : (
              grns.map((g) => (
                <tr key={g.id}>
                  <td style={TD_STYLE}>
                    <b style={{ color: 'var(--qms-text)' }}>{g.id}</b>
                    <div className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>{g.date}</div>
                  </td>
                  <td style={{ ...TD_STYLE, color: 'var(--qms-text)' }}>{g.poId}</td>
                  <td style={{ ...TD_STYLE, color: 'var(--qms-text)' }}>{g.itemName}</td>
                  <td className="text-right tabular-nums" style={{ ...TD_STYLE, color: 'var(--qms-text)' }}>{g.receivedQty}</td>
                  <td className="text-right tabular-nums" style={{ ...TD_STYLE, color: 'var(--qms-text)' }}>{g.acceptedQty}</td>
                  <td className="text-right tabular-nums" style={{ ...TD_STYLE, color: 'var(--qms-text)' }}>{g.rejectedQty}</td>
                  <td style={{ ...TD_STYLE, color: 'var(--qms-text)' }}>
                    {g.batchNo}
                    <div className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>exp {g.expiryDate}</div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function NewPrModal({
  open, onClose, items, preset, onSave,
}: {
  open: boolean
  onClose: () => void
  items: InventoryItem[]
  preset?: { itemId?: string; qty?: number; source?: string }
  onSave: (form: PrFormValues) => void | Promise<void>
}) {
  const consumables = items.filter((it) => it.itemType === 'Consumable' || it.itemType === 'General Consumable' || it.itemType === 'Marketing Material')
  const defaultItemId = () => preset?.itemId || consumables[0]?.id || ''

  const [itemId, setItemId] = useState(defaultItemId)
  const [qty, setQty] = useState(String(preset?.qty ?? 50))
  const [source, setSource] = useState(preset?.source || PR_SOURCES[0])
  const [reason, setReason] = useState('')

  const resetIfOpening = (isOpen: boolean) => {
    if (isOpen) {
      setItemId(preset?.itemId || consumables[0]?.id || '')
      setQty(String(preset?.qty ?? 50))
      setSource(preset?.source || PR_SOURCES[0])
      setReason('')
    }
  }

  const handleSave = () => {
    const payload = { itemId, qty: Number(qty) || 0, source, reason }
    const result = purchaseRequestSchema.safeParse(payload)
    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? 'Please check the highlighted fields')
      return
    }
    onSave(payload)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); resetIfOpening(o) }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New requisition</DialogTitle>
          <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>Raise a purchase requisition</p>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 text-[13px]">
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Item</label>
            <Select value={itemId} onValueChange={(v) => setItemId(v ?? '')}>
              <SelectTrigger className="w-full text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {consumables.map((it) => <SelectItem key={it.id} value={it.id}>{it.name} · on hand {it.qtyOnHand ?? 0}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Quantity</label>
            <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} min={0} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Source</label>
            <Select value={source} onValueChange={(v) => setSource(v ?? PR_SOURCES[0])}>
              <SelectTrigger className="w-full text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PR_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Reason</label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Below reorder / camp forecast / replacement" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}><FiSave size={14} /> Raise PR</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Picking an item auto-fills rate/GST/vendor from that item's defaults.
function GeneratePoModal({
  open, onClose, items, vendors, onSave,
}: {
  open: boolean
  onClose: () => void
  items: InventoryItem[]
  vendors: Vendor[]
  onSave: (form: PoCreateFormValues) => void | Promise<void>
}) {
  const consumables = items.filter((it) => it.itemType === 'Consumable' || it.itemType === 'General Consumable' || it.itemType === 'Marketing Material')

  const pickDefaults = (id: string) => {
    const it = itemById(id) ?? consumables.find((c) => c.id === id)
    const ven = it?.vendor ? vendorByName(it.vendor) : undefined
    return { rate: it?.purchaseCost || 0, gst: it?.gst || 12, vendorId: ven?.id || vendors[0]?.id || '' }
  }

  const firstId = consumables[0]?.id || ''
  const firstDefaults = pickDefaults(firstId)

  const [itemId, setItemId] = useState(firstId)
  const [vendorId, setVendorId] = useState(firstDefaults.vendorId)
  const [qty, setQty] = useState('50')
  const [rate, setRate] = useState(String(firstDefaults.rate))
  const [gst, setGst] = useState(String(firstDefaults.gst))
  const [freight, setFreight] = useState('0')
  const [paymentTerms, setPaymentTerms] = useState<string>(PAY_TERMS[2])
  const [deliveryDays, setDeliveryDays] = useState('7')

  const resetIfOpening = (isOpen: boolean) => {
    if (isOpen) {
      const d = pickDefaults(firstId)
      setItemId(firstId)
      setVendorId(d.vendorId)
      setQty('50')
      setRate(String(d.rate))
      setGst(String(d.gst))
      setFreight('0')
      setPaymentTerms(PAY_TERMS[2])
      setDeliveryDays('7')
    }
  }

  const handleItemChange = (id: string) => {
    setItemId(id)
    const d = pickDefaults(id)
    setRate(String(d.rate))
    setGst(String(d.gst))
    if (d.vendorId) setVendorId(d.vendorId)
  }

  const handleSave = () => {
    const payload = {
      itemId, vendorId,
      qty: Number(qty) || 0,
      unitRate: Number(rate) || 0,
      gst: Number(gst) || 0,
      freight: Number(freight) || 0,
      paymentTerms,
      deliveryDays: Number(deliveryDays) || 7,
    }
    const result = purchaseOrderSchema.safeParse(payload)
    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? 'Please check the highlighted fields')
      return
    }
    onSave(payload)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); resetIfOpening(o) }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate purchase order</DialogTitle>
          <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>Logistics · routes to Ops Manager for approval</p>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 text-[13px]">
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Item</label>
            <Select value={itemId} onValueChange={(v) => handleItemChange(v ?? '')}>
              <SelectTrigger className="w-full text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {consumables.map((it) => <SelectItem key={it.id} value={it.id}>{it.name} · on hand {it.qtyOnHand ?? 0}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Vendor</label>
            <Select value={vendorId} onValueChange={(v) => setVendorId(v ?? '')}>
              <SelectTrigger className="w-full text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {vendors.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Quantity</label>
            <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} min={0} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Unit rate ₹</label>
            <Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} min={0} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>GST %</label>
            <Input type="number" value={gst} onChange={(e) => setGst(e.target.value)} min={0} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Freight ₹</label>
            <Input type="number" value={freight} onChange={(e) => setFreight(e.target.value)} min={0} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Payment terms</label>
            <Select value={paymentTerms} onValueChange={(v) => setPaymentTerms(v ?? PAY_TERMS[2])}>
              <SelectTrigger className="w-full text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAY_TERMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Delivery (days)</label>
            <Input type="number" value={deliveryDays} onChange={(e) => setDeliveryDays(e.target.value)} min={0} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}><FiSend size={14} /> Generate &amp; send for approval</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Guarded by the caller (openGrnFor()) — only ever renders once a valid
// receivable PO id is passed.
function GoodsReceiptModal({
  poId, pos, grnCount, onClose, onSave,
}: {
  poId: string | null
  pos: PurchaseOrder[]
  grnCount: number
  onClose: () => void
  onSave: (poId: string, form: GrnFormValues) => void | Promise<void>
}) {
  const po = poId ? pos.find((p) => p.id === poId) ?? null : null
  if (!po) {
    return <Dialog open={false} onOpenChange={() => onClose()}><DialogContent /></Dialog>
  }
  return <GoodsReceiptModalBody key={po.id} po={po} grnCount={grnCount} onClose={onClose} onSave={onSave} />
}

function GoodsReceiptModalBody({
  po, grnCount, onClose, onSave,
}: {
  po: PurchaseOrder
  grnCount: number
  onClose: () => void
  onSave: (poId: string, form: GrnFormValues) => void | Promise<void>
}) {
  const defaults: GrnDefaults = {
    po,
    receivedQty: po.qty,
    acceptedQty: po.qty,
    rejectedQty: 0,
    batchNo: `B${(po.itemId || '').replace(/\W+/g, '').toUpperCase().slice(0, 6)}-${24300 + grnCount}`,
    expiryDate: isoDateOffset(365),
    invoiceNo: `VINV-${5600 + grnCount}`,
  }

  const [receivedQty, setReceivedQty] = useState(String(defaults.receivedQty))
  const [acceptedQty, setAcceptedQty] = useState(String(defaults.acceptedQty))
  const [rejectedQty, setRejectedQty] = useState(String(defaults.rejectedQty))
  const [batchNo, setBatchNo] = useState(defaults.batchNo)
  const [expiryDate, setExpiryDate] = useState(defaults.expiryDate)
  const [invoiceNo, setInvoiceNo] = useState(defaults.invoiceNo)
  const [notes, setNotes] = useState('')

  const handleSave = () => {
    const payload = {
      receivedQty: Number(receivedQty) || 0,
      acceptedQty: Number(acceptedQty) || 0,
      rejectedQty: Number(rejectedQty) || 0,
      batchNo,
      expiryDate,
      invoiceNo,
      notes,
    }
    const result = grnSchema.safeParse(payload)
    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? 'Please check the highlighted fields')
      return
    }
    onSave(po.id, payload)
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Goods receipt · {po.id}</DialogTitle>
          <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>{po.itemName} · {po.vendorName}</p>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 text-[13px]">
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Received qty</label>
            <Input type="number" value={receivedQty} onChange={(e) => setReceivedQty(e.target.value)} min={0} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Accepted qty</label>
            <Input type="number" value={acceptedQty} onChange={(e) => setAcceptedQty(e.target.value)} min={0} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Rejected qty</label>
            <Input type="number" value={rejectedQty} onChange={(e) => setRejectedQty(e.target.value)} min={0} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Batch number</label>
            <Input value={batchNo} onChange={(e) => setBatchNo(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Expiry date</label>
            <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Invoice no</label>
            <Input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Notes</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Condition, POD ref…" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}><TbPackageImport size={14} /> Receive &amp; update stock</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PoDetailDrawer({
  poId, pos, grns, onClose, onApprove, onReject, onReceive,
}: {
  poId: string | null
  pos: PurchaseOrder[]
  grns: GoodsReceiptNote[]
  onClose: () => void
  onApprove: (id: string) => void
  onReject: (id: string) => void
  onReceive: (id: string) => void
}) {
  const po = poId ? pos.find((p) => p.id === poId) ?? null : null
  const relGrns = po ? grns.filter((g) => g.poId === po.id) : []

  return (
    <SideDrawer open={!!po} title={po?.id ?? 'PO'} onClose={onClose} widthClassName="max-w-[860px]">
      {po && (
        <div>
          <div className="rounded-xl border mb-3.5" style={{ padding: 12, background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
            <div className="grid gap-1.5" style={{ gridTemplateColumns: '140px 1fr', fontSize: 12.5 }}>
              {[
                ['Vendor', po.vendorName],
                ['Item', po.itemName],
                ['Quantity', `${po.qty} ${po.uom}`],
                ['Unit rate', inr(po.unitRate)],
                ['GST', `${po.gst}%`],
                ['Freight', inr(po.freight)],
                ['Total', inr(poTotal(po))],
                ['Payment', po.paymentTerms],
                ['Expected', po.expectedDate],
                ['Generated by', po.createdBy || 'Logistics'],
              ].map(([k, v]) => (
                <FragmentKV key={k as string} k={k as string} v={v as string} />
              ))}
              <div style={{ color: 'var(--qms-text-muted)', fontWeight: 600 }}>Approval</div>
              <div style={{ fontWeight: 600, color: 'var(--qms-text)' }}>
                {po.status === 'AWAITING' ? 'Awaiting Ops Manager' : (po.approvedBy || '—')}
                {po.approvedAt ? ` · ${po.approvedAt}` : ''}
              </div>
              <div style={{ color: 'var(--qms-text-muted)', fontWeight: 600 }}>Status</div>
              <div>
                <PoStatusPill variant={po.status as PoStatusVariant}>{po.status === 'AWAITING' ? 'OM approval' : po.status}</PoStatusPill>
              </div>
            </div>
          </div>

          {po.status === 'AWAITING' && (
            <div
              className="rounded-xl border mb-3.5 flex gap-2 items-center"
              style={{ padding: 12, background: 'rgba(245,158,11,.08)', borderColor: 'var(--qms-border)' }}
            >
              <FiUserCheck size={16} color="#b45309" />
              <div className="text-xs flex-1" style={{ color: 'var(--qms-text)' }}>
                Generated by Logistics — needs <b>Ops Manager</b> approval before goods can be received.
              </div>
              <Button style={{ padding: '5px 12px' }} onClick={() => { onClose(); onApprove(po.id) }}><FiCheck size={14} /> Approve</Button>
              <Button variant="ghost" style={{ padding: '5px 12px' }} onClick={() => { onClose(); onReject(po.id) }}>Reject</Button>
            </div>
          )}

          {relGrns.length > 0 && (
            <>
              <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide mb-1.5 mt-3.5" style={{ color: 'var(--qms-text-soft)' }}>
                <span
                  className="inline-flex items-center justify-center w-5.5 h-5.5 rounded-[7px] shrink-0"
                  style={{ background: 'color-mix(in srgb, var(--qms-brand) 10%, transparent)', color: 'var(--qms-brand)' }}
                >
                  <TbPackageImport size={12} />
                </span>
                Goods receipts
              </div>
              <table className="w-full text-xs border-collapse mb-3.5">
                <thead>
                  <tr>
                    {['GRN', 'Date', 'Accepted', 'Rejected'].map((h, i) => (
                      <th key={h} className={`${TH_CLS} ${i >= 2 ? 'text-right' : ''}`} style={TH_STYLE}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {relGrns.map((g) => (
                    <tr key={g.id}>
                      <td style={TD_STYLE}><b style={{ color: 'var(--qms-text)' }}>{g.id}</b></td>
                      <td style={{ ...TD_STYLE, color: 'var(--qms-text)' }}>{g.date}</td>
                      <td className="text-right tabular-nums" style={{ ...TD_STYLE, color: 'var(--qms-text)' }}>{g.acceptedQty}</td>
                      <td className="text-right tabular-nums" style={{ ...TD_STYLE, color: 'var(--qms-text)' }}>{g.rejectedQty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <div className="flex items-center gap-2 flex-wrap mt-3.5">
            {(po.status === 'OPEN' || po.status === 'PENDING' || po.status === 'DELAYED') && (
              <Button onClick={() => { onClose(); onReceive(po.id) }}><TbPackageImport size={14} /> Receive goods</Button>
            )}
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-lg border text-xs font-medium ml-auto"
              style={{ padding: '7px 12px', borderColor: 'var(--qms-border)', color: 'var(--qms-text)' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </SideDrawer>
  )
}

function FragmentKV({ k, v }: { k: string; v: string }) {
  return (
    <>
      <div style={{ color: 'var(--qms-text-muted)', fontWeight: 600 }}>{k}</div>
      <div style={{ fontWeight: 600, color: 'var(--qms-text)' }}>{v}</div>
    </>
  )
}

export default ProcurementTab
