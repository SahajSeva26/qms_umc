import { useMemo, useState } from 'react'
import {
  RefreshCw, TriangleAlert, Boxes, Plus, Check, X, Truck, Info, ShoppingBag, Save,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { toast } from '@/components/ui/sonner'
import {
  useFieldOps, useHolders, useHolderHoldings, useFieldOpsSegment, useFieldOpsHolder,
} from '@/features/inventory/hooks/useInventory'
import { inr, inrShort, holderName, holderKind, consumableItems, itemById } from '@/features/inventory/inventory.service'
import type { NewRefillInput, NewReportInput, NewLocalProcureInput } from '@/features/inventory/inventory.service'
import type {
  Holder, RefillRequest, RefillStatus, FieldReport, IssueType,
} from '@/features/inventory/inventory.types'
import { ISSUE_TYPES } from '@/features/inventory/inventory.types'
import type { Person } from '@/types/people.types'

// Exact port of window.QMS_InvField.tabFieldOps() (inventory-field.js) — a
// 3-way segmented control (Refills / Issues / Allocations) reusing the
// shared allocations ledger (qms.inventory.allocations) that Field Ops itself
// owns writing to (Warehouse's dietHoldings()/FO Inventory's
// foConsumableHoldings() only read it). No page-level KPI tiles specific to
// this tab — only inline numeric badges (segment button pending count, loss
// value in the Issues toolbar).
const FieldOpsTab = () => {
  const data = useFieldOps()
  const {
    units, people, refills, reports, isLoading,
    approveRefill, rejectRefill, dispatchRefill, saveRefill, saveReport, saveLocalProcure,
  } = data
  const { seg, setSeg } = useFieldOpsSegment()
  const { holder, setHolder } = useFieldOpsHolder()
  const hs = useHolders(people)

  // Modal state — shared across all 3 sub-views (New refill / Report stock
  // event / Local procurement), matching the prototype's single shared
  // #modalBackdrop reused for every Field Ops action.
  const [refillOpen, setRefillOpen] = useState(false)
  const [refillPreset, setRefillPreset] = useState<string | undefined>(undefined)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportPreset, setReportPreset] = useState<{ holder?: string; itemId?: string }>({})
  const [localProcureOpen, setLocalProcureOpen] = useState(false)
  const [localProcurePreset, setLocalProcurePreset] = useState<string | undefined>(undefined)

  // FIELD.holder default — exact port of viewAlloc()'s `if (!FIELD.holder &&
  // hs.length) FIELD.holder = hs[0].code` guard, applied at render time.
  const activeHolder = holder || hs[0]?.code || ''

  const pendingRefills = useMemo(() => refills.filter((r) => r.status === 'REQUESTED').length, [refills])

  const openRefill = (presetHolder?: string) => {
    setRefillPreset(presetHolder)
    setRefillOpen(true)
  }
  const openReport = (presetHolder?: string, presetItem?: string) => {
    setReportPreset({ holder: presetHolder, itemId: presetItem })
    setReportOpen(true)
  }
  const openLocalProcure = (presetHolder?: string) => {
    setLocalProcurePreset(presetHolder)
    setLocalProcureOpen(true)
  }

  const handleApprove = async (r: RefillRequest) => {
    await approveRefill(r.id)
    toast.success(`${r.id} approved`)
  }
  const handleReject = async (r: RefillRequest) => {
    await rejectRefill(r.id)
    toast.error(`${r.id} rejected`)
  }
  const handleDispatch = async (r: RefillRequest) => {
    await dispatchRefill(r.id)
    // Exact port of the prototype's fallback `else` toast branch — the
    // Warehouse module's own Transfer-creation modal handoff is out of this
    // tab's scope (WarehouseTab/TransfersTab own that modal locally).
    toast.success(`${r.id} → transfer drafted to ${holderName(r.holder, people)}`)
  }

  const handleSaveRefill = async (input: NewRefillInput) => {
    if (!input.qty) {
      toast.error('Enter quantity')
      return
    }
    await saveRefill(input)
    setRefillOpen(false)
    setSeg('refills')
    toast.success(`Refill requested for ${holderName(input.holder, people)}`)
  }

  const handleSaveReport = async (input: NewReportInput) => {
    if (!input.qty) {
      toast.error('Enter quantity')
      return
    }
    await saveReport(input)
    setReportOpen(false)
    setSeg('issues')
    toast[input.type === 'RETURN' ? 'success' : 'info'](`${input.type} logged · ${input.qty} off ${holderName(input.holder, people)}`)
  }

  const handleSaveLocalProcure = async (input: NewLocalProcureInput) => {
    if (!input.qty) {
      toast.error('Enter quantity')
      return
    }
    await saveLocalProcure(input)
    setLocalProcureOpen(false)
    toast.success(`Local procurement added to ${holderName(input.holder, people)}`)
  }

  if (isLoading) {
    return (
      <div className="text-center" style={{ padding: 48, color: 'var(--qms-text-muted)' }}>
        Loading field ops…
      </div>
    )
  }

  return (
    <div>
      {/* .fld-seg — segmented control, 3 buttons */}
      <div
        className="inline-flex gap-1 p-1 rounded-[10px] mb-3.5"
        style={{ background: 'var(--qms-surface-strong, rgba(0,0,0,.04))' }}
      >
        <SegButton active={seg === 'refills'} onClick={() => setSeg('refills')} icon={<RefreshCw size={13} />}>
          Refill requests{pendingRefills ? ` (${pendingRefills})` : ''}
        </SegButton>
        <SegButton active={seg === 'issues'} onClick={() => setSeg('issues')} icon={<TriangleAlert size={13} />}>
          Wastage / Damage / Loss
        </SegButton>
        <SegButton active={seg === 'alloc'} onClick={() => setSeg('alloc')} icon={<Boxes size={13} />}>
          Allocations
        </SegButton>
      </div>

      {seg === 'refills' && (
        <RefillsView
          refills={refills}
          people={people}
          onNew={() => openRefill()}
          onApprove={handleApprove}
          onReject={handleReject}
          onDispatch={handleDispatch}
        />
      )}

      {seg === 'issues' && (
        <IssuesView reports={reports} people={people} onNew={() => openReport()} />
      )}

      {seg === 'alloc' && (
        <AllocationsView
          holders={hs}
          holder={activeHolder}
          onSetHolder={setHolder}
          refreshKey={[refills, reports]}
          onRefill={(h) => openRefill(h)}
          onReport={(h, itemId) => openReport(h, itemId)}
          onLocalProcure={(h) => openLocalProcure(h)}
        />
      )}

      <NewRefillModal
        open={refillOpen}
        onClose={() => setRefillOpen(false)}
        holders={hs}
        presetHolder={refillPreset}
        onSave={handleSaveRefill}
      />
      <ReportStockModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        holders={hs}
        presetHolder={reportPreset.holder}
        presetItem={reportPreset.itemId}
        onSave={handleSaveReport}
      />
      <LocalProcureModal
        open={localProcureOpen}
        onClose={() => setLocalProcureOpen(false)}
        holders={hs}
        presetHolder={localProcurePreset}
        onSave={handleSaveLocalProcure}
      />

      {/* units is read by useFieldOps() only to seed the allocations ledger
          via foConsumableHoldings() — not otherwise rendered by this tab. */}
      <span className="hidden">{units.length}</span>
    </div>
  )
}

function SegButton({
  active, onClick, icon, children,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg text-xs font-bold border-0"
      style={{
        padding: '6px 14px',
        background: active ? 'var(--qms-card)' : 'transparent',
        color: active ? 'var(--qms-text)' : 'var(--qms-text-muted)',
        boxShadow: active ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
      }}
    >
      {icon} {children}
    </button>
  )
}

// ── Status pills — .fld-st + variant, exact port of injectCss()'s color map. ──
const REFILL_STATUS_STYLE: Record<RefillStatus, { bg: string; fg: string }> = {
  REQUESTED: { bg: 'rgba(245,158,11,.16)', fg: '#b45309' },
  APPROVED: { bg: 'rgba(59,109,255,.14)', fg: 'var(--qms-brand-700, #2451f0)' },
  DISPATCHED: { bg: 'rgba(16,185,129,.15)', fg: '#059669' },
  REJECTED: { bg: 'rgba(244,63,94,.15)', fg: '#e11d48' },
}

function RefillStatusPill({ status }: { status: RefillStatus }) {
  const s = REFILL_STATUS_STYLE[status]
  return (
    <span
      className="inline-flex items-center font-bold uppercase tracking-[.03em] rounded-full"
      style={{ padding: '2px 8px', fontSize: 10, background: s.bg, color: s.fg }}
    >
      {status}
    </span>
  )
}

const ISSUE_TYPE_STYLE: Record<IssueType, { bg: string; fg: string }> = {
  WASTAGE: { bg: 'rgba(244,63,94,.12)', fg: '#e11d48' },
  DAMAGE: { bg: 'rgba(244,63,94,.12)', fg: '#e11d48' },
  LOSS: { bg: 'rgba(244,63,94,.12)', fg: '#e11d48' },
  EXPIRY: { bg: 'rgba(244,63,94,.12)', fg: '#e11d48' },
  CONSUMPTION: { bg: 'rgba(59,109,255,.12)', fg: 'var(--qms-brand-700, #2451f0)' },
  RETURN: { bg: 'rgba(16,185,129,.13)', fg: '#059669' },
  LOCAL_PROCURE: { bg: 'rgba(16,185,129,.13)', fg: '#059669' },
}

function IssueTypePill({ type }: { type: IssueType }) {
  const s = ISSUE_TYPE_STYLE[type]
  return (
    <span
      className="inline-flex items-center font-bold uppercase tracking-[.03em] rounded-full"
      style={{ padding: '2px 8px', fontSize: 10, background: s.bg, color: s.fg }}
    >
      {type.replace('_', ' ')}
    </span>
  )
}

// .im-band pill — exact port of the shared expiry-band color map (identical
// rgba values to inventory-masters.js's own copy; inventory-field.js
// redeclares it locally so the tab works standalone).
const BAND_STYLE: Record<'green' | 'yellow' | 'orange' | 'red', { bg: string; fg: string }> = {
  green: { bg: 'rgba(16,185,129,.15)', fg: '#059669' },
  yellow: { bg: 'rgba(234,179,8,.18)', fg: '#a16207' },
  orange: { bg: 'rgba(249,115,22,.16)', fg: '#c2410c' },
  red: { bg: 'rgba(244,63,94,.15)', fg: '#e11d48' },
}

function BandPill({ css, children }: { css: 'green' | 'yellow' | 'orange' | 'red'; children: React.ReactNode }) {
  const s = BAND_STYLE[css]
  return (
    <span
      className="inline-flex items-center gap-1 font-bold uppercase rounded-full"
      style={{ padding: '2px 8px', fontSize: 10, letterSpacing: '.03em', background: s.bg, color: s.fg }}
    >
      {children}
    </span>
  )
}

// ── Shared toolbar/table shell — .inv-filter + .inv-card, exact port. ──────
function Toolbar({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex gap-2 items-center flex-wrap mb-3 rounded-[10px] border sticky z-25"
      style={{ padding: '10px 12px', background: 'var(--qms-surface)', borderColor: 'var(--qms-border)', top: 60 }}
    >
      {children}
    </div>
  )
}

function TableCard({ minWidth, children }: { minWidth: number; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border overflow-auto" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
      <table className="border-collapse text-xs" style={{ width: '100%', minWidth }}>
        {children}
      </table>
    </div>
  )
}

function Th({ children, num }: { children: React.ReactNode; num?: boolean }) {
  return (
    <th
      className={`text-left font-bold uppercase tracking-[.04em] ${num ? 'text-right' : ''}`}
      style={{ padding: '8px 6px', fontSize: 10, color: 'var(--qms-text-muted)', borderBottom: '1px dashed var(--qms-border)' }}
    >
      {children}
    </th>
  )
}

function Td({ children, num, nowrap }: { children: React.ReactNode; num?: boolean; nowrap?: boolean }) {
  return (
    <td
      className={num ? 'text-right tabular-nums' : ''}
      style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)', whiteSpace: nowrap ? 'nowrap' : undefined }}
    >
      {children}
    </td>
  )
}

// ── (A) Refills sub-view — exact port of viewRefills(). ────────────────────
function RefillsView({
  refills, people, onNew, onApprove, onReject, onDispatch,
}: {
  refills: RefillRequest[]
  people: Person[]
  onNew: () => void
  onApprove: (r: RefillRequest) => void
  onReject: (r: RefillRequest) => void
  onDispatch: (r: RefillRequest) => void
}) {
  const list = useMemo(
    () => [...refills].sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    [refills],
  )

  return (
    <div>
      <Toolbar>
        <span className="text-xs font-bold uppercase tracking-[.04em]" style={{ color: 'var(--qms-text-muted)' }}>
          Refill requests · FO &amp; dietitian
        </span>
        <span className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>
          Request → Inventory Manager approve → dispatch (transfer)
        </span>
        <Button className="ml-auto" onClick={onNew}>
          <Plus size={14} /> New refill
        </Button>
      </Toolbar>

      <TableCard minWidth={780}>
        <thead>
          <tr>
            <Th>Request</Th><Th>Holder</Th><Th>Item</Th><Th num>Qty</Th><Th>Reason</Th><Th>Status</Th><Th>Action</Th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 ? (
            <tr><td colSpan={7} className="text-center" style={{ padding: 24, color: 'var(--qms-text-muted)' }}>No refill requests.</td></tr>
          ) : (
            list.map((r) => (
              <tr key={r.id}>
                <Td>
                  <b style={{ color: 'var(--qms-text)' }}>{r.id}</b>
                  <div className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>{r.date}</div>
                </Td>
                <Td>
                  {holderName(r.holder, people)}
                  <div className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>{holderKind(r.holder)}</div>
                </Td>
                <Td>{r.itemName}</Td>
                <Td num>{r.qty} {r.uom}</Td>
                <Td>{r.reason || '—'}</Td>
                <Td><RefillStatusPill status={r.status} /></Td>
                <Td nowrap>
                  {r.status === 'REQUESTED' && (
                    <>
                      <Button style={{ padding: '4px 9px' }} onClick={() => onApprove(r)}>
                        <Check size={13} />
                      </Button>{' '}
                      <Button variant="ghost" style={{ padding: '4px 9px' }} onClick={() => onReject(r)}>
                        <X size={13} />
                      </Button>
                    </>
                  )}
                  {r.status === 'APPROVED' && (
                    <Button style={{ padding: '4px 10px' }} onClick={() => onDispatch(r)}>
                      <Truck size={13} /> Dispatch
                    </Button>
                  )}
                  {r.status === 'DISPATCHED' && (
                    <span className="text-xs" style={{ color: '#059669' }}>transfer raised</span>
                  )}
                  {r.status === 'REJECTED' && <span className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>—</span>}
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </TableCard>
    </div>
  )
}

// ── (B) Issues sub-view — exact port of viewIssues(). ──────────────────────
function IssuesView({
  reports, people, onNew,
}: {
  reports: FieldReport[]
  people: Person[]
  onNew: () => void
}) {
  const list = useMemo(
    () => [...reports].sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    [reports],
  )
  const lossValue = useMemo(() => {
    return list
      .filter((r) => r.type === 'WASTAGE' || r.type === 'DAMAGE' || r.type === 'LOSS' || r.type === 'EXPIRY')
      .reduce((a, r) => {
        const it = itemById(r.itemId)
        return a + (r.qty || 0) * (it?.purchaseCost || 0)
      }, 0)
  }, [list])

  return (
    <div>
      <Toolbar>
        <span className="text-xs font-bold uppercase tracking-[.04em]" style={{ color: 'var(--qms-text-muted)' }}>
          Field reports
        </span>
        <span className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>
          Wastage · damage · loss · expiry · consumption · return · {inrShort(lossValue)} loss value
        </span>
        <Button className="ml-auto" onClick={onNew}>
          <Plus size={14} /> New report
        </Button>
      </Toolbar>

      <TableCard minWidth={760}>
        <thead>
          <tr>
            <Th>Report</Th><Th>Holder</Th><Th>Item</Th><Th num>Qty</Th><Th>Type</Th><Th>Reason</Th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 ? (
            <tr><td colSpan={6} className="text-center" style={{ padding: 24, color: 'var(--qms-text-muted)' }}>No reports.</td></tr>
          ) : (
            list.map((r) => (
              <tr key={r.id}>
                <Td>
                  <b style={{ color: 'var(--qms-text)' }}>{r.id}</b>
                  <div className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>{r.date}</div>
                </Td>
                <Td>
                  {holderName(r.holder, people)}
                  <div className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>{holderKind(r.holder)}</div>
                </Td>
                <Td>{r.itemName}</Td>
                <Td num>{r.qty} {r.uom}</Td>
                <Td><IssueTypePill type={r.type} /></Td>
                <Td>{r.reason || '—'}</Td>
              </tr>
            ))
          )}
        </tbody>
      </TableCard>
    </div>
  )
}

// ── (C) Allocations sub-view — exact port of viewAlloc(). ──────────────────
function AllocationsView({
  holders, holder, onSetHolder, refreshKey, onRefill, onReport, onLocalProcure,
}: {
  holders: Holder[]
  holder: string
  onSetHolder: (h: string) => void
  refreshKey: unknown
  onRefill: (holder: string) => void
  onReport: (holder: string, itemId: string) => void
  onLocalProcure: (holder: string) => void
}) {
  const hold = useHolderHoldings(holder, refreshKey)

  return (
    <div>
      <Toolbar>
        <span className="text-xs font-bold uppercase tracking-[.04em]" style={{ color: 'var(--qms-text-muted)' }}>
          Allocations
        </span>
        <Select value={holder} onValueChange={(v) => onSetHolder(v ?? '')}>
          <SelectTrigger className="w-[220px] text-[12.5px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {holders.map((h) => <SelectItem key={h.code} value={h.code}>{h.kind} · {h.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs ml-auto" style={{ color: 'var(--qms-text-muted)' }}>
          {inrShort(hold?.value ?? 0)} held
        </span>
        <Button variant="ghost" onClick={() => onLocalProcure(holder)}>
          <ShoppingBag size={14} /> Local procurement
        </Button>
        <Button onClick={() => onRefill(holder)}>
          <Plus size={14} /> Refill
        </Button>
      </Toolbar>

      <TableCard minWidth={720}>
        <thead>
          <tr>
            <Th>Item</Th><Th>Batch</Th><Th num>On hand</Th><Th>Expiry</Th><Th num>Value</Th><Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {!hold || hold.consumables.length === 0 ? (
            <tr><td colSpan={6} className="text-center" style={{ padding: 24, color: 'var(--qms-text-muted)' }}>No stock allocated.</td></tr>
          ) : (
            hold.consumables.map((c) => (
              <tr key={c.item.id}>
                <Td>
                  <b style={{ color: 'var(--qms-text)' }}>{c.item.name}</b>
                  <div className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>{c.item.code || ''}</div>
                </Td>
                <Td>{c.item.batchNo || '—'}</Td>
                <Td num>{c.qty} {c.item.uom || ''}</Td>
                <Td>{c.band ? <BandPill css={c.band.css}>{c.band.label}</BandPill> : '—'}</Td>
                <Td num>{inr(c.value)}</Td>
                <Td nowrap>
                  <Button variant="ghost" style={{ padding: '4px 8px' }} title="Request refill" onClick={() => onRefill(holder)}>
                    <RefreshCw size={13} />
                  </Button>{' '}
                  <Button variant="ghost" style={{ padding: '4px 8px' }} title="Report wastage/damage/loss" onClick={() => onReport(holder, c.item.id)}>
                    <TriangleAlert size={13} />
                  </Button>
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </TableCard>
    </div>
  )
}

// ── Modal (1): New refill request — exact port of openRefill()/saveRefill(). ──
function NewRefillModal({
  open, onClose, holders, presetHolder, onSave,
}: {
  open: boolean
  onClose: () => void
  holders: Holder[]
  presetHolder?: string
  onSave: (input: NewRefillInput) => void | Promise<void>
}) {
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
          <Button onClick={handleSave}><Save size={14} /> Raise request</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Modal (2): Report stock event — exact port of openReport()/saveReport(). ──
function ReportStockModal({
  open, onClose, holders, presetHolder, presetItem, onSave,
}: {
  open: boolean
  onClose: () => void
  holders: Holder[]
  presetHolder?: string
  presetItem?: string
  onSave: (input: NewReportInput) => void | Promise<void>
}) {
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
          <Info size={12} /> RETURN sends stock back to Central WH; others write it off the holder.
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}><Save size={14} /> Submit report</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Modal (3): Emergency local procurement — exact port of
// openLocalProcure()/saveLocalProcure(). ──────────────────────────────────
function LocalProcureModal({
  open, onClose, holders, presetHolder, onSave,
}: {
  open: boolean
  onClose: () => void
  holders: Holder[]
  presetHolder?: string
  onSave: (input: NewLocalProcureInput) => void | Promise<void>
}) {
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
          <Button onClick={handleSave}><Check size={14} /> Record + add to stock</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default FieldOpsTab
