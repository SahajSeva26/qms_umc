import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FiUpload, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi'
import { usePermission } from '@/hooks/usePermission'
import { useRoleTypes } from '@/features/access-management/role-type/hooks/useRoleTypes'
import { useRoles } from '@/features/access-management/role/hooks/useRoles'
import { useBulkCreateMr } from '@/features/crm/divisions/hooks/useBulkCreateMr'
import { useCreateRole } from '@/features/access-management/role/hooks/useCreateRole'
import { singleMrSchema, type SingleMrFormValues } from '@/features/crm/divisions/schemas/division.schemas'
import { getApiErrorMessage } from '@/utils/apiError'
import { toast } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

interface MrProvisioningCardProps {
  tenantId: string
  divisionId: string
}

const EMPTY_SINGLE_MR_VALUES: SingleMrFormValues = { firstName: '', lastName: '', email: '', password: '', phone: '' }

// Provisions MRs for this division two ways: one at a time (POST /roles) or
// in bulk via CSV (POST /divisions/bulk-mr, division.service.ts's
// bulkCreateMr) — every MR, either way, reports to the single ASM selected
// below. Since this card only ever renders inside DivisionDetailPage, tenant
// and division are already fixed and known.
//
// Permission model — the two write paths have genuinely different backend
// guards, and populating the ASM/MR role-type pickers has its own guard too:
//   - POST /roles (single add):        tenant:admin OR tenant:manage
//   - POST /divisions/bulk-mr (CSV):   tenant:admin OR division:manage
//   - GET /role-types (ASM/MR lookup): tenant:admin OR tenant:manage
// A division:manage-only user can call the bulk-import endpoint but can't
// call role-type search to populate the required ASM picker — a real
// backend permission-policy gap (logged, not routed around here). So CSV is
// only ever shown when the caller ALSO holds tenant:admin/tenant:manage,
// not merely when they hold a bulk-import-capable permission.
const MrProvisioningCard = ({ tenantId, divisionId }: MrProvisioningCardProps) => {
  const { hasAnyPermission } = usePermission()
  const canLookupRoleData = hasAnyPermission(['tenant:admin', 'tenant:manage'])
  const canSingleAdd = canLookupRoleData
  const canAttemptBulkImport = hasAnyPermission(['tenant:admin', 'division:manage'])
  const canShowCsv = canAttemptBulkImport && canLookupRoleData
  const canSeeCard = canSingleAdd || canShowCsv

  // Default to CSV when both are available (preserves the existing
  // workflow); if only Single is permitted, there's nothing to toggle.
  const [mode, setMode] = useState<'single' | 'csv'>('csv')
  const activeMode = canShowCsv ? mode : 'single'
  // An error from one mode must not linger when switching to the other.
  const switchMode = (next: 'single' | 'csv') => { setMode(next); setFormError(null) }

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [supervisor, setSupervisor] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    data: asmRoleTypeData,
    isLoading: isLoadingAsmType,
    isError: isAsmTypeError,
    refetch: refetchAsmType,
  } = useRoleTypes({ code: 'pharma-asm', status: 'active', tenant: tenantId }, !!tenantId && canLookupRoleData)
  const asmRoleTypeId = asmRoleTypeData?.data?.items?.[0]?.id

  const {
    data: mrRoleTypeData,
    isLoading: isLoadingMrType,
    isError: isMrTypeError,
    refetch: refetchMrType,
  } = useRoleTypes({ code: 'pharma-mr', status: 'active', tenant: tenantId }, !!tenantId && canLookupRoleData)
  const mrRoleTypeId = mrRoleTypeData?.data?.items?.[0]?.id

  const {
    data: asmRolesData,
    isLoading: isLoadingAsms,
    isError: isAsmRolesError,
    refetch: refetchAsmRoles,
  } = useRoles(
    { tenant: tenantId, division: divisionId, type: asmRoleTypeId, status: 'active' },
    // Explicitly gated, not just incidentally prevented by asmRoleTypeId
    // being unresolved for an unauthorized caller — protects against stale
    // cached role-type data surviving a session/permission change.
    !!tenantId && !!divisionId && !!asmRoleTypeId && canLookupRoleData,
  )
  const asmCandidates = asmRolesData?.data?.items ?? []

  const roleTypeLookupSettled = !isLoadingAsmType && !isLoadingMrType
  const roleTypeLookupErrored = isAsmTypeError || isMrTypeError
  // Only "missing" once both queries genuinely succeeded with no result —
  // an error must show a retry state, not be reported as bad tenant setup.
  const roleTypeMissing = roleTypeLookupSettled && !roleTypeLookupErrored && (!asmRoleTypeId || !mrRoleTypeId)
  // Blocks BOTH write paths, not just Single — an unresolved/failed/missing
  // role type means neither POST /roles nor POST /divisions/bulk-mr can
  // succeed (both need a real MR/ASM role type id server-side).
  const roleDataBlocked = !roleTypeLookupSettled || roleTypeLookupErrored || roleTypeMissing

  // "No active ASM" is only meaningful once the ASM role type itself
  // resolved AND the roles search for it actually succeeded — otherwise the
  // roles query is either still disabled (asmRoleTypeId unresolved, or
  // blocked by role-type error/missing above) or has itself failed, and
  // either state would make "no active ASM" a misleading thing to claim.
  const asmListReady = !roleDataBlocked && !isLoadingAsms && !isAsmRolesError
  const noActiveAsm = asmListReady && asmCandidates.length === 0

  const bulkCreateMr = useBulkCreateMr()
  const createRole = useCreateRole()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SingleMrFormValues>({ resolver: zodResolver(singleMrSchema), defaultValues: EMPTY_SINGLE_MR_VALUES })

  const handlePickFile = (picked: File | null) => {
    setFile(picked)
    bulkCreateMr.reset()
  }

  const handleImport = () => {
    if (roleDataBlocked) return
    if (!supervisor) {
      setFormError('Select an ASM to supervise the imported MRs.')
      return
    }
    if (!file) {
      setFormError('Choose a CSV file to upload.')
      return
    }
    setFormError(null)
    bulkCreateMr.mutate({ tenant: tenantId, division: divisionId, supervisor, file })
  }

  const onSubmitSingle = async (values: SingleMrFormValues) => {
    if (roleDataBlocked || !mrRoleTypeId) return
    if (!supervisor) {
      setFormError('Select an ASM to supervise this MR.')
      return
    }
    setFormError(null)
    try {
      await createRole.mutateAsync({
        // Matches the bulk-import path's own generated name exactly
        // (division.service.ts) — firstName only, not the full name.
        name: `pharma-mr role for ${values.firstName.trim()}`,
        // code omitted — the backend auto-generates one for pharma-mr.
        type: mrRoleTypeId,
        tenant: tenantId,
        division: divisionId,
        supervisor,
        permissions: [],
        user: {
          firstName: values.firstName,
          lastName: values.lastName || undefined,
          email: values.email,
          password: values.password,
          phone: values.phone || undefined,
        },
      })
      toast.success('MR added')
      // Keep the selected ASM — only the person fields reset, so adding
      // several MRs in a row to the same supervisor doesn't re-prompt for it.
      reset(EMPTY_SINGLE_MR_VALUES)
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not add this MR — try again.'))
    }
  }

  const result = bulkCreateMr.data

  if (!canSeeCard) return null

  return (
    <div
      className="rounded-xl border p-5 mt-5"
      style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
    >
      <h2 className="text-sm font-bold mb-1" style={{ color: 'var(--qms-text)' }}>
        Add MRs
      </h2>
      <p className="text-[12px] mb-4" style={{ color: 'var(--qms-text-muted)' }}>
        Add a single MR, or upload a CSV to create MR accounts for this division in bulk. Every MR added will report to the ASM selected below.
      </p>

      {canShowCsv && (
        <div
          className="inline-flex gap-1 p-1 rounded-[10px] mb-4"
          style={{ background: 'var(--qms-surface-strong, rgba(0,0,0,.04))' }}
        >
          <button
            type="button"
            aria-pressed={activeMode === 'single'}
            onClick={() => switchMode('single')}
            className="rounded-lg text-xs font-bold border-0"
            style={{
              padding: '6px 14px',
              background: activeMode === 'single' ? 'var(--qms-card)' : 'transparent',
              color: activeMode === 'single' ? 'var(--qms-text)' : 'var(--qms-text-muted)',
              boxShadow: activeMode === 'single' ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
            }}
          >
            Single
          </button>
          <button
            type="button"
            aria-pressed={activeMode === 'csv'}
            onClick={() => switchMode('csv')}
            className="rounded-lg text-xs font-bold border-0"
            style={{
              padding: '6px 14px',
              background: activeMode === 'csv' ? 'var(--qms-card)' : 'transparent',
              color: activeMode === 'csv' ? 'var(--qms-text)' : 'var(--qms-text-muted)',
              boxShadow: activeMode === 'csv' ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
            }}
          >
            CSV
          </button>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <Label htmlFor="mr-provisioning-asm" className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
            Supervisor (ASM) *
          </Label>
          <Select key={supervisor || 'empty'} value={supervisor || undefined} onValueChange={(v) => setSupervisor(v ?? '')}>
            <SelectTrigger id="mr-provisioning-asm" className="w-full text-[13px]">
              <SelectValue placeholder={isLoadingAsms ? 'Loading ASMs…' : 'Select ASM'}>
                {(v: string) => {
                  const rt = asmCandidates.find((r) => r.id === v)
                  return rt ? rt.name : 'Select ASM'
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {asmCandidates.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {noActiveAsm && (
            <p className="text-[11px] mt-1.5 text-danger">
              No active ASM found for this division — create one before adding MRs.
            </p>
          )}
          {isAsmRolesError && (
            <div className="text-[11px] mt-1.5 text-danger flex items-center justify-between gap-2">
              <span>Couldn't load ASMs for this division.</span>
              <button
                type="button"
                className="font-semibold underline decoration-dotted underline-offset-2 hover:no-underline shrink-0"
                onClick={() => refetchAsmRoles()}
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {roleTypeLookupErrored && (
          <div className="text-[12px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger flex items-center justify-between gap-2">
            <span>Couldn't load role configuration for this tenant.</span>
            <button
              type="button"
              className="font-semibold underline decoration-dotted underline-offset-2 hover:no-underline shrink-0"
              onClick={() => { refetchAsmType(); refetchMrType() }}
            >
              Retry
            </button>
          </div>
        )}
        {roleTypeMissing && (
          <div className="text-[12px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
            This tenant is missing a required role type (MR or ASM) — contact an admin before adding MRs.
          </div>
        )}

        {activeMode === 'single' ? (
          <form onSubmit={handleSubmit(onSubmitSingle)} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="mr-provisioning-firstName" className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>First name *</Label>
                <Input id="mr-provisioning-firstName" {...register('firstName')} />
                {errors.firstName && <p className="text-[11px] mt-1 text-danger">{errors.firstName.message}</p>}
              </div>
              <div>
                <Label htmlFor="mr-provisioning-lastName" className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Last name</Label>
                <Input id="mr-provisioning-lastName" {...register('lastName')} />
              </div>
            </div>
            <div>
              <Label htmlFor="mr-provisioning-email" className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Email *</Label>
              <Input id="mr-provisioning-email" type="email" {...register('email')} />
              {errors.email && <p className="text-[11px] mt-1 text-danger">{errors.email.message}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="mr-provisioning-password" className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Password *</Label>
                <Input id="mr-provisioning-password" type="password" {...register('password')} />
                {errors.password && <p className="text-[11px] mt-1 text-danger">{errors.password.message}</p>}
              </div>
              <div>
                <Label htmlFor="mr-provisioning-phone" className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Phone</Label>
                <Input id="mr-provisioning-phone" {...register('phone')} />
                {errors.phone && <p className="text-[11px] mt-1 text-danger">{errors.phone.message}</p>}
              </div>
            </div>

            {formError && <p className="text-[12px] text-danger">{formError}</p>}

            <Button
              type="submit"
              disabled={createRole.isPending || roleDataBlocked}
              className="font-bold text-white"
              style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
            >
              {createRole.isPending ? 'Adding…' : 'Add MR'}
            </Button>
          </form>
        ) : (
          <>
            <div>
              <Label htmlFor="mr-provisioning-csv" className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                CSV file *
              </Label>
              <div
                className="rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors hover:bg-(--qms-surface-hover)"
                style={{ borderColor: 'var(--qms-border)' }}
                onClick={() => fileInputRef.current?.click()}
              >
                <FiUpload size={20} className="mx-auto mb-1.5" style={{ color: 'var(--qms-text-muted)' }} />
                <p className="text-[13px] font-semibold" style={{ color: 'var(--qms-text)' }}>
                  {file ? file.name : 'Click to choose a CSV file'}
                </p>
                <input
                  id="mr-provisioning-csv"
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => handlePickFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <p className="text-[11px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>
                Required columns: firstName, lastName, email, phone, password. Max file size 10MB.
              </p>
            </div>

            {formError && <p className="text-[12px] text-danger">{formError}</p>}

            {bulkCreateMr.isError && (
              <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger mt-4">
                {getApiErrorMessage(bulkCreateMr.error, 'Could not import MRs — try again.')}
              </div>
            )}

            {result && (
              <div
                className="text-[12px] rounded-xl px-3 py-2.5 mt-4 space-y-1.5"
                style={{ background: 'var(--qms-surface-strong)' }}
              >
                <div className="flex items-center gap-2 font-semibold" style={{ color: 'var(--qms-text)' }}>
                  {result.failed === 0 ? (
                    <FiCheckCircle style={{ color: 'var(--success)' }} />
                  ) : (
                    <FiAlertTriangle className="text-danger" />
                  )}
                  {result.created !== undefined ? (
                    <span>
                      {result.created} of {result.totalRows} rows imported successfully
                    </span>
                  ) : (
                    <span>{result.failed} row{result.failed === 1 ? '' : 's'} failed</span>
                  )}
                </div>
                {result.invalidRows !== undefined && result.invalidRows > 0 && (
                  <div style={{ color: 'var(--qms-text-muted)' }}>
                    {result.invalidRows} row{result.invalidRows === 1 ? '' : 's'} skipped for invalid/missing data.
                  </div>
                )}
                {result.errors.length > 0 && (
                  <div className="space-y-0.5 text-danger">
                    {result.errors.map((e, i) => (
                      <div key={i}>
                        Row {(e.index ?? i) + 1}: {typeof e.error === 'string' ? e.error : (e.error as { message?: string })?.message ?? 'Failed to create.'}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Button
              onClick={handleImport}
              disabled={bulkCreateMr.isPending || roleDataBlocked}
              className="mt-4 font-bold text-white"
              style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
            >
              <FiUpload size={14} /> {bulkCreateMr.isPending ? 'Importing…' : 'Import MRs'}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

export default MrProvisioningCard
