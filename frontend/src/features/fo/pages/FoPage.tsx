import { useMemo, useState } from 'react'
import {
  FiUsers, FiCalendar, FiBarChart2, FiCpu, FiFileText, FiAward, FiShield, FiBriefcase,
  FiUpload, FiDownload, FiPlus, FiZap, FiCheckCircle, FiClock, FiStar, FiActivity, FiPhone, FiMail, FiMapPin,
} from 'react-icons/fi'
import { useAuth } from '@/hooks/useAuth'
import { usePeopleData } from '@/hooks/usePeopleData'
import { useCampsData } from '@/hooks/useCampsData'
import { useFoClaims, useFoTraining, useFoLeaves } from '@/features/fo/hooks/useFo'
import type { Person } from '@/types/people.types'
import KpiTile from '@/components/ui/KpiTile'
import { toast } from '@/components/ui/sonner'
import { formatINR } from '@/utils/formatters'
import { foLiveStatus, EMP_TYPE_CONFIG, STATUS_LABEL } from '@/features/fo/components/fo.ui'
import FoDrawer from '@/features/fo/components/FoDrawer'
import AddPersonnelModal from '@/features/fo/components/AddPersonnelModal'
import RosterTab from '@/features/fo/components/tabs/RosterTab'
import AssignmentsTab from '@/features/fo/components/tabs/AssignmentsTab'
import PerformanceTab from '@/features/fo/components/tabs/PerformanceTab'
import DevicesTab from '@/features/fo/components/tabs/DevicesTab'
import ExpensesTab from '@/features/fo/components/tabs/ExpensesTab'
import TrainingTab from '@/features/fo/components/tabs/TrainingTab'
import PersonnelTab from '@/features/fo/components/tabs/PersonnelTab'

type TabId = 'roster' | 'assignments' | 'performance' | 'devices' | 'expenses' | 'training' | 'qmsfo' | 'tpfo' | 'tpmp'

function daysUntil(iso: string): number {
  return (new Date(iso).getTime() - Date.now()) / 86_400_000
}

const ALL_TABS: { id: TabId; label: string; icon: typeof FiUsers }[] = [
  { id: 'roster', label: 'Roster', icon: FiUsers },
  { id: 'assignments', label: 'Assignments', icon: FiCalendar },
  { id: 'performance', label: 'Performance', icon: FiBarChart2 },
  { id: 'devices', label: 'Devices', icon: FiCpu },
  { id: 'expenses', label: 'TA-DA', icon: FiFileText },
  { id: 'training', label: 'Training', icon: FiAward },
  { id: 'qmsfo', label: 'QMS FO Profile', icon: FiShield },
  { id: 'tpfo', label: '3rd-Party FO Profile', icon: FiBriefcase },
  { id: 'tpmp', label: '3rd-Party Manpower', icon: FiUsers },
]

const FoPage = () => {
  const { user } = useAuth()
  const role = user?.role
  const isPersonal = role === 'fo'
  const isSalesView = role === 'sales_lead' || role === 'sales_rep'

  const { people: allPeopleRaw, devices } = usePeopleData()
  const { camps } = useCampsData()
  const { claims, fileClaim, decideClaim } = useFoClaims()
  const { leaves } = useFoLeaves()

  const [localPeople, setLocalPeople] = useState<Person[]>([])
  const allPeople = useMemo(() => [...allPeopleRaw, ...localPeople], [allPeopleRaw, localPeople])
  const fos = useMemo(() => allPeople.filter((p) => p.role === 'Field Officer'), [allPeople])

  const selfPerson: Person = useMemo(() => {
    if (!isPersonal || !user) return fos[0] ?? ({} as Person)
    const fullName = `${user.firstName} ${user.lastName}`.trim()
    const match = fos.find((f) => f.name === fullName || f.email === user.email || f.id === user._id)
    if (match) return match
    return {
      id: user._id,
      name: fullName || 'Field Officer',
      role: 'Field Officer',
      phone: '',
      email: user.email,
      hq: '—',
      states: [],
      joined: new Date().toISOString().slice(0, 10),
      machinesAssigned: [],
    }
  }, [isPersonal, user, fos])

  const scopedFos = isPersonal ? [selfPerson] : fos

  // Training-due-across-all-FOs KPI needs each FO's records — reuse the
  // hook per-FO would violate hooks rules in a loop, so read the service
  // layer synchronously isn't possible; approximate via useFoTraining for
  // the currently-scoped single FO in personal mode, and compute manager
  // KPI from a lazily-loaded aggregate below.
  const { training: selfTraining } = useFoTraining(isPersonal ? selfPerson.id : '')

  const todayIso = new Date().toISOString().slice(0, 10)

  // Personal-mode KPI strip — mirrors fo-manager.js:452-461's `personal` branch exactly
  // (myToday/myUpcoming/myClosed/validCerts/pendingClaims all scoped to this one FO).
  const myCamps = useMemo(() => camps.filter((c) => c.foId === selfPerson.id), [camps, selfPerson.id])
  const myTodayCamps = useMemo(() => myCamps.filter((c) => c.date?.slice(0, 10) === todayIso && c.status !== 'CANCELLED' && c.status !== 'CANCELLED_CHARGED'), [myCamps, todayIso])
  const myUpcomingCamps = useMemo(() => myCamps.filter((c) => (c.date?.slice(0, 10) ?? '') > todayIso && c.status !== 'CANCELLED' && c.status !== 'CANCELLED_CHARGED' && c.status !== 'CLOSED'), [myCamps, todayIso])
  const myClosedCamps = useMemo(() => myCamps.filter((c) => c.status === 'CLOSED'), [myCamps])
  const selfStatusLabel = STATUS_LABEL[foLiveStatus(selfPerson, camps)]
  const myPendingClaims = useMemo(() => claims.filter((c) => c.foId === selfPerson.id && c.status === 'PENDING'), [claims, selfPerson.id])
  const myPendingClaimsSum = myPendingClaims.reduce((s, c) => s + c.amount, 0)
  const myValidCerts = useMemo(() => selfTraining.filter((t) => new Date(t.expiresOn).getTime() - Date.now() > 0).length, [selfTraining])
  const myExpiringCerts = useMemo(() => selfTraining.filter((t) => {
    const d = new Date(t.expiresOn).getTime() - Date.now()
    return d > 0 && d < 30 * 86_400_000
  }), [selfTraining])

  const visibleTabs = useMemo(() => {
    if (isPersonal) return ALL_TABS.filter((t) => !['roster', 'performance', 'qmsfo', 'tpfo', 'tpmp'].includes(t.id))
    if (isSalesView) return ALL_TABS.filter((t) => !['performance', 'expenses', 'training'].includes(t.id))
    return ALL_TABS
  }, [isPersonal, isSalesView])

  const [tab, setTab] = useState<TabId>(isPersonal ? 'assignments' : 'roster')
  const activeTab = visibleTabs.some((t) => t.id === tab) ? tab : visibleTabs[0]?.id ?? 'roster'

  const [openFoId, setOpenFoId] = useState<string | null>(null)
  const [addFoOpen, setAddFoOpen] = useState(false)

  const todaysCamps = camps.filter((c) => c.date?.slice(0, 10) === todayIso)
  const liveCamps = todaysCamps.filter((c) => c.status === 'LIVE')
  const unassignedToday = todaysCamps.filter((c) => !c.foId && c.status !== 'CANCELLED' && c.status !== 'CANCELLED_CHARGED')
  const atCampCount = fos.filter((f) => foLiveStatus(f, camps) === 'AT_CAMP').length
  const onRouteCount = fos.filter((f) => foLiveStatus(f, camps) === 'ON_ROUTE').length
  const idleCount = fos.filter((f) => foLiveStatus(f, camps) === 'IDLE').length

  const avgOccupancy = fos.length > 0 ? Math.round(fos.reduce((s, f) => s + (f.occupancyPct ?? 0), 0) / fos.length) : 0
  const ratedFos = fos.filter((f) => (f.feedbackAvg ?? 0) > 0)
  const avgFeedbackAll = ratedFos.length > 0 ? (ratedFos.reduce((s, f) => s + (f.feedbackAvg ?? 0), 0) / ratedFos.length) : 0

  const pendingClaims = claims.filter((c) => c.status === 'PENDING' || c.status === 'SUBMITTED')
  const pendingClaimsSum = pendingClaims.reduce((s, c) => s + c.amount, 0)

  // Manager-view "Training due" KPI aggregates each FO's seeded/persisted
  // training rows via the service layer directly (read-only snapshot from
  // localStorage, not a live subscription) since useFoTraining is per-FO.
  const trainingDueCount = useMemo(() => {
    let count = 0
    fos.forEach((f) => {
      try {
        const raw = localStorage.getItem('qms.fo.training')
        const all: { foId: string; expiresOn: string }[] = raw ? JSON.parse(raw) : []
        all.filter((r) => r.foId === f.id).forEach((r) => {
          const days = daysUntil(r.expiresOn)
          if (days >= 0 && days < 30) count++
        })
      } catch {
        // ignore malformed cache
      }
    })
    return count
  }, [fos])

  const certExpiringSoonCount = useMemo(() => {
    if (!isPersonal) return trainingDueCount
    return selfTraining.filter((t) => t.status === 'VALID' && daysUntil(t.expiresOn) >= 0 && daysUntil(t.expiresOn) < 30).length
  }, [isPersonal, selfTraining, trainingDueCount])

  const aiText = useMemo(() => {
    if (isPersonal) {
      const myCamps = camps.filter((c) => c.foId === selfPerson.id)
      const todayCamp = myCamps.find((c) => c.date?.slice(0, 10) === todayIso)
      const upcoming = myCamps.filter((c) => c.date?.slice(0, 10) > todayIso).sort((a, b) => (a.date < b.date ? -1 : 1))[0]
      const myPendingClaims = claims.filter((c) => c.foId === selfPerson.id && (c.status === 'PENDING' || c.status === 'SUBMITTED'))
      const parts: string[] = []
      if (todayCamp) parts.push(`Today: ${todayCamp.id} · ${todayCamp.city}`)
      else if (upcoming) parts.push(`Next camp: ${upcoming.id} on ${upcoming.date?.slice(0, 10)}`)
      else parts.push('No camps scheduled')
      if (myPendingClaims.length > 0) parts.push(`${myPendingClaims.length} claim(s) awaiting approval`)
      if (certExpiringSoonCount > 0) parts.push(`${certExpiringSoonCount} certification(s) expiring soon`)
      return parts.join(' · ')
    }
    const parts: string[] = []
    if (unassignedToday.length > 0) parts.push(`${unassignedToday.length} camp(s) unassigned for today`)
    if (pendingClaims.length > 0) parts.push(`${pendingClaims.length} TA/DA claim(s) awaiting approval (${formatINR(pendingClaimsSum)})`)
    if (trainingDueCount > 0) parts.push(`${trainingDueCount} certification(s) expiring soon`)
    return parts.length > 0 ? parts.join(' · ') : 'All FOs assigned and certified. No action queued.'
  }, [isPersonal, camps, selfPerson, claims, todayIso, unassignedToday, pendingClaims, pendingClaimsSum, trainingDueCount, certExpiringSoonCount])

  const handleAddPerson = (person: Person) => setLocalPeople((prev) => [...prev, person])

  const openFo = allPeople.find((p) => p.id === openFoId) ?? null

  return (
    <div className="max-w-7xl">
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <div className="text-[12px] mb-1" style={{ color: 'var(--qms-text-muted)' }}>
            {isPersonal ? 'My Workspace' : 'Operations · FO Management'}
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>
            {isPersonal ? `Hi, ${user?.firstName ?? 'there'}` : 'FO Management'}
          </h1>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {isPersonal ? (
              <>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
                  <FiMapPin size={11} /> {selfPerson.hq}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
                  <FiPhone size={11} /> {selfPerson.phone || '—'}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
                  <FiMail size={11} /> {selfPerson.email || '—'}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
                  <FiCpu size={11} /> {(selfPerson.machinesAssigned ?? []).length} device(s)
                </span>
              </>
            ) : (
              [
                { label: 'Roster · live', live: true },
                { label: 'Beat plan', icon: FiCalendar },
                { label: 'Device handover', icon: FiCpu },
                { label: 'TA-DA', icon: FiFileText },
              ].map((chip) => (
                <span key={chip.label} className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
                  {chip.live ? <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--success)' }} /> : chip.icon && <chip.icon size={11} />}
                  {chip.label}
                </span>
              ))
            )}
          </div>
        </div>

        {!isPersonal && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => toast.info('Import would open here')}
              className="flex items-center gap-1.5 text-[13px] font-semibold px-3 py-2 rounded-xl border transition-colors"
              style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }}
            >
              <FiUpload size={13} /> Import
            </button>
            <button
              onClick={() => toast.info('Export would download here')}
              className="flex items-center gap-1.5 text-[13px] font-semibold px-3 py-2 rounded-xl border transition-colors"
              style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }}
            >
              <FiDownload size={13} /> Export
            </button>
            <button
              onClick={() => setAddFoOpen(true)}
              className="flex items-center gap-1.5 text-[13px] font-bold px-3.5 py-2 rounded-xl text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
            >
              <FiPlus size={14} /> Add FO
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 mb-4" style={{ background: 'linear-gradient(135deg, color-mix(in oklab, var(--qms-brand) 12%, transparent), color-mix(in oklab, var(--qms-teal) 12%, transparent))' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}>
            <FiZap size={15} color="#fff" />
          </div>
          <div className="text-[13px]" style={{ color: 'var(--qms-text)' }}>
            <span className="font-bold">{isPersonal ? '' : 'AI: '}</span>{aiText}
          </div>
        </div>
      </div>

      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))' }}>
        {isPersonal ? (
          <>
            <KpiTile label="Today's camps" value={String(myTodayCamps.length)} sub={selfStatusLabel} tone="brand" icon={FiCalendar} />
            <KpiTile label="Upcoming" value={String(myUpcomingCamps.length)} sub="Confirmed + requested" tone="teal" icon={FiClock} />
            <KpiTile label="Closed" value={String(myClosedCamps.length)} sub="Lifetime" tone="emerald" icon={FiCheckCircle} />
            <KpiTile label="Occupancy" value={`${selfPerson.occupancyPct ?? 0}%`} sub="vs target 85%" tone="emerald" icon={FiActivity} />
            <KpiTile label="★ Rating" value={selfPerson.feedbackAvg ? selfPerson.feedbackAvg.toFixed(1) : '—'} sub={`${selfPerson.efficiencyPct ?? 0}% efficient`} tone="amber" icon={FiStar} />
            <KpiTile label="My claims" value={String(myPendingClaims.length)} sub={`${formatINR(myPendingClaimsSum)} pending`} tone="violet" icon={FiFileText} />
            <KpiTile label="Certs valid" value={`${myValidCerts}/${selfTraining.length}`} sub={`${myExpiringCerts.length} expiring`} tone="emerald" icon={FiAward} />
            <KpiTile label="Devices" value={String((selfPerson.machinesAssigned ?? []).length)} sub="Handed over" tone="brand" icon={FiCpu} />
          </>
        ) : (
          <>
            <KpiTile label="Active FOs" value={String(fos.length)} sub={`${atCampCount} at camp · ${onRouteCount} en route`} tone="brand" icon={FiUsers} />
            <KpiTile label="Today's camps" value={String(todaysCamps.length)} sub={`${liveCamps.length} live now`} tone="teal" icon={FiCalendar} />
            <KpiTile label="Unassigned" value={String(unassignedToday.length)} sub="Need an FO today" tone="rose" icon={FiActivity} />
            <KpiTile label="Avg occupancy" value={`${avgOccupancy}%`} sub="vs target 85%" tone="amber" icon={FiBarChart2} />
            <KpiTile label="Avg feedback" value={avgFeedbackAll > 0 ? avgFeedbackAll.toFixed(1) : '—'} sub="Camp-weighted" tone="violet" icon={FiStar} />
            <KpiTile label="Pending claims" value={String(pendingClaims.length)} sub={formatINR(pendingClaimsSum)} tone="rose" icon={FiFileText} />
            <KpiTile label="Training due" value={String(trainingDueCount)} sub="Expires < 30d" tone="amber" icon={FiAward} />
            <KpiTile label="Idle today" value={String(idleCount)} sub="No camp today" tone="brand" icon={FiClock} />
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-1 mb-4 border-b overflow-x-auto" style={{ borderColor: 'var(--qms-border)' }}>
        {visibleTabs.map((t) => {
          const Icon = t.icon
          const label = isPersonal && t.id === 'assignments' ? 'My camps' : t.label
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-3 py-2.5 text-[12.5px] font-semibold border-b-2 transition-colors shrink-0"
              style={{
                color: activeTab === t.id ? 'var(--qms-text)' : 'var(--qms-text-muted)',
                borderBottomColor: activeTab === t.id ? 'var(--qms-brand)' : 'transparent',
              }}
            >
              <Icon size={12} /> {label}
            </button>
          )
        })}
      </div>

      {activeTab === 'roster' && <RosterTab fos={scopedFos} camps={camps} onOpenFo={setOpenFoId} />}
      {activeTab === 'assignments' && <AssignmentsTab fos={scopedFos} camps={camps} onOpenFo={setOpenFoId} />}
      {activeTab === 'performance' && <PerformanceTab fos={scopedFos} camps={camps} onOpenFo={setOpenFoId} />}
      {activeTab === 'devices' && <DevicesTab fos={scopedFos} camps={camps} devices={devices} onOpenFo={setOpenFoId} />}
      {activeTab === 'expenses' && (
        <ExpensesTab
          fos={scopedFos}
          camps={camps}
          claims={isPersonal ? claims.filter((c) => c.foId === selfPerson.id) : claims}
          defaultFoId={isPersonal ? selfPerson.id : undefined}
          fileClaim={(claim) => fileClaim(claim)}
          decideClaim={(id, decision) => decideClaim(id, decision)}
        />
      )}
      {activeTab === 'training' && <TrainingTab fos={scopedFos} camps={camps} />}
      {activeTab === 'qmsfo' && (
        <PersonnelTab config={EMP_TYPE_CONFIG.qmsfo} people={allPeople} camps={camps} devices={devices} claims={claims} leaves={leaves} salesView={isSalesView} onAddPerson={handleAddPerson} />
      )}
      {activeTab === 'tpfo' && (
        <PersonnelTab config={EMP_TYPE_CONFIG.tpfo} people={allPeople} camps={camps} devices={devices} claims={claims} leaves={leaves} salesView={isSalesView} onAddPerson={handleAddPerson} />
      )}
      {activeTab === 'tpmp' && (
        <PersonnelTab config={EMP_TYPE_CONFIG.tpmp} people={allPeople} camps={camps} devices={devices} claims={claims} leaves={leaves} salesView={isSalesView} onAddPerson={handleAddPerson} />
      )}

      <FoDrawer fo={openFo} camps={camps} devices={devices} claims={claims} onClose={() => setOpenFoId(null)} />

      <AddPersonnelModal
        open={addFoOpen}
        onClose={() => setAddFoOpen(false)}
        title="Add FO"
        onAdd={handleAddPerson}
      />
    </div>
  )
}

export default FoPage
