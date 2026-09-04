import { useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { FiCheckCircle, FiSearch } from 'react-icons/fi'
import type { WizardFormState } from '@/features/projects/wizard.types'
import { projectsService } from '@/features/projects/projects.service'
import SectionHeader from '@/components/ui/SectionHeader'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { labelClasses, labelStyle } from '@/features/projects/components/wizard/wizard.styles'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { unwrapId } from '@/utils/unwrapId'
import { useWizardFieldError } from '@/features/projects/components/wizard/WizardValidationContext'

// POST /projects requires an existing `lead` id; tenant/division are derived
// server-side from it. Restricted to status=won leads as a UX-only
// convention — the backend never actually checks the source lead's status.
const WizardStep0 = () => {
  const { control, setValue } = useFormContext<WizardFormState>()
  const leadId = useWatch({ control, name: 'leadId' })
  const leadTitle = useWatch({ control, name: 'leadTitle' })
  const leadTenantName = useWatch({ control, name: 'leadTenantName' })
  const leadDivisionName = useWatch({ control, name: 'leadDivisionName' })
  const fieldError = useWizardFieldError()

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const hasSearch = debouncedSearch.trim().length > 0
  // A lead picked in an earlier session (e.g. resumed from a saved draft)
  // is fully present in the form the moment this step mounts, but the
  // search box below starts empty — with no indicator here, that pick is
  // otherwise invisible until the user either re-searches for it or clicks
  // Next and sees it reflected downstream.
  const hasRestoredSelection = !!leadId && !hasSearch

  // Search-only, no default/browse-all list — nothing fetches until the
  // user types a title.
  const { data, isLoading, isError } = useQuery({
    queryKey: ['project-wizard-won-leads', debouncedSearch],
    queryFn: () => projectsService.searchWonLeads({ title: debouncedSearch }),
    enabled: hasSearch,
  })

  const leads = hasSearch ? data?.data?.items ?? [] : []

  const selectLead = (leadId: string, title: string, tenantId: string, tenantName: string, divisionId: string, divisionName: string) => {
    setValue('leadId', leadId, { shouldValidate: true, shouldDirty: true })
    setValue('leadTitle', title, { shouldDirty: true })
    setValue('leadTenantId', tenantId, { shouldDirty: true })
    setValue('leadTenantName', tenantName, { shouldDirty: true })
    setValue('leadDivisionId', divisionId, { shouldDirty: true })
    setValue('leadDivisionName', divisionName, { shouldDirty: true })
  }

  const clearSelectedLead = () => {
    setValue('leadId', '', { shouldValidate: true, shouldDirty: true })
    setValue('leadTitle', '', { shouldDirty: true })
    setValue('leadTenantId', '', { shouldDirty: true })
    setValue('leadTenantName', '', { shouldDirty: true })
    setValue('leadDivisionId', '', { shouldDirty: true })
    setValue('leadDivisionName', '', { shouldDirty: true })
  }

  return (
    <div className="space-y-3">
      <div>
        <Label className={labelClasses} style={labelStyle}>Search won leads</Label>
        <div className="relative">
          <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--qms-text-muted)' }} />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by lead title..."
            className="pl-8"
          />
        </div>
      </div>

      <SectionHeader icon={FiCheckCircle} spaced={false}>Pick the won lead to convert into a project *</SectionHeader>
      {fieldError('leadId') && <p className="text-[11px] text-danger">{fieldError('leadId')}</p>}

      {hasRestoredSelection && (
        <div
          className="flex items-center justify-between gap-3 p-2.5 rounded-xl border"
          style={{ borderColor: 'var(--qms-brand)', background: 'color-mix(in srgb, var(--qms-brand) 8%, transparent)' }}
        >
          <div className="min-w-0 flex items-center gap-2">
            <FiCheckCircle size={16} style={{ color: 'var(--qms-brand)' }} className="shrink-0" />
            <div className="min-w-0">
              <div className="text-[12.5px] font-bold truncate" style={{ color: 'var(--qms-text)' }}>{leadTitle || '(untitled lead)'}</div>
              <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>
                {leadTenantName || '—'}{leadDivisionName ? ` · ${leadDivisionName}` : ''}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={clearSelectedLead}
            className="text-[11px] font-semibold underline decoration-dotted underline-offset-2 hover:no-underline shrink-0"
            style={{ color: 'var(--qms-brand)' }}
          >
            Change
          </button>
        </div>
      )}

      {!hasSearch && !hasRestoredSelection && (
        <p className="text-[12px] py-4 text-center rounded-xl border" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
          Start typing a lead title above to search. A project can only be created from a lead that
          has reached the "Won" stage.
        </p>
      )}
      {hasSearch && isLoading && (
        <p className="text-[12px] py-4 text-center" style={{ color: 'var(--qms-text-muted)' }}>Loading leads…</p>
      )}
      {hasSearch && isError && (
        <p className="text-[12px] text-danger">Couldn't load leads — try again.</p>
      )}
      {hasSearch && !isLoading && !isError && leads.length === 0 && (
        <p className="text-[12px] py-4 text-center rounded-xl border" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
          No won leads match "{debouncedSearch}".
        </p>
      )}

      <div className="space-y-1.5 max-h-72 overflow-y-auto">
        {leads.map((lead) => {
          const tenantId = unwrapId(lead.tenant)
          const tenantName = typeof lead.tenant === 'string' ? '' : lead.tenant.name
          const divisionId = unwrapId(lead.division)
          const divisionName = typeof lead.division === 'string' ? '' : lead.division.name
          const active = leadId === lead.id
          return (
            <button
              key={lead.id}
              type="button"
              onClick={() => selectLead(lead.id, lead.title, tenantId, tenantName, divisionId, divisionName)}
              className="w-full flex items-center justify-between gap-3 p-2.5 rounded-xl border text-left transition-colors"
              style={
                active
                  ? { borderColor: 'var(--qms-brand)', background: 'color-mix(in srgb, var(--qms-brand) 8%, transparent)' }
                  : { borderColor: 'var(--qms-border)', background: 'var(--qms-surface)' }
              }
            >
              <div className="min-w-0">
                <div className="text-[12.5px] font-bold truncate" style={{ color: 'var(--qms-text)' }}>{lead.title}</div>
                <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>
                  {tenantName || '—'}{divisionName ? ` · ${divisionName}` : ''}
                </div>
              </div>
              {active && <FiCheckCircle size={16} style={{ color: 'var(--qms-brand)' }} className="shrink-0" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default WizardStep0
