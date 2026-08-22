import { useMemo, useState } from 'react'
import { FiUsers, FiLayers, FiMap, FiMoon, FiPlus, FiCheckCircle } from 'react-icons/fi'
import KpiTile from '@/components/ui/KpiTile'
import PaginationControls from '@/components/ui/PaginationControls'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import { useDoctors } from '@/features/doctors/hooks/useDoctors'
import { useDoctorsFilters } from '@/features/doctors/hooks/useDoctorsFilters'
import { usePermission } from '@/hooks/usePermission'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { usePagination } from '@/hooks/usePagination'
import type { DoctorEntity, DoctorSpecialization } from '@/features/doctors/doctor.types'
import { EMPTY_ARRAY } from '@/utils/emptyArray'
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

// Specialties/Geography tabs aggregate over only this many active doctors —
// pending a backend aggregation endpoint, not adjustable by raising this value.
const AGGREGATE_LIMIT = 10

const DoctorsPage = () => {
  const { filters, setFilter, reset } = useDoctorsFilters()
  const debouncedSearch = useDebouncedValue(filters.search, 300)
  const debouncedCity = useDebouncedValue(filters.city, 300)
  const debouncedState = useDebouncedValue(filters.state, 300)
  const { hasPermission } = usePermission()
  // Same permission gates the Inactive tab and both write endpoints server-side.
  const canSeeInactive = hasPermission('doctor:manage')
  const canManageDoctors = canSeeInactive
  const [tab, setTab] = useState<TabId>('roster')
  const { page, setPage, totalPages, resetToFirstPage } = usePagination(PAGE_SIZE)
  const { page: inactivePage, setPage: setInactivePage, totalPages: inactiveTotalPagesFor } = usePagination(PAGE_SIZE)
  const [openDoctorId, setOpenDoctorId] = useState<string | null>(null)
  const [editModal, setEditModal] = useState<{ open: boolean; doctor: DoctorEntity | null }>({ open: false, doctor: null })

  const { data, isLoading, error, refetch } = useDoctors(
    {
      name: debouncedSearch || undefined,
      specialization: filters.specialization === 'ALL' ? undefined : filters.specialization,
      status: filters.status === 'ALL' ? undefined : filters.status,
      city: debouncedCity || undefined,
      state: debouncedState || undefined,
      page: String(page),
      limit: String(PAGE_SIZE),
    },
    { keepPreviousData: true },
  )
  const doctors = data?.data?.items ?? EMPTY_ARRAY
  const totalCount = data?.data?.count ?? 0

  // search() defaults to status=active for everyone, so this covers exactly
  // the "normal" doctor-master view Specialties/Geography summarize.
  const { data: activeData } = useDoctors({ limit: String(AGGREGATE_LIMIT) })
  const activeDoctors = activeData?.data?.items ?? EMPTY_ARRAY

  // Needs its own query (not client-side filtering of the roster/active
  // list) since the backend only returns inactive doctors on explicit request.
  const { data: inactiveData } = useDoctors(
    canSeeInactive ? { status: 'inactive', page: String(inactivePage), limit: String(PAGE_SIZE) } : { limit: '0' },
    { enabled: canSeeInactive, keepPreviousData: true },
  )
  const inactiveDoctors = canSeeInactive ? inactiveData?.data?.items ?? EMPTY_ARRAY : EMPTY_ARRAY
  const inactiveTotalCount = canSeeInactive ? inactiveData?.data?.count ?? 0 : 0

  const handleFilterChange = <K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) => {
    setFilter(key, value)
    resetToFirstPage()
  }

  const handleReset = () => {
    reset()
    resetToFirstPage()
  }

  // `inactive` uses the response's `count`, not `inactiveDoctors.length`,
  // since that array is just the current page of the Inactive tab.
  const kpis = useMemo(() => {
    const cities = new Set(activeDoctors.map((d) => d.city).filter(Boolean)).size
    const specializations = new Set(activeDoctors.map((d) => d.specialization)).size
    return { cities, specializations, active: activeDoctors.length, inactive: inactiveTotalCount }
  }, [activeDoctors, inactiveTotalCount])

  const allKnownDoctors = [...doctors, ...activeDoctors, ...inactiveDoctors]
  const openDoctor = allKnownDoctors.find((d) => d.id === openDoctorId) ?? null

  const handleGoToRosterWithSpecialization = (specialization: DoctorSpecialization) => {
    setFilter('specialization', specialization)
    resetToFirstPage()
    setTab('roster')
  }

  const handleGoToRosterWithCity = (city: string) => {
    setFilter('city', city)
    resetToFirstPage()
    setTab('roster')
  }

  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <div className="text-[12px] mb-1" style={{ color: 'var(--qms-text-muted)' }}>Operations · Field Network · Doctor Management</div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>Doctor Management</h1>
        </div>
        {/* Hide create entry point rather than let a 403 hit on submit. */}
        {canManageDoctors && (
          <button
            onClick={() => setEditModal({ open: true, doctor: null })}
            className="flex items-center gap-1.5 text-[13px] font-bold px-3.5 py-2 rounded-xl text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
          >
            <FiPlus size={14} /> Add doctor
          </button>
        )}
      </div>

      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))' }}>
        {/* Hidden without doctor:manage — backend can't scope this query to inactive for such callers. */}
        {canSeeInactive && (
          <KpiTile label="Total doctors" value={String(kpis.active + kpis.inactive)} sub={`${kpis.cities} cities · ${kpis.specializations} specializations`} tone="brand" icon={FiUsers} />
        )}
        <KpiTile label="Active" value={String(kpis.active)} tone="emerald" icon={FiCheckCircle} />
        {canSeeInactive && <KpiTile label="Inactive" value={String(kpis.inactive)} tone="rose" icon={FiMoon} />}
      </div>

      <div className="flex flex-wrap gap-1 mb-4 border-b overflow-x-auto" style={{ borderColor: 'var(--qms-border)' }}>
        {TABS.filter((t) => t.id !== 'inactive' || canSeeInactive).map((t) => {
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

      <QueryStateBlock isLoading={isLoading} error={error} loadingLabel="Loading doctors…" errorLabel="Failed to load doctors. Please try again." onRetry={refetch}>
        {tab === 'roster' && (
          <>
            <RosterTab
              doctors={doctors}
              filters={filters}
              setFilter={handleFilterChange}
              reset={handleReset}
              onOpenDoctor={setOpenDoctorId}
            />
            <PaginationControls page={page} totalPages={totalPages(totalCount)} onPageChange={setPage} />
          </>
        )}

        {tab === 'specialties' && (
          <SpecialtiesTab doctors={activeDoctors} onSelectSpecialization={handleGoToRosterWithSpecialization} />
        )}

        {tab === 'geography' && (
          <GeographyTab doctors={activeDoctors} onSelectCity={handleGoToRosterWithCity} />
        )}

        {tab === 'inactive' && (
          <>
            <InactiveTab doctors={inactiveDoctors} onOpenDoctor={setOpenDoctorId} />
            <PaginationControls page={inactivePage} totalPages={inactiveTotalPagesFor(inactiveTotalCount)} onPageChange={setInactivePage} />
          </>
        )}
      </QueryStateBlock>

      <DoctorDrawer
        doctor={openDoctor}
        canEdit={canManageDoctors}
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
