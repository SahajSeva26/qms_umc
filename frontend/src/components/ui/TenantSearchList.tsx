import { useState } from 'react'
import { FiCheckCircle, FiSearch } from 'react-icons/fi'
import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { Input } from '@/components/ui/input'

interface TenantSearchListProps {
  id?: string
  value: string
  onChange: (tenantId: string, tenantLabel: string) => void
  searchPlaceholder?: string
  emptyText?: string
}

// Inline always-expanded result list (unlike AsyncPicker's dropdown shell) —
// search stays visible after picking; the chosen row just gets a checkmark.
const TenantSearchList = ({ id, value, onChange, searchPlaceholder = 'Search by company name…', emptyText }: TenantSearchListProps) => {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const hasSearch = debouncedSearch.trim().length > 0

  const { data, isLoading, isError } = useTenants({ name: debouncedSearch.trim(), limit: '10' }, hasSearch)
  const tenants = hasSearch ? data?.data?.items ?? [] : []

  return (
    <div className="space-y-2">
      <div className="relative">
        <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--qms-text-muted)' }} />
        <Input
          id={id}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-8"
        />
      </div>

      {!hasSearch && (
        <p className="text-[12px] py-3 text-center rounded-xl border" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
          {emptyText ?? 'Start typing a company name above to search.'}
        </p>
      )}
      {hasSearch && isLoading && (
        <p className="text-[12px] py-3 text-center" style={{ color: 'var(--qms-text-muted)' }}>Searching…</p>
      )}
      {hasSearch && isError && (
        <p className="text-[12px] text-danger">Couldn't search companies — try again.</p>
      )}
      {hasSearch && !isLoading && !isError && tenants.length === 0 && (
        <p className="text-[12px] py-3 text-center rounded-xl border" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
          No companies match "{debouncedSearch}".
        </p>
      )}

      {tenants.length > 0 && (
        <div className="space-y-1.5 max-h-56 overflow-y-auto">
          {tenants.map((tenant) => {
            const active = value === tenant.id
            return (
              <button
                key={tenant.id}
                type="button"
                onClick={() => onChange(tenant.id, `${tenant.name} (${tenant.code})`)}
                className="w-full flex items-center justify-between gap-3 p-2.5 rounded-xl border text-left transition-colors"
                style={
                  active
                    ? { borderColor: 'var(--qms-brand)', background: 'color-mix(in srgb, var(--qms-brand) 8%, transparent)' }
                    : { borderColor: 'var(--qms-border)', background: 'var(--qms-surface)' }
                }
              >
                <div className="min-w-0">
                  <div className="text-[12.5px] font-bold truncate" style={{ color: 'var(--qms-text)' }}>{tenant.name}</div>
                  <div className="text-[11px] truncate font-mono" style={{ color: 'var(--qms-text-muted)' }}>{tenant.code}</div>
                </div>
                {active && <FiCheckCircle size={16} style={{ color: 'var(--qms-brand)' }} className="shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default TenantSearchList
