import { useEffect, useRef, useState } from 'react'
import { FiX } from 'react-icons/fi'
import { Input } from '@/components/ui/input'
import { useQuery } from '@tanstack/react-query'
import { crmService } from '@/features/crm/crm.service'
import { LEAD_STATUS_LABEL } from '@/types/crm.types'
import type { LeadEntity } from '@/types/crm.types'

interface LeadIdPickerProps {
  value: string
  label: string
  onChange: (leadId: string, leadLabel: string) => void
}

// Free-text typeahead over GET /leads?title=<keyword> (lead.service.ts's
// search(), case-insensitive partial match) — replaces the old raw
// "paste a Lead ObjectId by hand" text box, which had no way to actually
// find/discover the right id (found 2026-08-03: the field looked inert
// because nothing about it was searchable, even though the backend already
// supports title search). Same plain state + manually-positioned dropdown
// pattern as InternalMembersPicker.tsx (NOT a base-ui Popover — see that
// file's comment for why Popover.Trigger fights a live text input). Unlike
// that component this is a single-select: picking a result replaces the
// current value entirely rather than adding to a list.
const LeadIdPicker = ({ value, label, onChange }: LeadIdPickerProps) => {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [open, setOpen] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timeoutRef.current)
  }, [query])

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

  const searchQuery = { title: debouncedQuery.trim(), limit: '10' }
  const { data, isFetching } = useQuery({
    queryKey: ['leads', searchQuery],
    queryFn: () => crmService.searchLeads(searchQuery),
    enabled: !!debouncedQuery.trim(),
  })
  const results = data?.data?.items ?? []

  const leadLabel = (lead: LeadEntity) => `${lead.title} (${lead.code})`

  const pickLead = (lead: LeadEntity) => {
    onChange(lead.id, leadLabel(lead))
    setQuery('')
    setDebouncedQuery('')
    setOpen(false)
  }

  const clearSelection = () => {
    onChange('', '')
    setQuery('')
    setDebouncedQuery('')
  }

  return (
    <div ref={containerRef} className="relative">
      {value ? (
        <div
          className="flex items-center gap-2 h-8 rounded-lg border px-2.5 text-[13px]"
          style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text)' }}
        >
          <span className="flex-1 truncate">{label || value}</span>
          <button type="button" onClick={clearSelection} aria-label="Clear linked lead">
            <FiX size={13} style={{ color: 'var(--qms-text-muted)' }} />
          </button>
        </div>
      ) : (
        <Input
          placeholder="Search lead by title..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          className="text-[13px]"
        />
      )}

      {open && !value && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 p-1.5 rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10">
          {isFetching && (
            <div className="text-[12px] px-2 py-2" style={{ color: 'var(--qms-text-muted)' }}>Searching…</div>
          )}
          {!isFetching && debouncedQuery.trim() && results.length === 0 && (
            <div className="text-[12px] px-2 py-2" style={{ color: 'var(--qms-text-muted)' }}>No matching leads found.</div>
          )}
          {!isFetching && !debouncedQuery.trim() && (
            <div className="text-[12px] px-2 py-2" style={{ color: 'var(--qms-text-muted)' }}>Type a lead title to search.</div>
          )}
          {results.map((lead) => (
            <button
              key={lead.id}
              type="button"
              onClick={() => pickLead(lead)}
              className="w-full flex items-center justify-between gap-2 text-left text-[13px] px-2 py-1.5 rounded-md transition-colors hover:bg-(--qms-surface-hover)"
              style={{ color: 'var(--qms-text)' }}
            >
              <span className="truncate">{leadLabel(lead)}</span>
              <span className="text-[10px] font-bold uppercase tracking-wide shrink-0" style={{ color: 'var(--qms-text-muted)' }}>
                {LEAD_STATUS_LABEL[lead.status]}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default LeadIdPicker
