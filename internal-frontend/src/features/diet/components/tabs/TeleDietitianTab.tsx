import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/sonner'
import type { useDietCamps } from '@/features/diet/hooks/useDietCamps'
import { errorMessage } from '@/features/diet/utils/errorMessage'
import type { TeleConsultStatus } from '@/features/diet/diet.types'

interface TeleDietitianTabProps {
  diet: ReturnType<typeof useDietCamps>
  viewOnly: boolean
}

const STATUS_STYLE: Record<TeleConsultStatus, { bg: string; color: string }> = {
  SCHEDULED: { bg: 'rgba(59,109,255,.12)', color: 'var(--qms-brand)' },
  COMPLETED: { bg: 'var(--success-soft)', color: 'var(--success)' },
  NO_SHOW: { bg: 'var(--warning-soft)', color: 'var(--warning)' },
  CANCELLED: { bg: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' },
}

const TeleDietitianTab = ({ diet, viewOnly }: TeleDietitianTabProps) => {
  const [bookOpen, setBookOpen] = useState(false)
  const [patientName, setPatientName] = useState('')
  const [completingId, setCompletingId] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [plan, setPlan] = useState('')

  // Both dialogs stay open when the write fails, so a failed booking or
  // completion can be retried instead of silently vanishing.
  const handleBook = async () => {
    if (!patientName.trim()) return
    try {
      await diet.bookTeleConsult.mutateAsync({
        patientName, phone: '', condition: '', dietitianId: diet.dietitians[0]?.id ?? '', clientId: '',
        date: new Date().toISOString().slice(0, 10), time: '11:00', mode: 'Video', status: 'SCHEDULED', notes: '', plan: '',
      })
    } catch (err) {
      toast.error(errorMessage(err, 'Could not book the tele-consult — try again.'))
      return
    }
    setPatientName(''); setBookOpen(false)
  }

  const completingConsult = diet.teleConsults.find((t) => t.id === completingId)

  const handleComplete = async () => {
    if (!completingId) return
    try {
      await diet.setTeleConsultStatus.mutateAsync({ id: completingId, status: 'COMPLETED', notes, plan })
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save the consult — try again.'))
      return
    }
    setCompletingId(null); setNotes(''); setPlan('')
  }

  // Row actions share one mutation across every row, so an isPending disable
  // would grey out unrelated rows. They are single-click status flips —
  // surfacing the failure is what matters, not blocking the click.
  const setStatus = async (id: string, status: TeleConsultStatus) => {
    try {
      await diet.setTeleConsultStatus.mutateAsync({ id, status })
    } catch (err) {
      toast.error(errorMessage(err, 'Could not update the consult — try again.'))
    }
  }

  return (
    <div>
      {!viewOnly && (
        <div className="flex justify-end mb-3">
          <Button size="sm" onClick={() => setBookOpen(true)}>Book tele-consult</Button>
        </div>
      )}

      <div className="rounded-xl border overflow-x-auto" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ background: 'var(--qms-surface-strong)' }}>
              {['Patient', 'Condition', 'Date · Time', 'Mode', 'Status', ''].map((h) => (
                <th key={h} className="text-left font-semibold px-3 py-2.5 text-[11px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {diet.teleConsults.map((t) => (
              <tr key={t.id} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                <td className="px-3 py-2.5 font-semibold" style={{ color: 'var(--qms-text)' }}>{t.patientName}</td>
                <td className="px-3 py-2.5" style={{ color: 'var(--qms-text-soft)' }}>{t.condition || '—'}</td>
                <td className="px-3 py-2.5 text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{t.date} · {t.time}</td>
                <td className="px-3 py-2.5" style={{ color: 'var(--qms-text-soft)' }}>{t.mode}</td>
                <td className="px-3 py-2.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: STATUS_STYLE[t.status].bg, color: STATUS_STYLE[t.status].color }}>{t.status}</span>
                </td>
                <td className="px-3 py-2.5">
                  {!viewOnly && t.status === 'SCHEDULED' && (
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => setCompletingId(t.id)}>Complete</Button>
                      <Button size="sm" variant="ghost" onClick={() => setStatus(t.id, 'NO_SHOW')}>No-show</Button>
                      <Button size="sm" variant="destructive" onClick={() => setStatus(t.id, 'CANCELLED')}>Cancel</Button>
                    </div>
                  )}
                  {!viewOnly && (t.status === 'CANCELLED' || t.status === 'NO_SHOW') && (
                    <Button size="sm" variant="outline" onClick={() => setStatus(t.id, 'SCHEDULED')}>Reschedule</Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={bookOpen} onOpenChange={setBookOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Book tele-consult</DialogTitle></DialogHeader>
          <Input value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Patient name" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookOpen(false)}>Cancel</Button>
            <Button disabled={!patientName.trim() || diet.bookTeleConsult.isPending} onClick={handleBook}>Book</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!completingId} onOpenChange={(o) => !o && setCompletingId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Complete — {completingConsult?.patientName}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" rows={2} />
            <Textarea value={plan} onChange={(e) => setPlan(e.target.value)} placeholder="Diet plan" rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompletingId(null)}>Cancel</Button>
            <Button onClick={handleComplete} disabled={diet.setTeleConsultStatus.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default TeleDietitianTab
