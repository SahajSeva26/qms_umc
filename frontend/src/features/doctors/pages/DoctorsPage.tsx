import { useMemo, useState } from 'react'
import { FiUsers, FiLayers, FiMap, FiMoon, FiPlus, FiCheckCircle } from 'react-icons/fi'
import KpiTile from '@/components/ui/KpiTile'
import PaginationControls from '@/components/ui/PaginationControls'
import { useDoctors } from '@/features/doctors/hooks/useDoctors'
import { useDoctorsFilters } from '@/features/doctors/hooks/useDoctorsFilters'
import type { DoctorEntity, DoctorSpecialization } from '@/types/doctor.types'
import RosterTab from '@/features/doctors/components/tabs/RosterTab'
import SpecialtiesTab from '@/features/doctors/components/tabs/SpecialtiesTab'
import GeographyTab from '@/features/doctors/components/tabs/GeographyTab'
import InactiveTab from '@/features/doctors/components/tabs/InactiveTab'
import DoctorDrawer from '@/features/doctors/components/DoctorDrawer'
import EditDoctorModal from '@/features/doctors/components/EditDoctorModal'

type TabId = 'roster' | 'specialties' | 'geography' | 'inactive'

const TABS: { id: TabId; label: string; icon: typeof FiUsers }[] = [
  { id: 'roster', label: 'Roster', icon: FiUsers },
  { id: 'specialties', label: 'Specialties', icon: FiLayers },
  { id: 'geography', label: 'Geography', icon: FiMap },
  { id: 'inactive', label: 'Inactive', icon: FiMoon },
]

const PAGE_SIZE = 20

// Real backend-integrated Doctor Management. Tele Consultation/Engagement/
// Broadcasts tabs from the mock-era build are dropped entirely — they were
// derived from Camp data (camp gaps, ratings, patient counts), which the
// real Doctor model has no relationship to at all (doctor.service.ts's own
// comment: "Doctor is a global/system record ... it holds no references").
// Large enough to cover realistic doctor-master sizes in one page for the
// aggregate tabs (Specialties/Geography/Inactive) — these need the FULL
// dataset to group/count correctly, not just the Roster tab's current page.
const AGGREGATE_LIMIT = 1000

const DoctorsPage = () => {
  const { filters, setFilter, reset } = useDoctorsFilters()
  const [tab, setTab] = useState<TabId>('roster')
  const [page, setPage] = useState(1)
  const [openDoctorId, setOpenDoctorId] = useState<string | null>(null)
  const [editModal, setEditModal] = useState<{ open: boolean; doctor: DoctorEntity | null }>({ open: false, doctor: null })

  const { data, isLoading, error } = useDoctors({
    name: filters.search || undefined,
    specialization: filters.specialization === 'ALL' ? undefined : filters.specialization,
    status: filters.status === 'ALL' ? undefined : filters.status,
    city: filters.city || undefined,
    state: filters.state || undefined,
    page: String(page),
    limit: String(PAGE_SIZE),
  })
  const doctors = data?.data?.items ?? []
  const totalCount = data?.data?.count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  // Specialties/Geography aggregate across every ACTIVE doctor, independent
  // of the Roster tab's own filters/pagination — search() defaults to
  // status=active for everyone (doctor.service.ts), which is exactly the
  // "normal" doctor-master view these two tabs are meant to summarize.
  const { data: activeData } = useDoctors({ limit: String(AGGREGATE_LIMIT) })
  const activeDoctors = activeData?.data?.items ?? []

  // Inactive doctors are invisible to the default (status-omitted) query —
  // search() only honors an explicit status filter for callers with
  // doctor:manage, and even then only if asked for it — so this tab needs
  // its own dedicated query rather than filtering the roster/active list
  // client-side (which can never contain an inactive doctor to filter for).
  const { data: inactiveData } = useDoctors({ status: 'inactive', limit: String(AGGREGATE_LIMIT) })
  const inactiveDoctors = inactiveData?.data?.items ?? []

  const handleFilterChange = <K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) => {
    setFilter(key, value)
    setPage(1)
  }

  const handleReset = () => {
    reset()
    setPage(1)
  }

  const kpis = useMemo(() => {
    const cities = new Set(activeDoctors.map((d) => d.city).filter(Boolean)).size
    const specializations = new Set(activeDoctors.map((d) => d.specialization)).size
    return { cities, specializations, active: activeDoctors.length, inactive: inactiveDoctors.length }
  }, [activeDoctors, inactiveDoctors])

  const allKnownDoctors = [...doctors, ...activeDoctors, ...inactiveDoctors]
  const openDoctor = allKnownDoctors.find((d) => d.id === openDoctorId) ?? null

  const handleGoToRosterWithSpecialization = (specialization: DoctorSpecialization) => {
    setFilter('specialization', specialization)
    setPage(1)
    setTab('roster')
  }

  const handleGoToRosterWithCity = (city: string) => {
    setFilter('city', city)
    setPage(1)
    setTab('roster')
  }

  return (
    <div className="max-w-7xl">
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <div className="text-[12px] mb-1" style={{ color: 'var(--qms-text-muted)' }}>Operations · Field Network · Doctor Management</div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>Doctor Management</h1>
        </div>
        <button
          onClick={() => setEditModal({ open: true, doctor: null })}
          className="flex items-center gap-1.5 text-[13px] font-bold px-3.5 py-2 rounded-xl text-white shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
        >
          <FiPlus size={14} /> Add doctor
        </button>
      </div>

      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))' }}>
        <KpiTile label="Total doctors" value={String(kpis.active + kpis.inactive)} sub={`${kpis.cities} cities · ${kpis.specializations} specializations`} tone="brand" icon={FiUsers} />
        <KpiTile label="Active" value={String(kpis.active)} tone="emerald" icon={FiCheckCircle} />
        <KpiTile label="Inactive" value={String(kpis.inactive)} tone="rose" icon={FiMoon} />
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

      {isLoading && (
        <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
          Loading doctors…
        </div>
      )}

      {error && !isLoading && (
        <div className="text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
          Failed to load doctors. Please try again.
        </div>
      )}

      {!isLoading && !error && (
        <>
          {tab === 'roster' && (
            <>
              <RosterTab
                doctors={doctors}
                filters={filters}
                setFilter={handleFilterChange}
                reset={handleReset}
                onOpenDoctor={setOpenDoctorId}
              />
              <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
            </>
          )}

          {tab === 'specialties' && (
            <SpecialtiesTab doctors={activeDoctors} onSelectSpecialization={handleGoToRosterWithSpecialization} />
          )}

          {tab === 'geography' && (
            <GeographyTab doctors={activeDoctors} onSelectCity={handleGoToRosterWithCity} />
          )}

          {tab === 'inactive' && (
            <InactiveTab doctors={inactiveDoctors} onOpenDoctor={setOpenDoctorId} />
          )}
        </>
      )}

      <DoctorDrawer
        doctor={openDoctor}
        onClose={() => setOpenDoctorId(null)}
        onEdit={() => { setEditModal({ open: true, doctor: openDoctor }); setOpenDoctorId(null) }}
      />

      <EditDoctorModal
        open={editModal.open}
        doctor={editModal.doctor}
        onClose={() => setEditModal({ open: false, doctor: null })}
      />
    </div>
  )
}

export default DoctorsPage
