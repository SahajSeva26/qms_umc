import { useMemo, useState } from 'react'
import { toast } from '@/components/ui/sonner'
import type { ReminderThread } from '@/features/reminders/reminders.types'
import type { Camp } from '@/types/camp.types'
import type { Person } from '@/types/people.types'
import { statusLabel, statusColor, fmtCampDate } from '@/features/reminders/reminders.ui'
import CampTimelineDrawer from '@/features/reminders/components/CampTimelineDrawer'

interface CampTimelinesTabProps {
  threads: ReminderThread[]
  camps: Camp[]
  people: Person[]
  manualTrigger: (campId: string, recipientType: ReminderThread['recipientType'], recipientId: string, stage: string) => Promise<unknown>
}

const CampTimelinesTab = ({ threads, camps, people, manualTrigger }: CampTimelinesTabProps) => {
  const [openCampId, setOpenCampId] = useState<string | null>(null)

  const byCamp = useMemo(() => {
    const map = new Map<string, ReminderThread[]>()
    threads.forEach((t) => {
      const list = map.get(t.campId) ?? []
      list.push(t)
      map.set(t.campId, list)
    })
    return map
  }, [threads])

  const campIds = useMemo(() => {
    return Array.from(byCamp.keys()).sort((a, b) => {
      const aMin = Math.min(...(byCamp.get(a) ?? []).map((t) => t.campStartMs ?? Infinity))
      const bMin = Math.min(...(byCamp.get(b) ?? []).map((t) => t.campStartMs ?? Infinity))
      return aMin - bMin
    })
  }, [byCamp])

  const openCamp = openCampId ? (camps.find((c) => c.id === openCampId) ?? null) : null

  const handleRetry = async (thread: ReminderThread) => {
    try {
      const t = await manualTrigger(thread.campId, thread.recipientType, thread.recipientId, thread.stage)
      toast.success(t ? `Retry dispatched · ${thread.recipientType} ${thread.recipientName}` : 'Retry failed')
    } catch {
      toast.error('Retry failed')
    }
  }

  return (
    <div>
      <div className="rounded-xl border p-3 mb-3" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="text-[13px] font-extrabold" style={{ color: 'var(--qms-text)' }}>Per-camp automation timeline</div>
        <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
          {campIds.length} camp(s) with reminder activity · click any card to see the full timeline
        </div>
      </div>

      {campIds.length === 0 ? (
        <div className="rounded-xl border p-7 text-center text-[13px]" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
          No reminder threads yet. Open <b>Triggers</b> to fire reminders manually or in bulk.
        </div>
      ) : (
        campIds.map((cid) => {
          const ts = byCamp.get(cid) ?? []
          const first = ts[0]
          const statusCounts = new Map<string, number>()
          ts.forEach((t) => statusCounts.set(t.status, (statusCounts.get(t.status) ?? 0) + 1))
          const recipients = Array.from(new Set(ts.map((t) => `${t.recipientType}: ${t.recipientName}`)))
          return (
            <button
              key={cid}
              onClick={() => setOpenCampId(cid)}
              className="w-full text-left rounded-xl border p-3.5 mb-2.5 transition-colors hover:bg-(--qms-surface-hover)"
              style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
            >
              <div className="flex justify-between items-start gap-2.5 flex-wrap">
                <div className="min-w-0">
                  <div className="font-extrabold text-[14px]" style={{ color: 'var(--qms-text)' }}>{first?.campName ?? cid}</div>
                  <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
                    {first?.clientName} · {first?.campCity}{first?.campState ? `, ${first.campState}` : ''} · {fmtCampDate(first?.campStartMs)}
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>{recipients.join(' · ')}</div>
                </div>
                <div className="flex flex-wrap gap-1 justify-end">
                  {Array.from(statusCounts.entries()).map(([s, count]) => (
                    <span key={s} className="inline-flex items-center gap-1">
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full" style={{ background: `color-mix(in srgb, ${statusColor(s as ReminderThread['status'])} 14%, transparent)`, color: statusColor(s as ReminderThread['status']) }}>
                        {statusLabel(s as ReminderThread['status'])}
                      </span>
                      <span className="text-[11px] mr-1" style={{ color: 'var(--qms-text-muted)' }}>×{count}</span>
                    </span>
                  ))}
                </div>
              </div>
            </button>
          )
        })
      )}

      <CampTimelineDrawer
        campId={openCampId}
        camp={openCamp}
        threads={threads}
        people={people}
        onClose={() => setOpenCampId(null)}
        onRetry={handleRetry}
      />
    </div>
  )
}

export default CampTimelinesTab
