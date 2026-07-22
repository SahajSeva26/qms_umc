import { useMemo, useState } from 'react'
import { FiUsers, FiVideo, FiTrendingUp, FiLayers, FiMap, FiMoon, FiSend, FiUpload, FiDownload, FiPlus, FiZap, FiAward, FiCheckCircle, FiClock, FiStar } from 'react-icons/fi'
import KpiTile from '@/components/ui/KpiTile'
import { toast } from '@/components/ui/sonner'
import { useDoctors } from '@/features/doctors/hooks/useDoctors'
import type { Doctor } from '@/features/doctors/doctors.types'
import type { DoctorFilters } from '@/features/doctors/components/DoctorFilterBar'
import RosterTab from '@/features/doctors/components/tabs/RosterTab'
import EngagementTab from '@/features/doctors/components/tabs/EngagementTab'
import SpecialtiesTab from '@/features/doctors/components/tabs/SpecialtiesTab'
import GeographyTab from '@/features/doctors/components/tabs/GeographyTab'
import InactiveTab from '@/features/doctors/components/tabs/InactiveTab'
import BroadcastsTab from '@/features/doctors/components/tabs/BroadcastsTab'
import TeleConsultTab from '@/features/doctors/components/tabs/TeleConsultTab'
import DoctorDrawer from '@/features/doctors/components/DoctorDrawer'
import EditDoctorModal from '@/features/doctors/components/EditDoctorModal'

type TabId = 'roster' | 'tele' | 'engagement' | 'specialties' | 'geography' | 'inactive' | 'broadcasts'

const TABS: { id: TabId; label: string; icon: typeof FiUsers }[] = [
  { id: 'roster', label: 'Roster', icon: FiUsers },
  { id: 'tele', label: 'Tele Consultation', icon: FiVideo },
  { id: 'engagement', label: 'Engagement', icon: FiTrendingUp },
  { id: 'specialties', label: 'Specialties', icon: FiLayers },
  { id: 'geography', label: 'Geography', icon: FiMap },
  { id: 'inactive', label: 'Inactive', icon: FiMoon },
  { id: 'broadcasts', label: 'Broadcasts', icon: FiSend },
]

const HEADER_CHIPS = [
  { icon: null, label: 'Doctor master · live', live: true },
  { icon: FiZap, label: 'Engagement scored' },
  { icon: FiMap, label: 'Geo-mapped' },
  { icon: FiSend, label: 'Broadcast-ready' },
]

const emptyFilters: DoctorFilters = { specialty: 'ALL', city: 'ALL', band: 'ALL', search: '' }

const DoctorsPage = () => {
  const {
    doctors, camps, broadcasts, addDoctor, editDoctor, addBroadcast,
    engagementFor, engagementBand, engagementScore, doctorPrediction, genUIN,
  } = useDoctors()

  const [tab, setTab] = useState<TabId>('roster')
  const [filters, setFilters] = useState<DoctorFilters>(emptyFilters)
  const [broadcastIds, setBroadcastIds] = useState<Set<string>>(new Set())
  const [openDoctorId, setOpenDoctorId] = useState<string | null>(null)
  const [editModal, setEditModal] = useState<{ open: boolean; doctor: Doctor | null }>({ open: false, doctor: null })

  const handleFilterChange = (patch: Partial<DoctorFilters>) => setFilters((prev) => ({ ...prev, ...patch }))

  const toggleBroadcast = (id: string) => {
    setBroadcastIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        toast.info('Removed from broadcast')
      } else {
        next.add(id)
        toast.info('Added to broadcast')
      }
      return next
    })
  }

  const cities = useMemo(() => [...new Set(doctors.map((d) => d.city).filter(Boolean))], [doctors])
  const specialties = useMemo(() => [...new Set(doctors.map((d) => d.specialty).filter(Boolean))], [doctors])

  const kpis = useMemo(() => {
    let champions = 0, active = 0, dormant = 0, inactive = 0, fresh = 0
    let patientsTotal = 0
    let ratingSum = 0, ratedCount = 0
    doctors.forEach((d) => {
      const stats = engagementFor(d.id)
      const band = engagementBand(stats)
      if (band === 'CHAMPION') champions++
      else if (band === 'ACTIVE') active++
      else if (band === 'DORMANT') dormant++
      else if (band === 'INACTIVE') inactive++
      else fresh++
      patientsTotal += stats.patients
      if (stats.avgRating > 0) { ratingSum += stats.avgRating; ratedCount++ }
    })
    const avgRating = ratedCount ? Math.round((ratingSum / ratedCount) * 10) / 10 : null
    return { champions, active, dormant, inactive, fresh, patientsTotal, avgRating, ratedCount }
  }, [doctors, camps, engagementFor, engagementBand])

  const aiText = useMemo(() => {
    const parts: string[] = []
    if (kpis.dormant > 0) parts.push(`${kpis.dormant} doctor(s) dormant — broadcast a re-engagement camp invite`)
    if (kpis.inactive > 0) parts.push(`${kpis.inactive} inactive (> 180d)`)
    if (kpis.champions > 0) parts.push(`${kpis.champions} champion(s) — high LTV doctors`)
    return parts.length > 0 ? parts.join(' · ') : 'Network healthy. All doctors recently engaged.'
  }, [kpis])

  const openDoctor = doctors.find((d) => d.id === openDoctorId) ?? null
  const openDoctorCamps = openDoctor ? camps.filter((c) => c.doctorId === openDoctor.id) : []
  const openDoctorStats = openDoctor ? engagementFor(openDoctor.id) : null
  const openDoctorBand = openDoctorStats ? engagementBand(openDoctorStats) : null
  const openDoctorScore = openDoctorStats ? engagementScore(openDoctorStats) : 0
  const openDoctorPrediction = openDoctorStats && openDoctorBand ? doctorPrediction(openDoctorStats, openDoctorBand, openDoctorScore) : null

  const handleGoToRosterWithSpecialty = (specialty: string) => {
    setFilters((prev) => ({ ...prev, specialty }))
    setTab('roster')
  }

  const handleGoToRosterWithCity = (city: string) => {
    setFilters((prev) => ({ ...prev, city }))
    setTab('roster')
  }

  const handleSaveDoctor = async (rec: Doctor) => {
    if (editModal.doctor) {
      await editDoctor(editModal.doctor.id, rec)
    } else {
      await addDoctor(rec)
    }
  }

  return (
    <div className="max-w-7xl">
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <div className="text-[12px] mb-1" style={{ color: 'var(--qms-text-muted)' }}>Operations · Field Network · Doctor Management</div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>Doctor Management</h1>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {HEADER_CHIPS.map((chip) => (
              <span
                key={chip.label}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}
              >
                {chip.live ? <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--success)' }} /> : chip.icon && <chip.icon size={11} />}
                {chip.label}
              </span>
            ))}
          </div>
        </div>
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
            onClick={() => setEditModal({ open: true, doctor: null })}
            className="flex items-center gap-1.5 text-[13px] font-bold px-3.5 py-2 rounded-xl text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
          >
            <FiPlus size={14} /> Add doctor
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 mb-4" style={{ background: 'linear-gradient(135deg, color-mix(in oklab, var(--qms-brand) 12%, transparent), color-mix(in oklab, var(--qms-teal) 12%, transparent))' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}>
            <FiZap size={15} color="#fff" />
          </div>
          <div className="text-[13px]" style={{ color: 'var(--qms-text)' }}>
            <span className="font-bold">AI:</span> {aiText}
          </div>
        </div>
        <button onClick={() => toast.info('Review would open here')} className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg border shrink-0" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }}>
          Review
        </button>
      </div>

      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))' }}>
        <KpiTile label="Total doctors" value={String(doctors.length)} sub={`${cities.length} cities · ${specialties.length} specialties`} tone="brand" icon={FiUsers} />
        <KpiTile label="Champions" value={String(kpis.champions)} sub="≥ 6 camps · ★ 4.3+" tone="violet" icon={FiAward} />
        <KpiTile label="Active" value={String(kpis.active)} sub="Last camp < 60d" tone="emerald" icon={FiCheckCircle} />
        <KpiTile label="Dormant" value={String(kpis.dormant)} sub="60-180d gap" tone="amber" icon={FiClock} />
        <KpiTile label="Inactive" value={String(kpis.inactive)} sub="> 180d gap" tone="rose" icon={FiMoon} />
        <KpiTile label="New/unused" value={String(kpis.fresh)} sub="No camp history yet" tone="teal" icon={FiStar} />
        <KpiTile label="Patients seen" value={kpis.patientsTotal.toLocaleString('en-IN')} sub="Across all doctors" tone="brand" icon={FiUsers} />
        <KpiTile label="Avg ★" value={kpis.avgRating !== null ? `${kpis.avgRating} ★` : '—'} sub={`${kpis.ratedCount} rated`} tone="amber" icon={FiStar} />
      </div>

      <div className="flex flex-wrap gap-1 mb-4 border-b overflow-x-auto" style={{ borderColor: 'var(--qms-border)' }}>
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-3 py-2.5 text-[12.5px] font-semibold border-b-2 transition-colors shrink-0"
              style={{
                color: tab === t.id ? 'var(--qms-text)' : 'var(--qms-text-muted)',
                borderBottomColor: tab === t.id ? 'var(--qms-brand)' : 'transparent',
              }}
            >
              <Icon size={12} /> {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'roster' && (
        <RosterTab
          doctors={doctors}
          filters={filters}
          onFilterChange={handleFilterChange}
          engagementFor={engagementFor}
          engagementBand={engagementBand}
          onOpenDoctor={setOpenDoctorId}
          broadcastIds={broadcastIds}
          onToggleBroadcast={toggleBroadcast}
        />
      )}

      {tab === 'tele' && <TeleConsultTab doctors={doctors} />}

      {tab === 'engagement' && (
        <EngagementTab
          doctors={doctors}
          filters={filters}
          onFilterChange={handleFilterChange}
          engagementFor={engagementFor}
          engagementBand={engagementBand}
          engagementScore={engagementScore}
          onOpenDoctor={setOpenDoctorId}
        />
      )}

      {tab === 'specialties' && (
        <SpecialtiesTab doctors={doctors} engagementFor={engagementFor} onSelectSpecialty={handleGoToRosterWithSpecialty} />
      )}

      {tab === 'geography' && (
        <GeographyTab doctors={doctors} engagementFor={engagementFor} onSelectCity={handleGoToRosterWithCity} />
      )}

      {tab === 'inactive' && (
        <InactiveTab
          doctors={doctors}
          engagementFor={engagementFor}
          engagementBand={engagementBand}
          broadcastIds={broadcastIds}
          onToggleBroadcast={toggleBroadcast}
          onOpenDoctor={setOpenDoctorId}
        />
      )}

      {tab === 'broadcasts' && (
        <BroadcastsTab
          doctors={doctors}
          broadcastIds={broadcastIds}
          onClearBroadcast={() => setBroadcastIds(new Set())}
          broadcasts={broadcasts}
          onSend={addBroadcast}
        />
      )}

      {openDoctor && openDoctorStats && openDoctorBand && openDoctorPrediction && (
        <DoctorDrawer
          doctor={openDoctor}
          camps={openDoctorCamps}
          stats={openDoctorStats}
          band={openDoctorBand}
          score={openDoctorScore}
          prediction={openDoctorPrediction}
          genUIN={genUIN}
          onClose={() => setOpenDoctorId(null)}
          onEdit={() => setEditModal({ open: true, doctor: openDoctor })}
          onAddToBroadcast={() => toggleBroadcast(openDoctor.id)}
        />
      )}

      <EditDoctorModal
        open={editModal.open}
        doctor={editModal.doctor}
        onClose={() => setEditModal({ open: false, doctor: null })}
        onSave={handleSaveDoctor}
      />
    </div>
  )
}

export default DoctorsPage
