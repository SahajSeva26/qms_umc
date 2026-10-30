import { useState } from 'react'
import { FiPlus, FiTag, FiSearch } from 'react-icons/fi'
import { useBrands } from '@/features/crm/brands/hooks/useBrands'
import { usePermission } from '@/hooks/usePermission'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { usePagination } from '@/hooks/usePagination'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import PaginationControls from '@/components/ui/PaginationControls'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import BrandsTable from '@/features/crm/brands/components/BrandsTable'
import EditBrandModal from '@/features/crm/brands/components/EditBrandModal'
import type { BrandEntity } from '@/types/brand.types'

interface DivisionBrandsSectionProps {
  tenantId: string
  divisionId: string
}

const PAGE_SIZE = 10

const DivisionBrandsSection = ({ tenantId, divisionId }: DivisionBrandsSectionProps) => {
  const { hasAnyPermission } = usePermission()
  const canManage = hasAnyPermission(['brand:manage', 'tenant:manage', 'tenant:admin'])

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const { page, setPage, totalPages, resetToFirstPage } = usePagination(PAGE_SIZE)
  const [editModal, setEditModal] = useState<{ open: boolean; brand: BrandEntity | null }>({ open: false, brand: null })

  const { data, isLoading, error, refetch } = useBrands({
    division: divisionId,
    tenant: tenantId,
    name: debouncedSearch || undefined,
    page: String(page),
    limit: String(PAGE_SIZE),
  })
  const brands = data?.data?.items ?? []
  const totalCount = data?.data?.count ?? 0

  return (
    <div>
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'color-mix(in oklch, var(--qms-brand), transparent 88%)' }}
          >
            <FiTag size={14} style={{ color: 'var(--qms-brand)' }} />
          </div>
          <div>
            <h2 className="text-base font-bold" style={{ color: 'var(--qms-text)' }}>Brands</h2>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
              {!isLoading && !error ? `${totalCount} total` : 'Brands for this division.'}
            </p>
          </div>
        </div>
        {canManage && (
          <Button
            onClick={() => setEditModal({ open: true, brand: null })}
            className="text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
          >
            <FiPlus size={14} /> New brand
          </Button>
        )}
      </div>

      <div className="relative mb-3">
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

      <QueryStateBlock isLoading={isLoading} error={error} loadingLabel="Loading brands…" errorLabel="Failed to load brands. Please try again." onRetry={refetch}>
        <BrandsTable brands={brands} onOpen={(brand) => setEditModal({ open: true, brand })} />
        <PaginationControls page={page} totalPages={totalPages(totalCount)} onPageChange={setPage} />
      </QueryStateBlock>

      <EditBrandModal
        open={editModal.open}
        brand={editModal.brand}
        divisionId={divisionId}
        canManage={canManage}
        onClose={() => setEditModal({ open: false, brand: null })}
      />
    </div>
  )
}

export default DivisionBrandsSection
