import { useNavigate, useSearchParams } from 'react-router-dom'
import { FiPlus } from 'react-icons/fi'
import { useCampsReal } from '@/features/camps/hooks/useCampsReal'
import { useCampsRealFilters } from '@/features/camps/hooks/useCampsRealFilters'
import { usePermission } from '@/hooks/usePermission'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import CampsFilterBarReal from '@/features/camps/components/CampsFilterBarReal'
import CampTableReal from '@/features/camps/components/CampTableReal'
import CampDrawer from '@/features/camps/components/CampDrawer'
import PaginationControls from '@/components/ui/PaginationControls'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import { Button } from '@/components/ui/button'
import { usePagination } from '@/hooks/usePagination'
import type { BillingType } from '@/types/campReal.types'
import { EMPTY_ARRAY } from '@/utils/emptyArray'

// Matches /camps/new's own route guard — a create-only actor must also see the button that leads there.
const CAMP_WRITE_PERMISSIONS = ['camp:create', 'camp:manage', 'tenant:manage']

const PAGE_SIZE = 10

interface TypeScopedCampsPageProps {
  // Never a hypothetical Lab page — Lab stays out of this split.
  type: 'screening' | 'diet'
  title: string
}

// Parallel, parameterized copy of CampsPageReal.tsx's logic — that combined page stays untouched.
// No KPI strip: GET /camps/report can't be scoped by type, so it would show misleading all-type counts here.
const TypeScopedCampsPage = ({ type, title }: TypeScopedCampsPageProps) => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedCampId = searchParams.get('camp')
  const { hasAnyPermission } = usePermission()
  const canWrite = hasAnyPermission(CAMP_WRITE_PERMISSIONS)
  const { filters, setFilter, reset } = useCampsRealFilters()
  const { page, setPage, totalPages, resetToFirstPage } = usePagination(PAGE_SIZE)
  const debouncedCity = useDebouncedValue(filters.city, 300)
  const debouncedState = useDebouncedValue(filters.state, 300)

  const { data, isLoading, error, refetch } = useCampsReal({
    status: filters.status === 'ALL' ? undefined : filters.status,
    type,
    billingType: filters.billingType === 'ALL' ? undefined : (filters.billingType as BillingType),
    city: debouncedCity || undefined,
    state: debouncedState || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    page: String(page),
    limit: String(PAGE_SIZE),
  })
  const camps = data?.data?.items ?? EMPTY_ARRAY
  const totalCount = data?.data?.count ?? 0

  const handleFilterChange = <K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) => {
    setFilter(key, value)
    resetToFirstPage()
  }

  const handleReset = () => {
    reset()
    resetToFirstPage()
  }

  return (
    <div className="w-full">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>
            {title}
          </h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
            {!isLoading && !error ? `${totalCount} total` : `${title} wired to the real backend.`}
          </p>
        </div>
        {canWrite && (
          <Button
            onClick={() => {
              // Lets /camps/new autofill+lock Type and return here on cancel/success (see CampDetailPageReal.tsx).
              const params = new URLSearchParams({ type, from: `${window.location.pathname}${window.location.search}` })
              navigate(`/camps/new?${params.toString()}`)
            }}
            className="text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
          >
            <FiPlus size={14} /> New camp
          </Button>
        )}
      </div>

      <CampsFilterBarReal filters={filters} setFilter={handleFilterChange} reset={handleReset} hideType />

      <QueryStateBlock isLoading={isLoading} error={error} loadingLabel="Loading camps…" errorLabel="Failed to load camps. Please try again." onRetry={refetch}>
        <CampTableReal
          camps={camps}
          onOpen={(id) => {
            const next = new URLSearchParams(searchParams)
            next.set('camp', id)
            setSearchParams(next)
          }}
        />
        <PaginationControls page={page} totalPages={totalPages(totalCount)} onPageChange={setPage} />
      </QueryStateBlock>

      <CampDrawer
        campId={selectedCampId}
        onClose={() => {
          // Replaces, not pushes — otherwise Back after closing would reopen the drawer.
          const next = new URLSearchParams(searchParams)
          next.delete('camp')
          setSearchParams(next, { replace: true })
        }}
      />
    </div>
  )
}

export default TypeScopedCampsPage
