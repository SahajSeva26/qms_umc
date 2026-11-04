import { lazy, Suspense, useState } from 'react'
import { FiUsers, FiCheckCircle, FiMoon, FiPlus, FiEdit2 } from 'react-icons/fi'
import { useSession } from '@/hooks/useSession'
import { usePermission } from '@/hooks/usePermission'
import { useDoctorSearch } from '@/hooks/useDoctorSearch'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { usePagination } from '@/hooks/usePagination'
import SearchInput from '@/components/ui/SearchInput'
import PaginationControls from '@/components/ui/PaginationControls'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import KpiTile from '@/components/ui/KpiTile'
import { Button } from '@qms/ui'
import DialogErrorBoundary from '@/components/ui/DialogErrorBoundary'
import DialogOpeningFallback from '@/components/ui/DialogOpeningFallback'
import PharmaRoleGate from '@/features/pharma/components/PharmaRoleGate'
import DoctorDrawer from '@/features/doctors/components/DoctorDrawer'
import StatusPill from '@/features/doctors/components/StatusPill'
import type { DoctorEntity } from '@/types/doctor.types'
import { SPECIALIZATION_LABEL } from '@/types/doctor.types'

// Same lazy/prefetch convention as PharmaDoctorsTab.tsx's EditDoctorModal usage — largest chunk
// in this app (Maps SDK), only fetched once Add/Edit is actually clicked.
const importEditDoctorModal = () => import('@/features/pharma/components/EditDoctorModal')
const EditDoctorModal = lazy(importEditDoctorModal)
const prefetchEditDoctorModal = () => { void importEditDoctorModal() }

const PAGE_SIZE = 10

const DOCTORS_SKELETON = (
  <div aria-busy="true" aria-live="polite" className="animate-pulse">
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: i < 5 ? '1px solid var(--qms-border)' : undefined }}>
          <div className="rounded-full shrink-0" style={{ background: 'var(--qms-surface-strong)', width: 30, height: 30 }} />
          <div className="min-w-0 flex-1">
            <div className="h-3.5 w-32 rounded mb-1.5" style={{ background: 'var(--qms-surface-strong)' }} />
            <div className="h-3 w-20 rounded" style={{ background: 'var(--qms-surface-strong)' }} />
          </div>
          <div className="h-3.5 w-40 rounded" style={{ background: 'var(--qms-surface-strong)' }} />
          <div className="h-3.5 w-14 rounded" style={{ background: 'var(--qms-surface-strong)' }} />
        </div>
      ))}
    </div>
  </div>
)

// Doctor Management — a sidebar-level page (distinct from the small "Doctors" tab already inside
// MrPortalPage) reachable by all four pharma role types, each with a different permission ceiling:
// division-head holds doctor:manage (full CRUD, sees inactive); MR holds doctor:create (create +
// read-only); RSM/ASM hold neither today (read-only — list/detail has no permission gate at all
// server-side, so this still works for them with zero backend change). Scoped to the caller's own
// division via session.role.division, same pattern as PharmaDoctorsTab.tsx — division is optional
// on the backend Role model but every pharma field-force role (MR/HO/ASM/RSM) has one in practice.
const DoctorManagementPageContent = () => {
  const { session } = useSession()
  const { hasPermission, hasAnyPermission } = usePermission()
  const canSeeInactive = hasPermission('doctor:manage')
  const canManageDoctors = canSeeInactive
  const canCreateDoctors = hasAnyPermission(['doctor:create', 'doctor:manage'])
  const divisionId = session?.role.division ?? null

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [showInactive, setShowInactive] = useState(false)
  const { page, setPage, totalPages, resetToFirstPage } = usePagination(PAGE_SIZE)
  const [openDoctorId, setOpenDoctorId] = useState<string | null>(null)
  const [editModal, setEditModal] = useState<{ open: boolean; doctor: DoctorEntity | null }>({ open: false, doctor: null })

  const { data, isLoading, isFetching, error, refetch } = useDoctorSearch(
    {
      division: divisionId ?? undefined,
      name: debouncedSearch || undefined,
      status: showInactive && canSeeInactive ? 'inactive' : undefined,
      page: String(page),
      limit: String(PAGE_SIZE),
      report: 'true',
    },
    { enabled: !!divisionId, keepPreviousData: true },
  )
  const doctors = data?.data?.items ?? []
  const totalCount = data?.data?.count ?? 0

  const openDoctor = doctors.find((d) => d.id === openDoctorId) ?? null

  const handleSearchChange = (value: string) => {
    setSearch(value)
    resetToFirstPage()
  }

  const handleToggleInactive = (next: boolean) => {
    setShowInactive(next)
    resetToFirstPage()
  }

  if (!divisionId) {
    return (
      <div className="text-[13px] py-10 text-center rounded-xl border" style={{ color: 'var(--qms-text-muted)', borderColor: 'var(--qms-border)' }}>
        Couldn't resolve your division from the session — try reloading the page.
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <div className="text-[12px] mb-1" style={{ color: 'var(--qms-text-muted)' }}>Network · Doctor Management</div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>Doctor Management</h1>
        </div>
        {canCreateDoctors && (
          <Button
            onClick={() => setEditModal({ open: true, doctor: null })}
            onMouseEnter={prefetchEditDoctorModal}
            onFocus={prefetchEditDoctorModal}
          >
            <FiPlus size={14} /> Add doctor
          </Button>
        )}
      </div>

      {canSeeInactive && (
        <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))' }}>
          <KpiTile label="Total" value={String(totalCount)} tone="brand" icon={FiUsers} />
          <KpiTile label={showInactive ? 'Showing inactive' : 'Showing active'} value={showInactive ? 'Inactive' : 'Active'} tone={showInactive ? 'rose' : 'emerald'} icon={showInactive ? FiMoon : FiCheckCircle} />
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap mb-3">
        <SearchInput value={search} onChange={handleSearchChange} placeholder="Search by name..." className="w-64 text-[13px]" />
        {canSeeInactive && (
          <button
            onClick={() => handleToggleInactive(!showInactive)}
            className="text-[12px] font-semibold px-3 py-1.5 rounded-lg border"
            style={{
              borderColor: showInactive ? 'var(--qms-brand)' : 'var(--qms-border)',
              color: showInactive ? 'var(--qms-brand)' : 'var(--qms-text-muted)',
              background: showInactive ? 'var(--qms-surface-strong)' : 'transparent',
            }}
          >
            {showInactive ? 'Showing inactive' : 'Show inactive'}
          </button>
        )}
      </div>

      <QueryStateBlock
        isLoading={isLoading}
        error={error}
        loadingLabel="Loading doctors…"
        errorLabel="Failed to load doctors. Please try again."
        onRetry={refetch}
        loadingSkeleton={DOCTORS_SKELETON}
        isFetching={isFetching}
      >
        {doctors.length === 0 ? (
          <div className="text-[13px] py-10 text-center rounded-xl border" style={{ color: 'var(--qms-text-muted)', borderColor: 'var(--qms-border)' }}>
            {showInactive ? 'No inactive doctors in your division.' : 'No doctors found in your division.'}
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
                    <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>Doctor</th>
                    <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>Clinic address</th>
                    <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>Contact</th>
                    <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>Camps</th>
                    {canSeeInactive && <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>Status</th>}
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {doctors.map((doctor) => (
                    <tr key={doctor.id} style={{ borderBottom: '1px solid var(--qms-border)' }}>
                      <td className="px-4 py-2.5">
                        <button className="text-left" onClick={() => setOpenDoctorId(doctor.id)}>
                          <div className="font-bold truncate" style={{ color: 'var(--qms-text)' }}>{doctor.name}</div>
                          <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>
                            {doctor.pharmaCode} · {doctor.specialization ? SPECIALIZATION_LABEL[doctor.specialization] : '—'}
                          </div>
                        </button>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="text-[12px] max-w-[280px]" style={{ color: 'var(--qms-text)' }}>
                          {doctor.location
                            ? [doctor.location.addressLine1, doctor.location.city, doctor.location.state, doctor.location.pincode].filter(Boolean).join(', ') || '—'
                            : '—'}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div style={{ color: 'var(--qms-text)' }}>{doctor.mobile || '—'}</div>
                        <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{doctor.email || '—'}</div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div style={{ color: 'var(--qms-text)' }}>{doctor.stats?.camps ?? 0} camps</div>
                      </td>
                      {canSeeInactive && (
                        <td className="px-4 py-2.5"><StatusPill status={doctor.status} /></td>
                      )}
                      <td className="px-4 py-2.5 text-right">
                        {canManageDoctors && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditModal({ open: true, doctor })}
                            onMouseEnter={prefetchEditDoctorModal}
                            onFocus={prefetchEditDoctorModal}
                          >
                            <FiEdit2 size={12} /> Modify
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <PaginationControls page={page} totalPages={totalPages(totalCount)} onPageChange={setPage} disabled={isFetching} />
      </QueryStateBlock>

      <DoctorDrawer
        doctor={openDoctor}
        canEdit={canManageDoctors}
        onClose={() => setOpenDoctorId(null)}
        onEdit={() => { setEditModal({ open: true, doctor: openDoctor }); setOpenDoctorId(null) }}
      />

      {editModal.open && (
        <DialogErrorBoundary onClose={() => setEditModal({ open: false, doctor: null })}>
          <Suspense fallback={<DialogOpeningFallback />}>
            <EditDoctorModal
              open
              doctor={editModal.doctor}
              divisionId={divisionId}
              onClose={() => setEditModal({ open: false, doctor: null })}
            />
          </Suspense>
        </DialogErrorBoundary>
      )}
    </div>
  )
}

const PHARMA_ROLE_TYPES = ['pharma-division-head', 'pharma-mr', 'pharma-rsm', 'pharma-asm']

const DoctorManagementPage = () => (
  <PharmaRoleGate roleTypeCode={PHARMA_ROLE_TYPES}>
    <DoctorManagementPageContent />
  </PharmaRoleGate>
)

export default DoctorManagementPage
