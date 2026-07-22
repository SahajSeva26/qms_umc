import type { ReactNode } from 'react'
import { FiPlusCircle, FiMessageCircle, FiPhone, FiAlertTriangle, FiCheckCircle, FiRotateCw, FiUserPlus } from 'react-icons/fi'
import type { ReminderThread } from '@/features/reminders/reminders.types'
import type { Camp } from '@/types/camp.types'
import type { Person } from '@/types/people.types'
import SideDrawer from '@/components/ui/SideDrawer'
import { Button } from '@/components/ui/button'
import { suggestBackup } from '@/features/reminders/reminders.service'
import { statusLabel, statusColor, fmtDt, fmtCampDate, FAMILY_LABEL, LANGUAGE_LABEL } from '@/features/reminders/reminders.ui'

interface CampTimelineDrawerProps {
  campId: string | null
  threads: ReminderThread[]
  camp: Camp | null
  people: Person[]
  onClose: () => void
  onRetry: (thread: ReminderThread) => void
}

type TimelineEvent = {
  at: string
  cls: 'ok' | 'warn' | 'bad' | 'info'
  icon: typeof FiPlusCircle
  main: ReactNode
}

// familyFor() — maps a thread back to the template family it was dispatched
// under (voice/wa × fo/diet, or submit_diet for POSTSUBMIT_* stages) purely
// for display in the timeline header — mirrors the (recipientType, stage)
// derivation the engine itself uses internally in templateFor().
function familyLabelFor(t: ReminderThread): string {
  if (String(t.stage).startsWith('POSTSUBMIT')) return FAMILY_LABEL.submit_diet
  return t.recipientType === 'FO' ? 'FO reminders (voice + WhatsApp)' : 'Dietitian reminders (voice + WhatsApp)'
}

// buildEvents() — chronological activity log per thread: creation, every
// attempt (WhatsApp send/voice call), the captured response, and any
// escalation — exact port of reminder-automation.js's raOpenCampTimeline().
function buildEvents(thread: ReminderThread): TimelineEvent[] {
  const events: TimelineEvent[] = [
    {
      at: thread.createdAt, cls: 'info', icon: FiPlusCircle,
      main: <>Thread created · {thread.recipientType} {thread.recipientName} · stage {thread.stage} <span className="opacity-70">(language {LANGUAGE_LABEL[thread.language]})</span></>,
    },
  ]

  thread.attempts.forEach((a) => {
    if (a.channel === 'WHATSAPP') {
      events.push({
        at: a.at,
        cls: a.result === 'READ' || a.result === 'DELIVERED' ? 'ok' : 'warn',
        icon: FiMessageCircle,
        main: <>WhatsApp · <b>{a.result.toLowerCase()}</b>{a.messageId ? <span className="opacity-70"> · msg {a.messageId}</span> : null}</>,
      })
    } else {
      events.push({
        at: a.at,
        cls: a.result === 'ANSWERED' ? 'ok' : 'warn',
        icon: FiPhone,
        main: (
          <>
            AI voice call attempt {a.attempt} · <b>{a.result.toLowerCase()}</b>
            {a.ivrKey ? <> · IVR pressed <b>{a.ivrKey}</b></> : null}
            {a.duration ? <span className="opacity-70"> · {a.duration}s</span> : null}
          </>
        ),
      })
    }
  })

  if (thread.response) {
    events.push({
      at: thread.response.at, cls: 'ok', icon: FiCheckCircle,
      main: <>Response captured · <b>{thread.response.label}</b> <span className="opacity-70">(IVR key {thread.response.key})</span></>,
    })
  }

  if (thread.escalation) {
    events.push({
      at: thread.escalation.at, cls: 'bad', icon: FiAlertTriangle,
      main: (
        <>
          Escalated → {thread.escalation.to.join(' · ')}
          <span className="opacity-70"> ({thread.escalation.reason}{thread.escalation.backupSuggestion ? <> · suggest <b>{thread.escalation.backupSuggestion}</b></> : null})</span>
        </>
      ),
    })
  }

  return events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
}

const CampTimelineDrawer = ({ campId, threads, camp, people, onClose, onRetry }: CampTimelineDrawerProps) => {
  if (!campId || !camp) return <SideDrawer open={false} title="" onClose={onClose}>{null}</SideDrawer>

  const campThreads = threads.filter((t) => t.campId === campId)
  const allEvents = campThreads.flatMap((t) => buildEvents(t))
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())

  return (
    <SideDrawer open={!!campId} title={`Activity timeline · ${camp.city} camp`} onClose={onClose} widthClassName="max-w-lg">
      <div className="rounded-xl border p-3 mb-3" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="text-[13px] font-extrabold" style={{ color: 'var(--qms-text)' }}>{camp.city} · {camp.type} camp</div>
        <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{camp.city}{camp.state ? `, ${camp.state}` : ''}</div>
        <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>Camp start: {fmtCampDate(campThreads[0]?.campStartMs)} · slot {camp.slot || '—'}</div>
      </div>

      <div className="rounded-xl border p-3 mb-3" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="text-[11px] mb-2" style={{ color: 'var(--qms-text-muted)' }}>Threads</div>
        {campThreads.map((t) => {
          const showBackup = t.status === 'DELAYED' || t.status === 'NOT_ATTENDING' || t.status === 'ESCALATED'
          const backup = showBackup ? (t.backupSuggestion || suggestBackup(camp, t.recipientType, t.recipientId, people)) : ''
          return (
            <div key={t.id} className="p-2.5 border rounded-lg mb-1.5" style={{ borderColor: 'var(--qms-border)' }}>
              <div className="flex justify-between items-center gap-2">
                <div className="text-[12px] font-bold" style={{ color: 'var(--qms-text)' }}>
                  {t.recipientType} · {t.recipientName} <span className="font-medium text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>({t.stage})</span>
                </div>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0" style={{ background: `color-mix(in srgb, ${statusColor(t.status)} 14%, transparent)`, color: statusColor(t.status) }}>
                  {statusLabel(t.status)}
                </span>
              </div>
              <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{t.recipientPhone || '—'} · language {LANGUAGE_LABEL[t.language]} · {familyLabelFor(t)}</div>
              <div className="flex gap-1.5 mt-1.5">
                <Button size="sm" variant="ghost" className="text-[11px]" onClick={() => onRetry(t)}>
                  <FiRotateCw size={11} /> Retry
                </Button>
              </div>
              {showBackup && (
                <div className="mt-2 p-2 rounded-lg flex items-center gap-2" style={{ background: 'rgba(244,63,94,.08)', border: '1px dashed rgba(244,63,94,.35)' }}>
                  <FiUserPlus size={13} style={{ color: '#f43f5e' }} className="shrink-0" />
                  <div className="text-[11px]" style={{ color: 'var(--qms-text-soft)' }}>
                    {statusLabel(t.status)} · suggested backup: <b>{backup || 'no replacement available'}</b>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="rounded-xl border p-3" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="text-[11px] mb-2" style={{ color: 'var(--qms-text-muted)' }}>Automation activity timeline</div>
        {allEvents.length === 0 ? (
          <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>No activity yet</p>
        ) : (
          <div className="flex flex-col gap-3">
            {allEvents.map((ev, i) => {
              const dotColor = ev.cls === 'ok' ? '#10b981' : ev.cls === 'warn' ? '#f59e0b' : ev.cls === 'bad' ? '#f43f5e' : '#0ea5e9'
              const Icon = ev.icon
              return (
                <div key={i} className="flex gap-2.5 items-start">
                  <div className="flex flex-col items-center self-stretch shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full border-2 shrink-0 mt-0.5" style={{ background: dotColor, borderColor: dotColor }} />
                    {i < allEvents.length - 1 && <span className="w-px flex-1 mt-1" style={{ background: 'var(--qms-border)' }} />}
                  </div>
                  <div className="min-w-0 flex-1 -mt-0.5 pb-0.5">
                    <div className="flex gap-1.5 items-start">
                      <Icon size={13} className="mt-0.5 shrink-0" style={{ color: 'var(--qms-text-muted)' }} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-semibold" style={{ color: 'var(--qms-text)' }}>{ev.main}</div>
                        <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{fmtDt(ev.at)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </SideDrawer>
  )
}

export default CampTimelineDrawer
