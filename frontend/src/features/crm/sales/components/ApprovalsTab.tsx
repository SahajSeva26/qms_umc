import { useState } from 'react'
import type { IconType } from 'react-icons'
import { FiHome, FiLayers, FiUser, FiTag, FiEye } from 'react-icons/fi'
import type { ApprovalRequest, ApprovalStatus, ApprovalType, SalesRep } from '@/types/salesdash.types'
import { APPROVAL_STATUS_COLORS, tintStyle } from '@/features/crm/sales/sales.utils'
import { requestSchema, rejectSchema } from '@/features/crm/sales/schemas'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import SideDrawer from '@/components/ui/SideDrawer'
import KeyValueGrid from '@/components/ui/KeyValueGrid'
import { formatDate } from '@/utils/formatters'

const TYPE_META: Record<ApprovalType, { label: string; color: string; icon: IconType; fields: { key: string; label: string }[] }> = {
  CLIENT: { label: 'Pharma company', color: '#3b6dff', icon: FiHome, fields: [{ key: 'city', label: 'City' }, { key: 'state', label: 'State' }, { key: 'contact', label: 'Contact' }] },
  DIVISION: { label: 'Division', color: '#14b8a6', icon: FiLayers, fields: [{ key: 'therapy', label: 'Therapy' }, { key: 'brandFocus', label: 'Brand focus' }] },
  MARKETING: { label: 'Marketing person', color: '#ec4899', icon: FiUser, fields: [{ key: 'designation', label: 'Designation' }, { key: 'email', label: 'Email' }] },
  BRAND: { label: 'Brand', color: '#a855f7', icon: FiTag, fields: [{ key: 'generic', label: 'Generic' }, { key: 'therapy', label: 'Therapy' }] },
}

const FILTERS: (ApprovalStatus | 'ALL')[] = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN']

function recordMeta(request: ApprovalRequest): string {
  const meta = TYPE_META[request.type]
  return meta.fields
    .map((f) => request.record[f.key])
    .filter(Boolean)
    .join(' · ')
}

const labelClasses = 'block text-[10px] font-semibold tracking-widest uppercase mb-2'
const labelStyle = { color: 'var(--qms-text-muted)' }

interface ApprovalsTabProps {
  approvals: ApprovalRequest[]
  isApprover: boolean
  meRep: SalesRep | null
  userName: string
  onApprove: (id: string, note: string) => void
  onReject: (id: string, reason: string) => void
  onWithdraw: (id: string) => void
  onSubmit: (type: ApprovalType, record: Record<string, string>) => void
}

const ApprovalsTab = ({ approvals, isApprover, meRep, userName, onApprove, onReject, onWithdraw, onSubmit }: ApprovalsTabProps) => {
  const [filter, setFilter] = useState<ApprovalStatus | 'ALL'>('PENDING')
  const [requestType, setRequestType] = useState<ApprovalType | null>(null)
  const [decision, setDecision] = useState<{ id: string; kind: 'approve' | 'reject' } | null>(null)
  const [withdrawId, setWithdrawId] = useState<string | null>(null)
  const [viewId, setViewId] = useState<string | null>(null)

  const mine = isApprover
    ? approvals
    : approvals.filter((r) => (meRep ? r.submittedBy === meRep.name : r.submittedBy.startsWith(userName)))

  const counts = FILTERS.reduce((acc, f) => {
    acc[f] = f === 'ALL' ? mine.length : mine.filter((r) => r.status === f).length
    return acc
  }, {} as Record<string, number>)

  const visible = filter === 'ALL' ? mine : mine.filter((r) => r.status === filter)
  const viewRequest = approvals.find((r) => r.id === viewId) ?? null

  return (
    <div>
      <div className="grid grid-cols-3 gap-2.5 mb-4">
        {(['PENDING', 'APPROVED', 'REJECTED'] as ApprovalStatus[]).map((status) => (
          <div key={status} className="rounded-xl border p-3 text-center" style={{ background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)' }}>
            <div className="text-xl font-extrabold" style={{ color: APPROVAL_STATUS_COLORS[status] }}>
              {mine.filter((r) => r.status === status).length}
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--qms-text-muted)' }}>{status}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all"
            style={
              f === filter
                ? { background: 'var(--qms-brand)', borderColor: 'var(--qms-brand)', color: '#fff' }
                : { background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }
            }
          >
            {f} {counts[f]}
          </button>
        ))}
        {!isApprover && (
          <div className="ml-auto flex gap-1.5">
            {(Object.keys(TYPE_META) as ApprovalType[]).map((t) => (
              <Button key={t} variant="outline" size="sm" onClick={() => setRequestType(t)}>
                Request {TYPE_META[t].label.toLowerCase()}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
                {['Type', 'Record', 'Submitted by', 'When', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="text-left font-bold text-[11px] uppercase tracking-wider px-3 py-2 whitespace-nowrap" style={{ color: 'var(--qms-text-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((request) => {
                const meta = TYPE_META[request.type]
                const Icon = meta.icon
                const canDecide = isApprover && request.status === 'PENDING'
                const canWithdraw = !isApprover && request.status === 'PENDING'
                return (
                  <tr key={request.id} style={{ borderBottom: '1px solid var(--qms-border)' }}>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={tintStyle(meta.color)}>
                          <Icon size={13} />
                        </span>
                        <span className="text-[12px] font-semibold" style={{ color: 'var(--qms-text)' }}>{meta.label}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="font-semibold" style={{ color: 'var(--qms-text)' }}>{request.record.name}</div>
                      <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{recordMeta(request) || '—'}</div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div style={{ color: 'var(--qms-text)' }}>{request.submittedBy}</div>
                      <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{request.submittedByEmail}</div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--qms-text-muted)' }}>{formatDate(request.submittedAt)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider" style={tintStyle(APPROVAL_STATUS_COLORS[request.status])}>
                        {request.status}
                      </span>
                      {request.reviewNote && (
                        <div className="text-[10px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>{request.reviewNote}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex gap-1.5">
                        {canDecide && (
                          <>
                            <Button size="xs" onClick={() => setDecision({ id: request.id, kind: 'approve' })}>Approve</Button>
                            <Button size="xs" variant="destructive" onClick={() => setDecision({ id: request.id, kind: 'reject' })}>Reject</Button>
                          </>
                        )}
                        {canWithdraw && (
                          <Button size="xs" variant="secondary" onClick={() => setWithdrawId(request.id)}>Withdraw</Button>
                        )}
                        <Button size="xs" variant="ghost" onClick={() => setViewId(request.id)}>
                          <FiEye size={12} /> View
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {visible.length === 0 && (
            <div className="px-4 py-10 text-center text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
              {isApprover ? 'No requests in this filter.' : 'You have no requests yet — use the Request buttons above.'}
            </div>
          )}
        </div>
      </div>

      {requestType && (
        <RequestDialog
          type={requestType}
          onClose={() => setRequestType(null)}
          onSubmit={(record) => {
            onSubmit(requestType, record)
            setRequestType(null)
          }}
        />
      )}

      {decision && (
        <DecisionDialog
          kind={decision.kind}
          onClose={() => setDecision(null)}
          onConfirm={(text) => {
            if (decision.kind === 'approve') onApprove(decision.id, text)
            else onReject(decision.id, text)
            setDecision(null)
          }}
        />
      )}

      {withdrawId && (
        <Dialog open onOpenChange={(o) => { if (!o) setWithdrawId(null) }}>
          <DialogContent className="sm:max-w-sm" showCloseButton={false}>
            <DialogHeader>
              <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>Withdraw request?</DialogTitle>
            </DialogHeader>
            <p className="text-[13px]" style={{ color: 'var(--qms-text-soft)' }}>This removes it from the approval queue.</p>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setWithdrawId(null)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => {
                  onWithdraw(withdrawId)
                  setWithdrawId(null)
                }}
              >
                Withdraw
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <SideDrawer open={!!viewRequest} title={viewRequest ? `${TYPE_META[viewRequest.type].label} request` : ''} onClose={() => setViewId(null)}>
        {viewRequest && (
          <div className="space-y-4">
            <KeyValueGrid
              columns={2}
              items={[
                { label: 'Request ID', value: viewRequest.id },
                { label: 'Status', value: viewRequest.status },
                { label: 'Submitted by', value: viewRequest.submittedBy },
                { label: 'Submitted at', value: formatDate(viewRequest.submittedAt) },
                { label: 'Reviewed by', value: viewRequest.reviewedBy },
                { label: 'Review note', value: viewRequest.reviewNote },
              ]}
            />
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>Record</h3>
              <KeyValueGrid
                columns={2}
                items={Object.entries(viewRequest.record).map(([key, value]) => ({ label: key, value }))}
              />
            </div>
          </div>
        )}
      </SideDrawer>
    </div>
  )
}

const RequestDialog = ({ type, onClose, onSubmit }: { type: ApprovalType; onClose: () => void; onSubmit: (record: Record<string, string>) => void }) => {
  const meta = TYPE_META[type]
  const [record, setRecord] = useState<Record<string, string>>({ name: '' })
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = () => {
    const result = requestSchema.safeParse(record)
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Name is required.')
      return
    }
    onSubmit(record)
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-sm" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>Request new {meta.label.toLowerCase()}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className={labelClasses} style={labelStyle}>Name *</Label>
            <Input
              value={record.name ?? ''}
              onChange={(e) => {
                setRecord((prev) => ({ ...prev, name: e.target.value }))
                setError(null)
              }}
              className="text-[13px]"
            />
          </div>
          {meta.fields.map((f) => (
            <div key={f.key}>
              <Label className={labelClasses} style={labelStyle}>{f.label}</Label>
              <Input
                value={record[f.key] ?? ''}
                onChange={(e) => setRecord((prev) => ({ ...prev, [f.key]: e.target.value }))}
                className="text-[13px]"
              />
            </div>
          ))}
          {error && <p className="text-[11px] text-danger">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Submit for approval</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const DecisionDialog = ({ kind, onClose, onConfirm }: { kind: 'approve' | 'reject'; onClose: () => void; onConfirm: (text: string) => void }) => {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = () => {
    if (kind === 'reject') {
      const result = rejectSchema.safeParse({ reason: text })
      if (!result.success) {
        setError(result.error.issues[0]?.message ?? 'A rejection reason is required.')
        return
      }
    }
    onConfirm(text.trim())
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-sm" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>
            {kind === 'approve' ? 'Approve request' : 'Reject request'}
          </DialogTitle>
        </DialogHeader>
        <div>
          <Label className={labelClasses} style={labelStyle}>
            {kind === 'approve' ? 'Note (optional)' : 'Reason *'}
          </Label>
          <Textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setError(null)
            }}
            rows={3}
            className="text-[13px]"
          />
          {error && <p className="text-[11px] mt-1 text-danger">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant={kind === 'reject' ? 'destructive' : 'default'} onClick={handleConfirm}>
            {kind === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ApprovalsTab
