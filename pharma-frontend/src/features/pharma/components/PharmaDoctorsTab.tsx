import { lazy, Suspense, useState } from 'react'
import { FiUserPlus, FiEdit2 } from 'react-icons/fi'
import { useSession } from '@/hooks/useSession'
import { useDoctorSearch } from '@/hooks/useDoctorSearch'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { usePagination } from '@/hooks/usePagination'
import { usePermission } from '@/hooks/usePermission'
import SearchInput from '@/components/ui/SearchInput'
import PaginationControls from '@/components/ui/PaginationControls'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@qms/ui'
import type { DoctorEntity } from '@/types/doctor.types'
import { SPECIALIZATION_LABEL } from '@/types/doctor.types'

// Largest lazy chunk in this app (~60KB gzipped, Maps SDK) — only loads once Add/Modify is
// clicked, and pre-warmed on hover/focus so it's often already in flight by click time.
const importEditDoctorModal = () => import('@/features/pharma/components/EditDoctorModal')
const EditDoctorModal = lazy(importEditDoctorModal)
const prefetchEditDoctorModal = () => { void importEditDoctorModal() }

// A dialog shell, not a content skeleton — no real shape to match yet, and no data fetch (a form, not a list).
const EditorOpeningFallback = (
  <Dialog open>
    <DialogContent className="sm:max-w-2xl" showCloseButton={false}>
      <DialogHeader>
        <DialogTitle>Opening editor…</DialogTitle>
      </DialogHeader>
      <div className="flex items-center justify-center py-10">
        <div
          className="h-6 w-6 rounded-full border-2 animate-spin"
          style={{ borderColor: 'var(--qms-border)', borderTopColor: 'var(--qms-brand)' }}
        />
      </div>
    </DialogContent>
  </Dialog>
)

const PAGE_SIZE = 10

// Drops the first word (typically "Dr"), takes the next two; falls back to the first two letters on a single-word name.
const doctorInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/)
  const initials = parts.slice(1, 3).map((p) => p[0]).join('').toUpperCase()
  return initials || name.slice(0, 2).toUpperCase()
}

// Matches the real table's row shape (avatar circle + name/code + address + contact + camps) so
// the shimmer never jumps in size once data arrives.
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
          <div className="h-3.5 w-24 rounded" style={{ background: 'var(--qms-surface-strong)' }} />
          <div className="h-3.5 w-14 rounded" style={{ background: 'var(--qms-surface-strong)' }} />
        </div>
      ))}
    </div>
  </div>
)

// Doctor is division-scoped shared inventory, not owned by one MR. Lean MR-only port of
// internal-frontend's PharmaDoctorsTab.tsx: no CSV bulk import, no tenant/division picker.
const PharmaDoctorsTab = () => {
  const { session } = useSession()
  const { hasAnyPermission } = usePermission()
  // PUT /:id is doctor:manage-only server-side (see md-files/BACKEND_REQUEST_camp-dossier.md) —
  // an MR's edit attempt 403s even though Modify shows; gated this way so it lights up for free once widened.
  const canCreateDoctors = hasAnyPermission(['doctor:create', 'doctor:manage'])
  const canEditDoctors = hasAnyPermission(['doctor:create', 'doctor:manage'])
  const divisionId = session?.role.division ?? null

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const { page, setPage, totalPages, resetToFirstPage } = usePagination(PAGE_SIZE)
  const [editModal, setEditModal] = useState<{ open: boolean; doctor: DoctorEntity | null }>({ open: false, doctor: null })

  const { data, isLoading, isFetching, error, refetch } = useDoctorSearch(
    {
      division: divisionId ?? undefined,
      name: debouncedSearch || undefined,
      page: String(page),
      limit: String(PAGE_SIZE),
      report: 'true',
    },
    { enabled: !!divisionId, keepPreviousData: true },
  )
  const doctors = data?.data?.items ?? []
  const totalCount = data?.data?.count ?? 0

  const handleSearchChange = (value: string) => {
    setSearch(value)
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
    <div>
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div>
          <div className="font-bold text-[15px]" style={{ color: 'var(--qms-text)' }}>My doctors</div>
          {!isLoading && !error && (
            <div className="text-[12px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
              {totalCount} doctor{totalCount === 1 ? '' : 's'} in your division
            </div>
          )}
        </div>
        {canCreateDoctors && (
          <Button
            onClick={() => setEditModal({ open: true, doctor: null })}
            onMouseEnter={prefetchEditDoctorModal}
            onFocus={prefetchEditDoctorModal}
          >
            <FiUserPlus size={14} /> Add new doctor
          </Button>
        )}
      </div>

      <SearchInput value={search} onChange={handleSearchChange} placeholder="Search by name..." className="w-64 text-[13px] mb-3" />

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
            No doctors found in your division.
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
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {doctors.map((doctor) => (
                    <tr key={doctor.id} style={{ borderBottom: '1px solid var(--qms-border)' }}>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="rounded-full flex items-center justify-center text-white font-extrabold text-[11px] shrink-0"
                            style={{ background: '#a855f7', width: 30, height: 30 }}
                          >
                            {doctorInitials(doctor.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold truncate" style={{ color: 'var(--qms-text)' }}>{doctor.name}</div>
                            <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>
                              {doctor.pharmaCode} · {doctor.specialization ? SPECIALIZATION_LABEL[doctor.specialization] : '—'}
                            </div>
                          </div>
                        </div>
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
                      <td className="px-4 py-2.5 text-right">
                        {canEditDoctors && (
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

      {editModal.open && (
        <Suspense fallback={EditorOpeningFallback}>
          <EditDoctorModal
            open
            doctor={editModal.doctor}
            divisionId={divisionId}
            onClose={() => setEditModal({ open: false, doctor: null })}
          />
        </Suspense>
      )}
    </div>
  )
}

export default PharmaDoctorsTab
