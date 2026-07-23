import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FiCheckCircle, FiSearch } from 'react-icons/fi'
import type { WizardFormState } from '@/features/projects/wizard.types'
import { projectsService } from '@/features/projects/projects.service'
import SectionHeader from '@/components/ui/SectionHeader'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { labelClasses, labelStyle } from '@/features/projects/components/wizard/wizard.styles'

interface WizardStep0Props {
  form: WizardFormState
  setField: <K extends keyof WizardFormState>(key: K, value: WizardFormState[K]) => void
}

// New step, doesn't exist on the old mock wizard — POST /projects requires an
// existing `lead` id, and tenant/division are derived server-side from it.
//
// Restricted to status=won leads as a UX-only convention (backend's own
// create() never actually checks the source lead's status — only that it
// exists and no Project already exists for it yet). A power user hitting the
// API directly could still create a Project from a non-won lead; this picker
// simply never offers that path through the UI.
const WizardStep0 = ({ form, setField }: WizardStep0Props) => {
  const [search, setSearch] = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['project-wizard-won-leads', search],
    queryFn: () => projectsService.searchWonLeads(search ? { title: search } : {}),
  })

  const leads = data?.data?.items ?? []

  const selectLead = (leadId: string, title: string, tenantId: string, tenantName: string, divisionName: string) => {
    setField('leadId', leadId)
    setField('leadTitle', title)
    setField('leadTenantId', tenantId)
    setField('leadTenantName', tenantName)
    setField('leadDivisionName', divisionName)
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

      {isLoading && (
        <p className="text-[12px] py-4 text-center" style={{ color: 'var(--qms-text-muted)' }}>Loading leads…</p>
      )}
      {isError && (
        <p className="text-[12px] text-danger">Couldn't load leads — try again.</p>
      )}
      {!isLoading && !isError && leads.length === 0 && (
        <p className="text-[12px] py-4 text-center rounded-xl border" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
          No won leads found. A project can only be created from a lead that has reached the "Won" stage.
        </p>
      )}

      <div className="space-y-1.5 max-h-72 overflow-y-auto">
        {leads.map((lead) => {
          const tenantId = typeof lead.tenant === 'string' ? lead.tenant : lead.tenant._id ?? ''
          const tenantName = typeof lead.tenant === 'string' ? '' : lead.tenant.name
          const divisionName = typeof lead.division === 'string' ? '' : lead.division.name
          const active = form.leadId === lead.id
          return (
            <button
              key={lead.id}
              onClick={() => selectLead(lead.id, lead.title, tenantId, tenantName, divisionName)}
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
