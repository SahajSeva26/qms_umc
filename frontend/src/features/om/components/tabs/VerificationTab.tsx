import { useState } from 'react'
import { FiAlertTriangle } from 'react-icons/fi'
import type { Camp, Doctor } from '@/types/camp.types'
import type { Person } from '@/types/people.types'
import { useAuth } from '@/hooks/useAuth'
import { useErp } from '@/features/om/hooks/useErp'
import { completedCamps, verificationFor } from '@/features/om/erp.service'
import { VSTATUS, vMeta } from '@/features/om/erp.types'
import type { VerificationStatusId } from '@/features/om/erp.types'
import KpiTile from '@/components/ui/KpiTile'
import { FiClipboard, FiCheckCircle, FiClock, FiXCircle, FiDollarSign, FiShieldOff } from 'react-icons/fi'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { clientName } from '@/types/campref.types'

interface VerificationTabProps {
  camps: Camp[]
  doctors: Doctor[]
  fos: Person[]
}

// Mirrors renderVerification/erpVerChange/erpRejectSubmit/erpReinstate*
// exactly (erp-screening.js:176-296) — a QA gate on every completed
// Screening camp before it's billable.
const VerificationTab = ({ camps, fos }: VerificationTabProps) => {
  const { user } = useAuth()
  const erp = useErp()
  const [decidingId, setDecidingId] = useState<string | null>(null)
  const [pendingStatus, setPendingStatus] = useState<VerificationStatusId>('REJECTED')
  const [reason, setReason] = useState('')
  const [rootCause, setRootCause] = useState('')
  const [correctiveAction, setCorrectiveAction] = useState('')
  const [responsible, setResponsible] = useState('')

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
  const completed = completedCamps(camps)
  const byName = user ? `${user.firstName} ${user.lastName}` : 'Ops Manager'

  const reviewed = completed.filter((c) => verificationFor(erp.verification, c.id).reviewed).length
  const rejected = completed.filter((c) => verificationFor(erp.verification, c.id).status === 'REJECTED').length
  const blocked = completed.filter((c) => !vMeta(verificationFor(erp.verification, c.id).status).billable).length
  const reopenPending = completed.filter((c) => verificationFor(erp.verification, c.id).reinstate?.status === 'REQUESTED').length

  const handleSelectChange = (campId: string, status: VerificationStatusId) => {
    if (status === 'ACCEPTED') {
      erp.acceptVerification(campId, byName)
    } else {
      setDecidingId(campId); setPendingStatus(status)
      setReason(''); setRootCause(''); setCorrectiveAction(''); setResponsible('')
    }
  }

  const handleSubmitDecision = () => {
    if (!decidingId || !reason.trim() || !rootCause.trim() || !correctiveAction.trim() || !responsible.trim()) return
    erp.submitVerificationDecision(decidingId, pendingStatus, reason, rootCause, correctiveAction, responsible, byName)
    setDecidingId(null)
  }

  return (
    <div>
      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
        <KpiTile label="Completed" value={String(completed.length)} tone="brand" icon={FiClipboard} />
        <KpiTile label="Reviewed" value={String(reviewed)} tone="emerald" icon={FiCheckCircle} />
        <KpiTile label="Pending verification" value={String(completed.length - reviewed)} tone="amber" icon={FiClock} />
        <KpiTile label="Rejected" value={String(rejected)} tone="rose" icon={FiXCircle} />
        <KpiTile label="Revenue blocked" value={String(blocked)} tone="rose" icon={FiDollarSign} />
        <KpiTile label="Reopen requests" value={String(reopenPending)} tone="violet" icon={FiShieldOff} />
      </div>

      <div className="rounded-xl border overflow-x-auto" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ background: 'var(--qms-surface-strong)' }}>
              {['Camp', 'Client · Project', 'FO', 'Verification', 'Action'].map((h) => (
                <th key={h} className="text-left font-semibold px-3 py-2.5 text-[11px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {completed.map((c) => {
              const rec = verificationFor(erp.verification, c.id)
              const meta = vMeta(rec.status)
              const fo = fos.find((f) => f.id === c.foId)
              return (
                <tr key={c.id} className="border-t" style={!meta.billable ? { background: 'var(--danger-soft)', borderColor: 'var(--qms-border)' } : { borderColor: 'var(--qms-border)' }}>
                  <td className="px-3 py-2.5 font-semibold" style={{ color: 'var(--qms-text)' }}>{c.id}</td>
                  <td className="px-3 py-2.5" style={{ color: 'var(--qms-text-soft)' }}>{clientName(c.clientId)} · {c.projectId}</td>
                  <td className="px-3 py-2.5" style={{ color: 'var(--qms-text-soft)' }}>{fo?.name ?? '—'}</td>
                  <td className="px-3 py-2.5">
                    <Select value={rec.status} onValueChange={(v) => v && handleSelectChange(c.id, v as VerificationStatusId)}>
                      <SelectTrigger className="text-[12px]" style={{ color: meta.tone }}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {VSTATUS.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {rec.reason && <p className="text-[10px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>{rec.reason}</p>}
                  </td>
                  <td className="px-3 py-2.5">
                    {!meta.billable && !rec.reinstate && (
                      <Button size="sm" variant="outline" onClick={() => erp.requestReinstate(c.id, byName)}>Request reopen</Button>
                    )}
                    {rec.reinstate?.status === 'REQUESTED' && isAdmin && (
                      <div className="flex gap-1.5">
                        <Button size="sm" onClick={() => erp.decideReinstate(c.id, 'APPROVED', byName)}>Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => erp.decideReinstate(c.id, 'REJECTED', byName)}>Deny</Button>
                      </div>
                    )}
                    {rec.reinstate?.status === 'REQUESTED' && !isAdmin && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
                        <FiAlertTriangle size={10} className="inline mr-1" /> Reopen pending admin
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
            {completed.length === 0 && (
              <tr><td colSpan={5} className="text-center py-8 text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>No completed Screening camps yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!decidingId} onOpenChange={(o) => !o && setDecidingId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Justification required — {vMeta(pendingStatus).label}</DialogTitle></DialogHeader>
          <div className="space-y-2 text-[13px]">
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason*" />
            <Input value={rootCause} onChange={(e) => setRootCause(e.target.value)} placeholder="Root cause*" />
            <Input value={correctiveAction} onChange={(e) => setCorrectiveAction(e.target.value)} placeholder="Corrective action*" />
            <Input value={responsible} onChange={(e) => setResponsible(e.target.value)} placeholder="Responsible person*" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecidingId(null)}>Cancel</Button>
            <Button disabled={!reason.trim() || !rootCause.trim() || !correctiveAction.trim() || !responsible.trim()} onClick={handleSubmitDecision}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default VerificationTab
