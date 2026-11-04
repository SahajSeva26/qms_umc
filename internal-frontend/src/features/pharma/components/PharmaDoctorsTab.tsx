import { useState } from 'react'
import { FiUserPlus, FiEdit2 } from 'react-icons/fi'
import { useSession } from '@/hooks/useSession'
import { useDoctorSearch } from '@/hooks/useDoctorSearch'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { usePagination } from '@/hooks/usePagination'
import { usePermission } from '@/hooks/usePermission'
import SearchInput from '@/components/ui/SearchInput'
import PaginationControls from '@/components/ui/PaginationControls'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import { Button } from '@/components/ui/button'
import { EditDoctorModal } from '@/features/doctors'
import type { DoctorEntity } from '@/types/doctor.types'
import { SPECIALIZATION_LABEL } from '@/types/doctor.types'
import { EMPTY_ARRAY } from '@/utils/emptyArray'

const PAGE_SIZE = 10

// Mirrors the prototype's own (unusual) initials logic exactly: drop the first word (typically
// "Dr"), take the next two. Falls back to the first two letters of the full name on a single-word
// name, where the prototype's own logic would otherwise render blank.
const doctorInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/)
  const initials = parts.slice(1, 3).map((p) => p[0]).join('').toUpperCase()
  return initials || name.slice(0, 2).toUpperCase()
}

// Doctor is division-scoped shared inventory, not owned by any one MR, so this shows "doctors in my division".
const PharmaDoctorsTab = () => {
  const { session } = useSession()
  const { hasAnyPermission } = usePermission()
  // Edit (PUT /:id) is server-side doctor:manage-only today, which an MR never holds — see
  // BACKEND_REQUEST_camp-dossier.md #8. Gated here on the same set as create anyway, so Modify
  // lights up the moment that permission is widened, no frontend change needed.
  const canCreateDoctors = hasAnyPermission(['doctor:create', 'doctor:manage'])
  const canEditDoctors = hasAnyPermission(['doctor:create', 'doctor:manage'])
  const divisionId = session?.role.division ?? null

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const { page, setPage, totalPages, resetToFirstPage } = usePagination(PAGE_SIZE)
  const [editModal, setEditModal] = useState<{ open: boolean; doctor: DoctorEntity | null }>({ open: false, doctor: null })

  const { data, isLoading, error, refetch } = useDoctorSearch(
    {
      division: divisionId ?? undefined,
      name: debouncedSearch || undefined,
      page: String(page),
      limit: String(PAGE_SIZE),
      // Per-doctor camps/patients counts, computed server-side in one batched aggregate — see DoctorStats.
      report: 'true',
    },
    { enabled: !!divisionId },
  )
  const doctors = data?.data?.items ?? EMPTY_ARRAY
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
              {totalCount} doctor{totalCount === 1 ? '' : 's'} mapped to you
            </div>
          )}
        </div>
        {canCreateDoctors && (
          <Button onClick={() => setEditModal({ open: true, doctor: null })}>
            <FiUserPlus size={14} /> Add new doctor
          </Button>
        )}
      </div>

      <SearchInput value={search} onChange={handleSearchChange} placeholder="Search by name..." className="w-64 text-[13px] mb-3" />

      <QueryStateBlock isLoading={isLoading} error={error} loadingLabel="Loading doctors…" errorLabel="Failed to load doctors. Please try again." onRetry={refetch}>
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
                    <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>Rx total</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {doctors.map((doctor) => {
                    return (
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
                          {/* No per-status (closed) breakdown yet — backend only aggregates total camps today; flagged separately (see BACKEND_REQUEST_camp-dossier.md #7). */}
                          <div style={{ color: 'var(--qms-text)' }}>{doctor.stats?.camps ?? 0} camps</div>
                        </td>
                        <td className="px-4 py-2.5">
                          {/* No Rx/prescription entity in the backend yet — flagged separately (see BACKEND_REQUEST_camp-dossier.md #6). */}
                          <span className="italic text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>Coming soon</span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {canEditDoctors && (
                            <Button variant="outline" size="sm" onClick={() => setEditModal({ open: true, doctor })}>
                              <FiEdit2 size={12} /> Modify
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <PaginationControls page={page} totalPages={totalPages(totalCount)} onPageChange={setPage} />
      </QueryStateBlock>

      {editModal.open && (
        <EditDoctorModal
          open
          doctor={editModal.doctor}
          forcedTenant={session ? { id: session.tenant.id, label: session.tenant.name } : undefined}
          forcedDivision={divisionId ? { id: divisionId, label: 'Your division', note: 'locked to your account' } : undefined}
          onCreated={() => refetch()}
          onClose={() => setEditModal({ open: false, doctor: null })}
        />
      )}
    </div>
  )
}

export default PharmaDoctorsTab
