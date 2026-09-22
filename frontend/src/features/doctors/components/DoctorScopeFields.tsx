import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import TenantAsyncPicker from '@/components/ui/TenantAsyncPicker'
import type { DoctorCreateScope } from '@/features/doctors/hooks/useDoctorCreateScope'

interface DoctorScopeFieldsProps {
  scope: DoctorCreateScope
  isEdit: boolean
  forcedTenant?: { id: string; label: string }
  forcedDivision?: { id: string; label: string }
  /** Only affects wrapper className/layout — both callers render otherwise-identical JSX. */
  mode: 'single' | 'csv'
}

const wrapperClassName = (mode: 'single' | 'csv') => (mode === 'single' ? 'sm:col-span-2' : undefined)

// Presentation-only: all state/derivation lives in useDoctorCreateScope, called once by
// EditDoctorModal and passed down here (and to DoctorSingleForm/DoctorCsvImport) as `scope` —
// one source of truth shared by both Single and CSV modes, instead of the duplicated
// division-picker JSX this component replaces.
const DoctorScopeFields = ({ scope, isEdit, forcedTenant, forcedDivision, mode }: DoctorScopeFieldsProps) => {
  if (isEdit) return null

  return (
    <>
      {forcedTenant && (
        <div className={wrapperClassName(mode)}>
          <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Company</label>
          <p className="text-[13px]" style={{ color: 'var(--qms-text)' }}>{forcedTenant.label} <span style={{ color: 'var(--qms-text-muted)' }}>(locked to the camp being booked)</span></p>
        </div>
      )}

      {/* Exactly one of these three division states renders — never more than one. */}
      {forcedDivision ? (
        <div className={wrapperClassName(mode)}>
          <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Division</label>
          <p className="text-[13px]" style={{ color: 'var(--qms-text)' }}>{forcedDivision.label} <span style={{ color: 'var(--qms-text-muted)' }}>(locked to the project's division)</span></p>
        </div>
      ) : scope.isCustomerActor ? (
        <div className={wrapperClassName(mode)}>
          <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Division</label>
          {scope.sessionDivisionId ? (
            <p className="text-[13px]" style={{ color: 'var(--qms-text)' }}>Your assigned division</p>
          ) : (
            <p className="text-[13px] text-danger">Your account isn't assigned to a division — contact an admin before {mode === 'csv' ? 'importing' : 'adding'} doctors.</p>
          )}
        </div>
      ) : null}

      {scope.needsTenantPicker && (
        <div className={wrapperClassName(mode)}>
          <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Company *</label>
          <TenantAsyncPicker
            value={scope.tenantId}
            label={scope.tenantLabel}
            onChange={(tenantId, tenantLabel) => scope.setTenantId(tenantId, tenantLabel)}
          />
        </div>
      )}

      {scope.needsDivisionPicker && (
        <div className={wrapperClassName(mode)}>
          <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Division *</label>
          <Select
            key={scope.divisionId || 'empty'}
            value={scope.divisionId || undefined}
            onValueChange={(v) => scope.setDivisionId(v ?? '')}
            disabled={!scope.effectiveTenantIdForDivisions || scope.divisionsErrored}
          >
            <SelectTrigger className="w-full text-[13px]">
              <SelectValue placeholder={!scope.effectiveTenantIdForDivisions ? 'Select a company first' : scope.divisionsLoading ? 'Loading...' : 'Select division...'}>
                {(v: string) => scope.divisions.find((d) => d.id === v)?.name ?? (scope.divisionsLoading ? 'Loading...' : 'Select division...')}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {scope.divisions.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {scope.effectiveTenantIdForDivisions && scope.divisionsErrored && (
            <div className="flex items-center gap-2 mt-1">
              <p className="text-[11px] text-danger">Couldn't load this company's divisions.</p>
              <button type="button" onClick={() => scope.refetchDivisions()} className="text-[11px] font-semibold underline decoration-dotted underline-offset-2 hover:no-underline">
                Retry
              </button>
            </div>
          )}
          {scope.effectiveTenantIdForDivisions && !scope.divisionsLoading && !scope.divisionsErrored && scope.divisions.length === 0 && (
            <p className="text-[11px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>This company has no divisions yet.</p>
          )}
        </div>
      )}
    </>
  )
}

export default DoctorScopeFields
