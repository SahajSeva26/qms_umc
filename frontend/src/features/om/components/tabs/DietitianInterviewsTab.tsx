import { useState } from 'react'
import { FiCheck, FiX, FiCheckCircle } from 'react-icons/fi'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import type { useOm } from '@/features/om/hooks/useOm'
import { formatDate } from '@/utils/formatters'

interface DietitianInterviewsTabProps {
  om: ReturnType<typeof useOm>
}

function initials(name: string) { return name.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase() }
function stringToColor(s: string) {
  const palette = ['#3b6dff', '#a855f7', '#10b981', '#f59e0b', '#0ea5e9', '#ec4899', '#14b8a6', '#7c5cff', '#f43f5e', '#84cc16']
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return palette[h % palette.length]
}

const Check = ({ ok }: { ok: boolean }) => (
  <span className="font-extrabold" style={{ color: ok ? '#047857' : '#b91c1c' }}>{ok ? '✓' : '✗'}</span>
)

// Mirrors tabDietInterviews() + omDietInterviewForm() exactly (om-portal.js:
// 1849-1927) — queue = enrollments with status SUBMITTED, card-list layout
// (not a table), notes mandatory for both Approve and Reject.
const DietitianInterviewsTab = ({ om }: DietitianInterviewsTabProps) => {
  const { user } = useAuth()
  const [decidingId, setDecidingId] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<'APPROVED' | 'REJECTED'>('APPROVED')
  const [notes, setNotes] = useState('')

  const queue = om.dietEnrollments.filter((d) => d.status === 'SUBMITTED')
  const deciding = om.dietEnrollments.find((d) => d.id === decidingId)
  const isReject = outcome === 'REJECTED'

  const openForm = (id: string, decision: 'APPROVED' | 'REJECTED') => {
    setDecidingId(id)
    setOutcome(decision)
    setNotes('')
  }

  const handleDecide = () => {
    if (!decidingId || !notes.trim()) return
    om.omInterviewDecision(decidingId, outcome, notes, user?.firstName ?? 'OM · Diet')
    setDecidingId(null); setNotes('')
  }

  return (
    <div>
      <div className="rounded-xl p-3.5 mb-3" style={{ background: 'rgba(59,109,255,.05)', borderLeft: '3px solid #3b6dff' }}>
        <div className="text-[13px] font-extrabold" style={{ color: 'var(--qms-text)' }}>Dietitian interviews ({queue.length})</div>
        <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
          Newly-enrolled dietitians who finished onboarding and were submitted for the OM·Diet interview. Approve to unlock camp assignment; reject with a reason.
        </div>
      </div>

      {queue.length === 0 ? (
        <div className="rounded-xl border p-6 text-center" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <FiCheckCircle size={22} style={{ color: '#10b981' }} className="mx-auto" />
          <div className="font-bold mt-1.5" style={{ color: 'var(--qms-text)' }}>No interviews pending</div>
          <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>Dietitians appear here once they submit their onboarding.</div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {queue.map((d) => {
            const banks = d.bankAccounts ?? []
            const devices = d.deviceAlignment ?? []
            const hasResume = !!d.resumeUrl?.trim()
            return (
              <div key={d.id} className="rounded-xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
                <div className="flex justify-between gap-2.5 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex gap-2 items-center">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-[11px] shrink-0" style={{ background: stringToColor(d.name) }}>{initials(d.name)}</div>
                      <div>
                        <div className="font-extrabold text-[13px]" style={{ color: 'var(--qms-text)' }}>{d.name || d.id}</div>
                        <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{d.specialty || 'Clinical nutrition'} · {d.hq || '—'} · applied {formatDate(d.appliedOn)}</div>
                      </div>
                    </div>
                    <div className="flex gap-3.5 flex-wrap text-[11.5px] mt-2" style={{ color: 'var(--qms-text-soft)' }}>
                      <span><Check ok={banks.length >= 1} /> Bank ({banks.length})</span>
                      <span>
                        <Check ok={hasResume} /> Resume
                        {hasResume && <a href={d.resumeUrl} target="_blank" rel="noreferrer" className="font-bold ml-1" style={{ color: '#0d9488' }}>view</a>}
                      </span>
                      <span><Check ok={devices.length >= 1} /> Devices: {devices.length ? devices.join(', ') : '—'}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Button size="sm" onClick={() => openForm(d.id, 'APPROVED')}><FiCheck size={13} /> Approve</Button>
                    <Button size="sm" variant="ghost" style={{ color: 'var(--danger)' }} onClick={() => openForm(d.id, 'REJECTED')}><FiX size={13} /> Reject</Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={!!decidingId} onOpenChange={(o) => !o && setDecidingId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{isReject ? 'Reject' : 'Approve'} · {deciding?.name}</DialogTitle></DialogHeader>
          <p className="text-[12px] -mt-2" style={{ color: 'var(--qms-text-muted)' }}>
            {isReject ? 'Record the interview notes and a reason for rejection' : 'Record the OM·Diet interview notes'}
          </p>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={isReject ? 'Reason the dietitian did not clear the interview' : 'Outcome of the onboarding interview'}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecidingId(null)}>Cancel</Button>
            <Button variant={isReject ? 'destructive' : 'default'} disabled={!notes.trim()} onClick={handleDecide}>
              {isReject ? <FiX size={13} /> : <FiCheck size={13} />} Confirm {isReject ? 'rejection' : 'approval'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default DietitianInterviewsTab
