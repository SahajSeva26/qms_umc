import { useState } from 'react'
import { FiUserPlus } from 'react-icons/fi'
import { useSession } from '@/hooks/useSession'
import { useDoctorSearch } from '@/hooks/useDoctorSearch'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { usePagination } from '@/hooks/usePagination'
import { usePermission } from '@/hooks/usePermission'
import SearchInput from '@/components/ui/SearchInput'
import StatusPill from '@/components/ui/StatusPill'
import PaginationControls from '@/components/ui/PaginationControls'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import { Button } from '@/components/ui/button'
import { EditDoctorModal } from '@/features/doctors'
import type { DoctorEntity, DoctorStatus } from '@/types/doctor.types'
import { EMPTY_ARRAY } from '@/utils/emptyArray'

const PAGE_SIZE = 10

const STATUS_CLASSES: Record<DoctorStatus, string> = {
  active: 'bg-success-soft text-success',
  inactive: 'bg-danger-soft text-danger',
}
const STATUS_LABEL: Record<DoctorStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
}

// Doctor is division-scoped shared inventory, not owned by any one MR, so this shows "doctors in my division".
const PharmaDoctorsTab = () => {
  const { session } = useSession()
  const { hasPermission } = usePermission()
  const canManageDoctors = hasPermission('doctor:manage')
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
        <SearchInput value={search} onChange={handleSearchChange} placeholder="Search by name..." className="w-64 text-[13px]" />
        {canManageDoctors && (
          <Button onClick={() => setEditModal({ open: true, doctor: null })}>
            <FiUserPlus size={14} /> New doctor
          </Button>
        )}
      </div>

      {!isLoading && !error && (
        <div className="text-[12px] mb-2" style={{ color: 'var(--qms-text-muted)' }}>{totalCount} doctor{totalCount === 1 ? '' : 's'} in your division</div>
      )}

      <QueryStateBlock isLoading={isLoading} error={error} loadingLabel="Loading doctors…" errorLabel="Failed to load doctors. Please try again." onRetry={refetch}>
        {doctors.length === 0 ? (
          <div className="text-[13px] py-10 text-center rounded-xl border" style={{ color: 'var(--qms-text-muted)', borderColor: 'var(--qms-border)' }}>
            No doctors found in your division.
          </div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {doctors.map((doctor) => (
              <div
                key={doctor.id}
                className="rounded-xl border p-3.5 cursor-pointer transition-colors hover:bg-(--qms-surface-hover)"
                style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
                onClick={canManageDoctors ? () => setEditModal({ open: true, doctor }) : undefined}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-[13px] truncate" style={{ color: 'var(--qms-text)' }}>{doctor.name}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
                      {doctor.pharmaCode} · {doctor.specialization.toUpperCase()}
                    </div>
                  </div>
                  <StatusPill status={doctor.status} classes={STATUS_CLASSES} labels={STATUS_LABEL} />
                </div>
                <div className="text-[11px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>
                  {doctor.location ? `${doctor.location.city}, ${doctor.location.state}` : '—'}
                </div>
              </div>
            ))}
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
