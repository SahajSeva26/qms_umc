import { useMemo, useState } from 'react'
import { FiBellOff, FiZap, FiBell } from 'react-icons/fi'
import { toast } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import type { ReminderThread, RecipientType } from '@/features/reminders/reminders.types'
import type { Camp } from '@/types/camp.types'
import type { Person } from '@/types/people.types'
import { recipientsFor, campStartMs } from '@/features/reminders/reminders.service'
import { useReminderConfig } from '@/features/reminders/hooks/useReminders'
import { statusLabel, statusColor, fmtCampDate } from '@/features/reminders/reminders.ui'

interface TriggersTabProps {
  camps: Camp[]
  people: Person[]
  threads: ReminderThread[]
  manualTrigger: (campId: string, recipientType: RecipientType, recipientId: string, stage: string) => Promise<ReminderThread | null>
  bulkTrigger: (stage: string) => Promise<number>
  runTick: () => Promise<{ created: number; dispatched: number; skipped?: 'holiday' }>
}

interface Row {
  camp: Camp
  recipient: { type: RecipientType; id: string; name: string; phone: string }
  stage: 'T24' | 'T2'
  startMs: number
  existing?: ReminderThread
}

const TriggersTab = ({ camps, people, threads, manualTrigger, bulkTrigger, runTick }: TriggersTabProps) => {
  const { config } = useReminderConfig()
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [bulkBusy, setBulkBusy] = useState<'T24' | 'T2' | null>(null)
  const [tickBusy, setTickBusy] = useState(false)

  const have = useMemo(() => {
    const map = new Map<string, ReminderThread>()
    threads.forEach((t) => map.set(`${t.campId}|${t.recipientType}|${t.recipientId}|${t.stage}`, t))
    return map
  }, [threads])

  const rows = useMemo(() => {
    const list: Row[] = []
    camps.forEach((c) => {
      const sUp = String(c.status || '').toUpperCase()
      if (['CLOSED', 'CANCELLED', 'CANCELLED_CHARGED'].includes(sUp)) return
      const startMs = campStartMs(c)
      if (!startMs) return
      recipientsFor(c, people).forEach((r) => {
        (['T24', 'T2'] as const).forEach((stage) => {
          const key = `${c.id}|${r.type}|${r.id}|${stage}`
          list.push({ camp: c, recipient: r, stage, startMs, existing: have.get(key) })
        })
      })
    })
    list.sort((a, b) => a.startMs - b.startMs)
    return list
  }, [camps, people, have])

  const handleTrigger = async (row: Row) => {
    const key = `${row.camp.id}|${row.recipient.type}|${row.recipient.id}|${row.stage}`
    setBusyKey(key)
    try {
      const t = await manualTrigger(row.camp.id, row.recipient.type, row.recipient.id, row.stage)
      toast.success(t ? `Dispatched · status ${statusLabel(t.status)}` : 'Trigger failed')
    } catch {
      toast.error('Trigger failed')
    } finally {
      setBusyKey(null)
    }
  }

  const handleBulk = async (stage: 'T24' | 'T2') => {
    setBulkBusy(stage)
    try {
      const n = await bulkTrigger(stage)
      toast.success(`Bulk ${stage} · ${n} new reminder thread(s)`)
    } catch {
      toast.error('Bulk trigger failed')
    } finally {
      setBulkBusy(null)
    }
  }

  const handleTick = async () => {
    setTickBusy(true)
    try {
      const r = await runTick()
      if (r.skipped === 'holiday') toast.info('Tick skipped · holiday mode is on')
      else toast.success(r.created ? `Tick fired · ${r.created} new reminder thread(s)` : 'Tick · no new reminders due')
    } catch {
      toast.error('Tick failed')
    } finally {
      setTickBusy(false)
    }
  }

  return (
    <div>
      <div className="rounded-xl border p-3 mb-3 flex items-center justify-between gap-2 flex-wrap" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div>
          <div className="text-[13px] font-extrabold" style={{ color: 'var(--qms-text)' }}>Manual triggers</div>
          <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
            Fire a reminder now (bypasses the lead-time gate). Bulk-trigger every pending recipient at the right stage with one click.
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <Button variant="ghost" onClick={() => handleBulk('T24')} disabled={bulkBusy !== null}>
            <FiBell size={14} /> {bulkBusy === 'T24' ? 'Running…' : 'Bulk T-24h'}
          </Button>
          <Button variant="ghost" onClick={() => handleBulk('T2')} disabled={bulkBusy !== null}>
            <FiBell size={14} /> {bulkBusy === 'T2' ? 'Running…' : 'Bulk T-2h'}
          </Button>
          <Button onClick={handleTick} disabled={tickBusy}>
            <FiZap size={14} /> {tickBusy ? 'Running…' : 'Run tick'}
          </Button>
        </div>
      </div>

      {config && (
        <div className="rounded-xl border p-3 mb-3 text-[12px]" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }}>
          Lead times — T-24h: <b>{config.leadTimes.T24 / 60}h</b> · T-2h: <b>{config.leadTimes.T2 / 60}h</b> · escalate after <b>{config.sla.escalateAfterCalls}</b> unanswered calls · response SLA <b>{config.sla.responseMinutes} min</b> · engine{' '}
          <b style={{ color: config.enabled ? '#047857' : '#b91c1c' }}>{config.enabled ? 'ENABLED' : 'DISABLED'}</b>
          {config.holiday && <> · <b style={{ color: '#b91c1c' }}>HOLIDAY MODE</b></>}
        </div>
      )}

      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="overflow-x-auto max-w-full">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
                {['Camp', 'Camp start', 'Stage', 'Recipient', 'Status', ''].map((h) => (
                  <th key={h} className="text-left px-3 py-2 font-semibold text-[11px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-6" style={{ color: 'var(--qms-text-muted)' }}>
                    <div className="flex flex-col items-center gap-1.5">
                      <FiBellOff size={16} />
                      No upcoming camps with a recipient
                    </div>
                  </td>
                </tr>
              ) : (
                rows.slice(0, 60).map((row) => {
                  const key = `${row.camp.id}|${row.recipient.type}|${row.recipient.id}|${row.stage}`
                  return (
                    <tr key={key} style={{ borderBottom: '1px solid var(--qms-border)' }}>
                      <td className="px-3 py-2">
                        <div className="font-bold" style={{ color: 'var(--qms-text)' }}>{row.camp.id}</div>
                        <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{row.camp.type} · {row.camp.city}</div>
                      </td>
                      <td className="px-3 py-2" style={{ color: 'var(--qms-text-soft)' }}>{fmtCampDate(row.startMs)}</td>
                      <td className="px-3 py-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(124,92,255,.14)', color: '#7c5cff' }}>{row.stage}</span>
                      </td>
                      <td className="px-3 py-2">
                        <b style={{ color: 'var(--qms-text)' }}>{row.recipient.type}</b>
                        <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{row.recipient.name}</div>
                      </td>
                      <td className="px-3 py-2">
                        {row.existing ? (
                          <>
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full" style={{ background: `color-mix(in srgb, ${statusColor(row.existing.status)} 14%, transparent)`, color: statusColor(row.existing.status) }}>
                              {statusLabel(row.existing.status)}
                            </span>
                            {row.existing.attempts.length > 0 && (
                              <div className="text-[11px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>{row.existing.attempts.length} attempt(s)</div>
                            )}
                          </>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(148,163,184,.16)', color: '#475569' }}>Not yet fired</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <Button size="sm" onClick={() => handleTrigger(row)} disabled={busyKey === key}>
                          <FiZap size={11} /> {row.existing ? 'Re-dispatch' : 'Trigger now'}
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default TriggersTab
