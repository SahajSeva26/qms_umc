import { useMemo } from 'react'
import { FiCpu, FiClock, FiCheckCircle, FiAlertTriangle, FiMessageCircle, FiPhone, FiRefreshCw, FiWatch, FiVolume2 } from 'react-icons/fi'
import type { ReminderThread, ThreadAttempt } from '@/features/reminders/reminders.types'
import { summary } from '@/features/reminders/reminders.service'
import { num, ago } from '@/features/reminders/reminders.ui'

interface DashboardTabProps {
  threads: ReminderThread[]
  isLoading: boolean
  onRefresh: () => void
}

const PANEL_STYLE: React.CSSProperties = { background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }

function Kpi({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub?: string; icon: typeof FiCpu; color: string }) {
  return (
    <div className="rounded-xl border p-3.5" style={PANEL_STYLE}>
      <div className="flex items-center gap-2.5">
        <div
          className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
          style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
        >
          <Icon size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{label}</div>
          <div className="font-extrabold text-[21px] leading-tight" style={{ color: 'var(--qms-text)', letterSpacing: '-.02em' }}>{value}</div>
          {sub && <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>{sub}</div>}
        </div>
      </div>
    </div>
  )
}

// Live activity feed — every thread's attempts[] flattened + sorted newest
// first, exact match to reminder-automation.js's tabDashboard() feed build.
function buildFeed(threads: ReminderThread[]) {
  const events: { at: string; thread: ReminderThread; attempt: ThreadAttempt }[] = []
  threads.forEach((t) => {
    t.attempts.forEach((a) => events.push({ at: a.at, thread: t, attempt: a }))
  })
  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  return events.slice(0, 18)
}

const DashboardTab = ({ threads, isLoading, onRefresh }: DashboardTabProps) => {
  const s = useMemo(() => summary(threads), [threads])
  const pending = (s.by.SCHEDULED ?? 0) + (s.by.IN_PROGRESS ?? 0)

  const byState = useMemo(() => {
    const map: Record<string, number> = {}
    threads.forEach((t) => { const st = t.campState || '—'; map[st] = (map[st] ?? 0) + 1 })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [threads])
  const stateMax = Math.max(1, ...byState.map(([, v]) => v))

  const feed = useMemo(() => buildFeed(threads), [threads])

  return (
    <div>
      <div className="rounded-xl border p-3 mb-3 flex items-center justify-between gap-2 flex-wrap" style={PANEL_STYLE}>
        <div>
          <div className="text-[13px] font-extrabold" style={{ color: 'var(--qms-text)' }}>
            Reminder automation summary
          </div>
          <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
            {num(threads.length)} thread(s) tracked across all upcoming camps
          </div>
        </div>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50"
          style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-soft)' }}
        >
          <FiRefreshCw size={13} className={isLoading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))' }}>
        <Kpi label="Total reminders" value={num(s.total)} sub={`${num(threads.length)} threads`} icon={FiCpu} color="#7c5cff" />
        <Kpi label="Pending confirmations" value={num(pending)} sub="Awaiting reply" icon={FiClock} color="#0ea5e9" />
        <Kpi label="Confirmed" value={num(s.by.CONFIRMED ?? 0)} sub="IVR key 1" icon={FiCheckCircle} color="#10b981" />
        <Kpi label="Escalated" value={num(s.by.ESCALATED ?? 0)} sub="Coordinator notified" icon={FiAlertTriangle} color="#f43f5e" />
        <Kpi label="WA delivery" value={`${s.waDeliveryPct}%`} sub={`${num(s.waDelivered)}/${num(s.waSent)} delivered`} icon={FiMessageCircle} color="#10b981" />
        <Kpi label="Call success" value={`${s.callSuccessPct}%`} sub={`${num(s.callsAnswered)}/${num(s.callsPlaced)} answered`} icon={FiPhone} color="#3b6dff" />
        <Kpi label="Avg response" value={s.avgResponseMins != null ? `${s.avgResponseMins} min` : '—'} sub="Send → IVR confirm" icon={FiWatch} color="#f59e0b" />
        <Kpi label="Avg call duration" value={`${s.avgCallDuration}s`} sub="On answered calls" icon={FiVolume2} color="#7c5cff" />
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1.2fr' }}>
        <div className="rounded-xl border p-3.5" style={PANEL_STYLE}>
          <div className="text-[13px] font-extrabold mb-2" style={{ color: 'var(--qms-text)' }}>Region-wise (by camp state)</div>
          {byState.length === 0 ? (
            <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>No reminders yet · run a tick or trigger one manually</p>
          ) : (
            byState.map(([state, count]) => (
              <div key={state} className="mb-2">
                <div className="flex justify-between text-[12px] font-semibold mb-0.5">
                  <span style={{ color: 'var(--qms-text)' }}>{state}</span>
                  <span style={{ color: 'var(--qms-text-muted)' }}>{num(count)} threads</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,.06)' }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.round((100 * count) / stateMax)}%`, background: 'linear-gradient(90deg,#7c5cff,#3b6dff)' }} />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="rounded-xl border p-3.5" style={PANEL_STYLE}>
          <div className="flex justify-between items-center mb-2">
            <div className="text-[13px] font-extrabold" style={{ color: 'var(--qms-text)' }}>Live activity feed</div>
            <button onClick={onRefresh} className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-soft)' }}>
              <FiRefreshCw size={11} /> Refresh
            </button>
          </div>
          <div className="flex flex-col gap-1.5 max-h-95 overflow-auto pr-1">
            {feed.length === 0 ? (
              <p className="text-[12px] text-center py-5" style={{ color: 'var(--qms-text-muted)' }}>No activity yet · open Triggers to fire a reminder</p>
            ) : (
              feed.map((ev, i) => {
                const isWa = ev.attempt.channel === 'WHATSAPP'
                const color = isWa
                  ? '#10b981'
                  : ev.attempt.result === 'ANSWERED' ? '#3b6dff'
                  : ev.attempt.result === 'NO_ANSWER' || ev.attempt.result === 'BUSY' || ev.attempt.result === 'REJECTED' ? '#f59e0b'
                  : '#64748b'
                const Icon = isWa ? FiMessageCircle : FiPhone
                return (
                  <div key={`${ev.thread.id}-${i}`} className="flex gap-2.5 items-start p-2 rounded-lg border" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
                    <div className="w-6 h-6 rounded-[7px] flex items-center justify-center shrink-0 text-white" style={{ background: color }}>
                      <Icon size={12} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-semibold" style={{ color: 'var(--qms-text)' }}>
                        {isWa ? (
                          <>WhatsApp <b>{ev.attempt.result.toLowerCase()}</b></>
                        ) : (
                          <>AI voice call · {ev.attempt.result.toLowerCase()}{ev.attempt.ivrKey ? <> · IVR <b>{ev.attempt.ivrKey}</b></> : null}</>
                        )}
                        {' '}· {ev.thread.recipientType} {ev.thread.recipientName}
                      </div>
                      <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
                        {ev.thread.campName} · {ev.thread.stage} · {ago(ev.at)}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardTab
