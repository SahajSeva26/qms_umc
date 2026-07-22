import { useMemo } from 'react'
import {
  FiPlay, FiArrowRight, FiFileText, FiAlertTriangle, FiPackage, FiTrendingDown, FiClock,
  FiCalendar, FiCheckCircle, FiActivity, FiStar, FiCpu, FiAward, FiDollarSign, FiUsers,
} from 'react-icons/fi'
import type { Person } from '@/types/people.types'
import type { Camp } from '@/types/camp.types'
import type { FoClaim, Incident, ConsumableLot, TrainingRecord, TrainingStatus } from '@/features/fo/fo.types'
import KpiTile from '@/components/ui/KpiTile'
import { Button } from '@/components/ui/button'
import { formatINR, formatDate } from '@/utils/formatters'
import MiniCalendar from '@/features/fo/components/workspace/MiniCalendar'

interface DashboardModuleProps {
  me: Person
  camps: Camp[]
  claims: FoClaim[]
  incidents: Incident[]
  consumables: ConsumableLot[]
  training: (TrainingRecord & { status: TrainingStatus })[]
  onRunCamp: (campId: string) => void
  onNavigate: (moduleId: string) => void
}

const NOT_CANCELLED: Camp['status'][] = ['CANCELLED', 'CANCELLED_CHARGED']
// "Finished" excludes COMPLETE_WITHOUT_REPORT on purpose — that status still needs the FO to come
// back and finish closure paperwork, so it must stay runnable (see isRunnable's OR-clause below).
const FINISHED_STATUSES: Camp['status'][] = ['CLOSED', 'COMPLETE', 'INCOMPLETE']
// Used for aggregate counts (KPI tiles, "closed" buckets) where COMPLETE_WITHOUT_REPORT should
// count as closed — distinct from FINISHED_STATUSES, which gates the Run/Finish button.
const CLOSED_STATUSES: Camp['status'][] = ['CLOSED', 'COMPLETE', 'COMPLETE_WITHOUT_REPORT']

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function isRunnable(c: Camp, today: string): boolean {
  if (FINISHED_STATUSES.includes(c.status) || NOT_CANCELLED.includes(c.status)) return false
  return (c.date?.slice(0, 10) ?? '') <= today || c.status === 'LIVE' || c.status === 'COMPLETE_WITHOUT_REPORT'
}

const STATUS_BUCKETS: { id: string; label: string; statuses: Camp['status'][]; tone: string }[] = [
  { id: 'requested', label: 'Requested', statuses: ['REQUESTED'], tone: 'var(--qms-text-muted)' },
  { id: 'upcoming', label: 'Upcoming', statuses: ['CONFIRMED', 'SCHEDULED'], tone: 'var(--qms-brand)' },
  { id: 'live', label: 'Live', statuses: ['LIVE'], tone: 'var(--success)' },
  { id: 'completed', label: 'Completed', statuses: ['CLOSED', 'COMPLETE'], tone: 'var(--qms-teal)' },
  { id: 'pending', label: 'Pending report', statuses: ['COMPLETE_WITHOUT_REPORT', 'INCOMPLETE'], tone: 'var(--warning)' },
]

const DashboardModule = ({ me, camps, claims, incidents, consumables, training, onRunCamp, onNavigate }: DashboardModuleProps) => {
  const today = todayIso()
  const myCamps = useMemo(() => camps.filter((c) => c.foId === me.id), [camps, me.id])

  const todayCamp = useMemo(() => myCamps.find((c) => c.date?.slice(0, 10) === today), [myCamps, today])

  const next7 = useMemo(() => {
    const in7 = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10)
    return myCamps
      .filter((c) => (c.date?.slice(0, 10) ?? '') > today && (c.date?.slice(0, 10) ?? '') <= in7 && !NOT_CANCELLED.includes(c.status))
      .sort((a, b) => (a.date < b.date ? -1 : 1))
  }, [myCamps, today])

  const pendingClosure = useMemo(() => myCamps.filter((c) => {
    const isPastUnclosed = (c.date?.slice(0, 10) ?? '') < today && !FINISHED_STATUSES.includes(c.status) && !NOT_CANCELLED.includes(c.status)
    return c.status === 'INCOMPLETE' || isPastUnclosed
  }), [myCamps, today])

  const openSos = useMemo(() => incidents.filter((i) => i.foId === me.id && i.category === 'sos' && i.status === 'OPEN'), [incidents, me.id])

  const expiringConsumables = useMemo(() => consumables.filter((c) => {
    if (!c.expiry) return false
    const days = (new Date(c.expiry).getTime() - Date.now()) / 86_400_000
    return days >= 0 && days < 30
  }), [consumables])

  const lowStock = useMemo(() => consumables.filter((c) => c.reorderAt != null && c.qty <= c.reorderAt), [consumables])

  const notCheckedIn = !!todayCamp && !todayCamp.checkInAt

  const pendingClaims = useMemo(() => claims.filter((c) => c.foId === me.id && (c.status === 'PENDING' || c.status === 'SUBMITTED')), [claims, me.id])
  const pendingClaimsSum = pendingClaims.reduce((s, c) => s + c.amount, 0)

  const closed = useMemo(() => myCamps.filter((c) => CLOSED_STATUSES.includes(c.status)), [myCamps])
  const upcoming = useMemo(() => myCamps.filter((c) => (c.date?.slice(0, 10) ?? '') >= today && !NOT_CANCELLED.includes(c.status)), [myCamps, today])
  const lifetimePatients = useMemo(() => closed.reduce((s, c) => s + (c.patientsDone || c.patientCount || 0), 0), [closed])

  const expiringCerts = training.filter((t) => t.status === 'VALID' && ((new Date(t.expiresOn).getTime() - Date.now()) / 86_400_000) < 30)

  const statusBucketCounts = useMemo(() => {
    return STATUS_BUCKETS.map((b) => ({ ...b, camps: myCamps.filter((c) => b.statuses.includes(c.status)) }))
  }, [myCamps])

  const runnableTodayCamp = todayCamp && isRunnable(todayCamp, today) ? todayCamp : null

  return (
    <div className="space-y-4">
      {/* Live/today camp banner */}
      {todayCamp ? (
        <div
          className="rounded-2xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap"
          style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
        >
          <div>
            <div className="text-white/80 text-[11px] font-bold uppercase tracking-wide">Today's camp</div>
            <div className="text-white font-extrabold text-[16px] mt-0.5">{todayCamp.id} · {todayCamp.city}</div>
            <div className="text-white/85 text-[12.5px] mt-0.5">{todayCamp.type} · {todayCamp.slot} · {todayCamp.status.replace(/_/g, ' ')}</div>
          </div>
          {runnableTodayCamp && (
            <Button className="shrink-0" style={{ background: 'white', color: 'var(--qms-brand)' }} onClick={() => onRunCamp(todayCamp.id)}>
              <FiPlay size={14} /> {todayCamp.checkInAt ? 'Continue camp' : 'Start camp'}
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-2xl px-5 py-4" style={{ background: 'var(--qms-surface-strong)' }}>
          <div className="text-[13px] font-semibold" style={{ color: 'var(--qms-text)' }}>No camp scheduled today.</div>
          {next7.length > 0 && (
            <div className="text-[12px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
              Next: {next7[0].id} on {formatDate(next7[0].date)}
            </div>
          )}
        </div>
      )}

      {/* Alerts strip */}
      {(pendingClosure.length > 0 || openSos.length > 0 || expiringConsumables.length > 0 || lowStock.length > 0 || notCheckedIn) && (
        <div className="flex flex-wrap gap-2">
          {pendingClosure.length > 0 && (
            <button onClick={() => onNavigate('reports')} className="flex items-center gap-2 text-[12px] font-semibold px-3 py-2 rounded-xl" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
              <FiFileText size={13} /> {pendingClosure.length} camp(s) pending closure
            </button>
          )}
          {openSos.length > 0 && (
            <button onClick={() => onNavigate('incidents')} className="flex items-center gap-2 text-[12px] font-semibold px-3 py-2 rounded-xl" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
              <FiAlertTriangle size={13} /> {openSos.length} open SOS
            </button>
          )}
          {expiringConsumables.length > 0 && (
            <button onClick={() => onNavigate('inventory')} className="flex items-center gap-2 text-[12px] font-semibold px-3 py-2 rounded-xl" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>
              <FiPackage size={13} /> {expiringConsumables.length} consumable(s) expiring
            </button>
          )}
          {lowStock.length > 0 && (
            <button onClick={() => onNavigate('inventory')} className="flex items-center gap-2 text-[12px] font-semibold px-3 py-2 rounded-xl" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>
              <FiTrendingDown size={13} /> {lowStock.length} item(s) low stock
            </button>
          )}
          {notCheckedIn && (
            <button onClick={() => onNavigate('attendance')} className="flex items-center gap-2 text-[12px] font-semibold px-3 py-2 rounded-xl" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>
              <FiClock size={13} /> Not checked in yet
            </button>
          )}
        </div>
      )}

      {/* 10-tile KPI grid */}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
        <KpiTile label="Today's camps" value={String(myCamps.filter((c) => c.date?.slice(0, 10) === today).length)} tone="brand" icon={FiCalendar} />
        <KpiTile label="Upcoming" value={String(upcoming.length)} tone="teal" icon={FiClock} />
        <KpiTile label="Closed" value={String(closed.length)} tone="emerald" icon={FiCheckCircle} />
        <KpiTile label="Pending closure" value={String(pendingClosure.length)} tone="rose" icon={FiFileText} />
        <KpiTile label="Occupancy" value={`${me.occupancyPct ?? 0}%`} tone="amber" icon={FiActivity} />
        <KpiTile label="★ Rating" value={me.feedbackAvg ? me.feedbackAvg.toFixed(1) : '—'} tone="violet" icon={FiStar} />
        <KpiTile label="Devices" value={String((me.machinesAssigned ?? []).length)} tone="teal" icon={FiCpu} />
        <KpiTile label="Certs expiring" value={String(expiringCerts.length)} tone="amber" icon={FiAward} />
        <KpiTile label="Pending claims" value={String(pendingClaims.length)} sub={formatINR(pendingClaimsSum)} tone="rose" icon={FiDollarSign} />
        <KpiTile label="Patients lifetime" value={String(lifetimePatients)} tone="brand" icon={FiUsers} />
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)' }}>
        <div className="space-y-4">
          {/* Camps by status */}
          <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
            <div className="px-3.5 py-2.5 text-[12px] font-bold uppercase tracking-wide border-b" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>Camps by status</div>
            <div className="grid grid-cols-5">
              {statusBucketCounts.map((b) => (
                <button
                  key={b.id}
                  onClick={() => onNavigate('schedule')}
                  className="flex flex-col items-center justify-center gap-1 px-2 py-3.5 border-r last:border-r-0 transition-colors hover:bg-(--qms-surface-hover)"
                  style={{ borderColor: 'var(--qms-border)' }}
                >
                  <div className="text-[20px] font-extrabold" style={{ color: b.tone }}>{b.camps.length}</div>
                  <div className="text-[10.5px] font-semibold text-center" style={{ color: 'var(--qms-text-muted)' }}>{b.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Today + next 7 days list */}
          <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
            <div className="px-3.5 py-2.5 text-[12px] font-bold uppercase tracking-wide border-b" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>Today + next 7 days</div>
            <div>
              {(todayCamp ? [todayCamp, ...next7] : next7).map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 border-t" style={{ borderColor: 'var(--qms-border)' }}>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate text-[13px]" style={{ color: 'var(--qms-text)' }}>
                      {c.id} <span className="font-normal" style={{ color: 'var(--qms-text-muted)' }}>· {c.type}</span>
                      {c.date?.slice(0, 10) === today && (
                        <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>TODAY</span>
                      )}
                    </div>
                    <div className="text-[11.5px]" style={{ color: 'var(--qms-text-muted)' }}>{formatDate(c.date)} · {c.city} · {c.slot}</div>
                  </div>
                  {isRunnable(c, today) && (
                    <Button size="sm" onClick={() => onRunCamp(c.id)}><FiPlay size={12} /> Run</Button>
                  )}
                </div>
              ))}
              {!todayCamp && next7.length === 0 && (
                <div className="text-center py-8 text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>No camps in the next 7 days.</div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Mini-calendar */}
          <MiniCalendar camps={myCamps} onSelectDay={(dayCamps) => { if (dayCamps[0]) onRunCamp(dayCamps[0].id) }} />

          {/* Quick actions */}
          <div className="rounded-xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
            <div className="text-[11px] font-bold uppercase tracking-wide mb-2.5" style={{ color: 'var(--qms-text-muted)' }}>Quick actions</div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="justify-start" onClick={() => onNavigate('attendance')}><FiClock size={13} /> Check-in</Button>
              <Button variant="outline" className="justify-start" onClick={() => onNavigate('incidents')}><FiAlertTriangle size={13} /> SOS</Button>
              <Button variant="outline" className="justify-start" onClick={() => onNavigate('expenses')}><FiFileText size={13} /> File claim</Button>
              <Button variant="outline" className="justify-start" onClick={() => onNavigate('leave')}><FiCalendar size={13} /> Apply leave</Button>
            </div>
            {runnableTodayCamp && (
              <Button className="w-full mt-2.5" onClick={() => onRunCamp(runnableTodayCamp.id)}>
                <FiPlay size={13} /> Run today's camp <FiArrowRight size={13} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardModule
export { isRunnable as isCampRunnable }
