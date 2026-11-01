import { useState } from 'react'
import { FiPlus } from 'react-icons/fi'
import { usePermission } from '@/hooks/usePermission'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { usePagination } from '@/hooks/usePagination'
import { useVendorMasters } from '@/features/inventory/real/hooks/useVendorMasters'
import type { VendorMasterEntity, VendorStatus } from '@/types/vendorMaster.types'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import SearchInput from '@/components/ui/SearchInput'
import PaginationControls from '@/components/ui/PaginationControls'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import EditVendorMasterModal from '@/features/inventory/real/components/EditVendorMasterModal'
import VendorMasterDetailDrawer from '@/features/inventory/real/components/VendorMasterDetailDrawer'
import VendorMasterCard from '@/features/inventory/real/components/VendorMasterCard'

const PAGE_SIZE = 10

type SearchField = 'name' | 'code' | 'city'
const SEARCH_FIELD_LABEL: Record<SearchField, string> = { name: 'Name', code: 'Code', city: 'City' }
const SEARCH_FIELD_PLACEHOLDER: Record<SearchField, string> = {
  name: 'Search by name...',
  code: 'Search by code...',
  city: 'Search by city...',
}

// No "all statuses" backend mode exists — an omitted status param means
// active-only, not both, so the filter only ever offers Active/Inactive.
const InventoryVendorsPanel = () => {
  const { hasAnyPermission } = usePermission()
  const canManage = hasAnyPermission(['vendor-master:manage'])
  const canCreate = hasAnyPermission(['vendor-master:create', 'vendor-master:manage'])
  const canUpdate = hasAnyPermission(['vendor-master:update', 'vendor-master:manage'])

  const [searchField, setSearchField] = useState<SearchField>('name')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [status, setStatus] = useState<VendorStatus>('active')
  const { page, setPage, totalPages, resetToFirstPage } = usePagination(PAGE_SIZE)
  const [editModal, setEditModal] = useState<{ open: boolean; vendor: VendorMasterEntity | null }>({ open: false, vendor: null })
  // Card click opens the read-only detail drawer — Edit lives inside it,
  // matching the prototype's own drawer-first pattern (see Item Master).
  const [detailVendor, setDetailVendor] = useState<VendorMasterEntity | null>(null)

  const switchSearchField = (field: SearchField) => {
    setSearchField(field)
    setSearch('')
    resetToFirstPage()
  }

  const { data, isLoading, error, refetch } = useVendorMasters({
    [searchField]: debouncedSearch.trim() || undefined,
    ...(canManage ? { status } : {}),
    page: String(page),
    limit: String(PAGE_SIZE),
  })
  const items = data?.data?.items ?? []
  const totalCount = data?.data?.count ?? 0

  return (
    <div>
      <div className="mb-3 flex items-start justify-between gap-4">
        <p className="text-[12px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
          {!isLoading && !error ? `${totalCount} total` : 'Global vendor registry.'}
        </p>
        {canCreate && (
          <Button
            onClick={() => setEditModal({ open: true, vendor: null })}
            className="text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
          >
            <FiPlus size={14} /> New vendor
          </Button>
        )}
      </div>

      <div
        className="flex flex-wrap items-center gap-2 mb-3 rounded-xl border p-2.5"
        style={{ background: 'var(--qms-surface-card)', borderColor: 'var(--qms-border)' }}
      >
        <Select value={searchField} onValueChange={(v) => switchSearchField(v as SearchField)}>
          <SelectTrigger className="w-28 text-[13px]" aria-label="Search by">
            <SelectValue>{() => SEARCH_FIELD_LABEL[searchField]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="code">Code</SelectItem>
            <SelectItem value="city">City</SelectItem>
          </SelectContent>
        </Select>
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); resetToFirstPage() }}
          placeholder={SEARCH_FIELD_PLACEHOLDER[searchField]}
          wrapperClassName="w-64"
        />
        {canManage && (
          <div className="sm:ml-auto">
            <Select value={status} onValueChange={(v) => { setStatus(v as VendorStatus); resetToFirstPage() }}>
              <SelectTrigger className="w-40 text-[13px]">
                <SelectValue>{() => (status === 'active' ? 'Active' : 'Inactive')}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <QueryStateBlock isLoading={isLoading} error={error} loadingLabel="Loading vendors…" errorLabel="Failed to load vendors. Please try again." onRetry={refetch}>
        {items.length === 0 ? (
          <div className="px-4 py-10 text-center text-[13px] rounded-xl border" style={{ color: 'var(--qms-text-muted)', borderColor: 'var(--qms-border)' }}>
            No vendors found.
          </div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {items.map((vendor) => (
              <VendorMasterCard
                key={vendor.id}
                vendor={vendor}
                canManage={canManage}
                onOpen={(v) => setDetailVendor(v)}
              />
            ))}
          </div>
        )}
        <PaginationControls page={page} totalPages={totalPages(totalCount)} onPageChange={setPage} />
      </QueryStateBlock>

      {editModal.open && (
        <EditVendorMasterModal
          vendor={editModal.vendor}
          canManageStatus={canManage}
          onClose={() => setEditModal({ open: false, vendor: null })}
        />
      )}

      {detailVendor && (
        <VendorMasterDetailDrawer
          vendor={detailVendor}
          canManage={canUpdate}
          onClose={() => setDetailVendor(null)}
          onEdit={() => {
            setEditModal({ open: true, vendor: detailVendor })
            setDetailVendor(null)
          }}
        />
      )}
    </div>
  )
}

export default InventoryVendorsPanel
