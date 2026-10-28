import { useState } from 'react'
import { FiSearch, FiActivity } from 'react-icons/fi'
import { useDoctorSearch } from '@/hooks/useDoctorSearch'
import { usePermission } from '@/hooks/usePermission'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { usePagination } from '@/hooks/usePagination'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import PaginationControls from '@/components/ui/PaginationControls'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import DoctorDetailDrawer from '@/components/widgets/doctor/DoctorDetailDrawer'
import DivisionDoctorsTable from '@/features/crm/divisions/components/DivisionDoctorsTable'
import type { DoctorEntity, DoctorStatus } from '@/types/doctor.types'
import { EMPTY_ARRAY } from '@/utils/emptyArray'

interface DivisionDoctorsSectionProps {
  tenantId: string
  divisionId: string
}

const PAGE_SIZE = 10

const STATUS_OPTIONS: { value: DoctorStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

// Read-only list — doctors are created/edited from the main Doctor Management page, not here
// (modeled on DivisionContactsSection.tsx, not DivisionMrsSection.tsx's add-a-record flow).
const DivisionDoctorsSection = ({ tenantId, divisionId }: DivisionDoctorsSectionProps) => {
  const { hasPermission } = usePermission()
  // Mirrors DoctorsPage.tsx's own canSeeInactive gate exactly — the backend silently ignores a
  // status filter for a non-doctor:manage actor rather than rejecting/empty-resulting it, so a
  // non-manage viewer selecting "Inactive" would otherwise appear to show inactive doctors while
  // actually showing the backend's unfiltered default.
  const canSeeInactive = hasPermission('doctor:manage')

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [statusFilter, setStatusFilter] = useState<DoctorStatus | 'all'>('all')
  const { page, setPage, totalPages, resetToFirstPage } = usePagination(PAGE_SIZE)
  const [viewDoctor, setViewDoctor] = useState<DoctorEntity | null>(null)

  const { data, isLoading, error, refetch } = useDoctorSearch(
    {
      tenant: tenantId,
      division: divisionId,
      status: statusFilter === 'all' ? undefined : statusFilter,
      name: debouncedSearch || undefined,
      page: String(page),
      limit: String(PAGE_SIZE),
    },
    { enabled: !!tenantId && !!divisionId },
  )
  const doctors = data?.data?.items ?? EMPTY_ARRAY
  const totalCount = data?.data?.count ?? 0

  return (
    <div>
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'color-mix(in oklch, var(--qms-brand), transparent 88%)' }}
          >
            <FiActivity size={14} style={{ color: 'var(--qms-brand)' }} />
          </div>
          <div>
            <h2 className="text-base font-bold" style={{ color: 'var(--qms-text)' }}>Doctors</h2>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
              {!isLoading && !error ? `${totalCount} total` : 'Doctors for this division.'}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative">
          <FiSearch
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--qms-text-muted)' }}
          />
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); resetToFirstPage() }}
            className="pl-8 text-[13px] max-w-xs"
          />
        </div>
        {canSeeInactive && (
          <Select
            value={statusFilter}
            onValueChange={(v) => { setStatusFilter((v as DoctorStatus | 'all') ?? 'all'); resetToFirstPage() }}
          >
            <SelectTrigger className="w-32 text-[13px]">
              <SelectValue>{(v: string) => STATUS_OPTIONS.find((o) => o.value === v)?.label ?? 'All'}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <QueryStateBlock isLoading={isLoading} error={error} loadingLabel="Loading doctors…" errorLabel="Failed to load doctors. Please try again." onRetry={refetch}>
        <DivisionDoctorsTable doctors={doctors} onView={(doctor) => setViewDoctor(doctor)} />
        <PaginationControls page={page} totalPages={totalPages(totalCount)} onPageChange={setPage} />
      </QueryStateBlock>

      <DoctorDetailDrawer doctor={viewDoctor} onClose={() => setViewDoctor(null)} />
    </div>
  )
}

export default DivisionDoctorsSection
