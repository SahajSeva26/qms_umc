import { useState } from 'react'
import { FiPlus, FiSearch } from 'react-icons/fi'
import { usePermission } from '@/hooks/usePermission'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { usePagination } from '@/hooks/usePagination'
import { useTests } from '@/features/test-master/hooks/useTests'
import { PROJECT_THERAPY_LABEL, type ProjectTherapy } from '@/types/project.types'
import { TEST_STATUS_LABEL, type TestStatus } from '@/features/test-master/testMaster.types'
import { CAMP_TYPE_LABEL, CAMP_TYPE_VALUES, type CampType } from '@/types/campReal.types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import PaginationControls from '@/components/ui/PaginationControls'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import EditTestModal from '@/features/test-master/components/EditTestModal'

const PAGE_SIZE = 10
const THERAPY_OPTIONS = Object.keys(PROJECT_THERAPY_LABEL) as ProjectTherapy[]

interface ModalState {
  open: boolean
  testId: string | null
}

const TestMasterTab = () => {
  const { hasAnyPermission } = usePermission()
  const canManage = hasAnyPermission(['test-master:manage'])

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [therapy, setTherapy] = useState<ProjectTherapy | 'ALL'>('ALL')
  const [campType, setCampType] = useState<CampType | 'ALL'>('ALL')
  const [statusFilter, setStatusFilter] = useState<TestStatus>('active')
  const { page, setPage, totalPages, resetToFirstPage } = usePagination(PAGE_SIZE)
  const [modal, setModal] = useState<ModalState>({ open: false, testId: null })

  const { data, isLoading, error, refetch } = useTests({
    name: debouncedSearch || undefined,
    therapy: therapy === 'ALL' ? undefined : therapy,
    campType: campType === 'ALL' ? undefined : campType,
    status: canManage ? statusFilter : undefined,
    page: String(page),
    limit: String(PAGE_SIZE),
  })
  const items = data?.data?.items ?? []
  const totalCount = data?.data?.count ?? 0

  return (
    <div>
      <div className="mb-3 flex items-start justify-between gap-4">
        <p className="text-[12px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
          {!isLoading && !error ? `${totalCount} total` : 'The catalog of tests conducted at camps.'}
        </p>
        {canManage && (
          <Button
            onClick={() => setModal({ open: true, testId: null })}
            className="text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
          >
            <FiPlus size={14} /> New test
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-[220px] max-w-xs">
          <FiSearch size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--qms-text-muted)' }} />
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); resetToFirstPage() }}
            className="pl-8 text-[13px]"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <Select value={therapy} onValueChange={(v) => { setTherapy(v as ProjectTherapy | 'ALL'); resetToFirstPage() }}>
            <SelectTrigger className="w-44 text-[13px]">
              <SelectValue>{() => (therapy === 'ALL' ? 'All therapies' : PROJECT_THERAPY_LABEL[therapy])}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All therapies</SelectItem>
              {THERAPY_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>{PROJECT_THERAPY_LABEL[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={campType} onValueChange={(v) => { setCampType(v as CampType | 'ALL'); resetToFirstPage() }}>
            <SelectTrigger className="w-40 text-[13px]">
              <SelectValue>{() => (campType === 'ALL' ? 'All camp types' : CAMP_TYPE_LABEL[campType])}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All camp types</SelectItem>
              {CAMP_TYPE_VALUES.map((t) => (
                <SelectItem key={t} value={t}>{CAMP_TYPE_LABEL[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canManage && (
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as TestStatus); resetToFirstPage() }}>
              <SelectTrigger className="w-36 text-[13px]">
                <SelectValue>{() => TEST_STATUS_LABEL[statusFilter]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <QueryStateBlock isLoading={isLoading} error={error} loadingLabel="Loading tests…" errorLabel="Failed to load tests. Please try again." onRetry={refetch}>
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
                  {['Code', 'Name', 'Therapy', 'Camp type', 'Resources', ...(canManage ? ['Status', ''] : [])].map((h) => (
                    <th
                      key={h}
                      className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5"
                      style={{ color: 'var(--qms-text-muted)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((test) => (
                  <tr key={test.id} style={{ borderBottom: '1px solid var(--qms-border)' }}>
                    <td className="px-4 py-2.5 font-mono font-semibold" style={{ color: 'var(--qms-text)' }}>{test.code}</td>
                    <td className="px-4 py-2.5 max-w-xs truncate" style={{ color: 'var(--qms-text)' }} title={test.name}>{test.name}</td>
                    <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>{PROJECT_THERAPY_LABEL[test.therapy]}</td>
                    <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>{test.campType ? CAMP_TYPE_LABEL[test.campType] : '—'}</td>
                    <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>{test.consumption.length}</td>
                    {canManage && (
                      <>
                        <td className="px-4 py-2.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${test.status === 'active' ? 'bg-success-soft text-success' : ''}`}
                            style={test.status !== 'active' ? { background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' } : undefined}
                          >
                            {test.status === 'active' ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <Button variant="outline" size="sm" onClick={() => setModal({ open: true, testId: test.id })}>
                            Edit
                          </Button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {items.length === 0 && (
            <div className="px-4 py-10 text-center text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
              No tests found.
            </div>
          )}
        </div>
        <PaginationControls page={page} totalPages={totalPages(totalCount)} onPageChange={setPage} />
      </QueryStateBlock>

      {modal.open && (
        <EditTestModal testId={modal.testId} onClose={() => setModal({ open: false, testId: null })} />
      )}
    </div>
  )
}

export default TestMasterTab
