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

const PAGE_SIZE = 10

const STATUS_STYLE: Record<VendorStatus, { bg: string; fg: string }> = {
  active: { bg: 'var(--qms-surface-strong)', fg: 'var(--qms-text-soft)' },
  inactive: { bg: 'rgba(244,63,94,.15)', fg: '#e11d48' },
}

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

      <div className="flex flex-wrap items-center gap-2 mb-3">
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
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
                  {['Name', 'Code', 'Primary contact', 'City', ...(canManage ? ['Status'] : [])].map((h) => (
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
                {items.map((vendor) => {
                  const sc = vendor.status ? STATUS_STYLE[vendor.status] : undefined
                  const primaryContact = vendor.contacts[0]
                  return (
                    <tr
                      key={vendor.id}
                      onClick={() => canUpdate && setEditModal({ open: true, vendor })}
                      className={canUpdate ? 'cursor-pointer transition-colors hover:bg-(--qms-surface-hover)' : ''}
                      style={{ borderBottom: '1px solid var(--qms-border)' }}
                    >
                      <td className="px-4 py-2.5 font-semibold" style={{ color: 'var(--qms-text)' }}>{vendor.name}</td>
                      <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--qms-text-muted)' }}>{vendor.code}</td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>{primaryContact?.name ?? '—'}</td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>{vendor.address?.city ?? '—'}</td>
                      {canManage && sc && (
                        <td className="px-4 py-2.5">
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: sc.bg, color: sc.fg }}
                          >
                            {vendor.status?.toUpperCase()}
                          </span>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {items.length === 0 && (
            <div className="px-4 py-10 text-center text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
              No vendors found.
            </div>
          )}
        </div>
        <PaginationControls page={page} totalPages={totalPages(totalCount)} onPageChange={setPage} />
      </QueryStateBlock>

      {editModal.open && (
        <EditVendorMasterModal
          vendor={editModal.vendor}
          canManageStatus={canManage}
          onClose={() => setEditModal({ open: false, vendor: null })}
        />
      )}
    </div>
  )
}

export default InventoryVendorsPanel
