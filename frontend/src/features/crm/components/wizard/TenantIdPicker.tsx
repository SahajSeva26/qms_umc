import { useEffect, useRef, useState } from 'react'
import { FiX } from 'react-icons/fi'
import { Input } from '@/components/ui/input'
import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

interface TenantIdPickerProps {
  value: string
  label: string
  onChange: (tenantId: string, tenantLabel: string) => void
}

// Same shape as LeadIdPicker.tsx (this wizard's own Linked lead field) — a
// single search box whose results appear automatically as you type, instead
// of a separate text box + Select the user had to remember to click open
// themselves (found 2026-08-11: the search itself worked, but nothing
// visibly happened on typing since the matching results only ever rendered
// inside a closed dropdown).
const TenantIdPicker = ({ value, label, onChange }: TenantIdPickerProps) => {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 300)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const { data, isFetching } = useTenants(
    { name: debouncedQuery.trim() || undefined, status: 'active', limit: '20' },
    open,
  )
  const results = data?.data?.items ?? []

  const tenantLabel = (t: { name: string; code: string }) => `${t.name} (${t.code})`

  const pickTenant = (t: { id: string; name: string; code: string }) => {
    onChange(t.id, tenantLabel(t))
    setQuery('')
    setOpen(false)
  }

  const clearSelection = () => {
    onChange('', '')
    setQuery('')
  }

  return (
    <div ref={containerRef} className="relative">
      {value ? (
        <div
          className="flex items-center gap-2 h-8 rounded-lg border px-2.5 text-[13px]"
          style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text)' }}
        >
          <span className="flex-1 truncate">{label || value}</span>
          <button type="button" onClick={clearSelection} aria-label="Clear selected company">
            <FiX size={13} style={{ color: 'var(--qms-text-muted)' }} />
          </button>
        </div>
      ) : (
        <Input
          placeholder="Search company by name..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          className="text-[13px]"
        />
      )}

      {open && !value && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 p-1.5 rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 max-h-64 overflow-y-auto">
          {isFetching && (
            <div className="text-[12px] px-2 py-2" style={{ color: 'var(--qms-text-muted)' }}>Searching…</div>
          )}
          {!isFetching && results.length === 0 && (
            <div className="text-[12px] px-2 py-2" style={{ color: 'var(--qms-text-muted)' }}>
              {debouncedQuery.trim() ? 'No matching companies found.' : 'No companies found.'}
            </div>
          )}
          {results.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => pickTenant(t)}
              className="w-full text-left text-[13px] px-2 py-1.5 rounded-md transition-colors hover:bg-(--qms-surface-hover)"
              style={{ color: 'var(--qms-text)' }}
            >
              {tenantLabel(t)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default TenantIdPicker
