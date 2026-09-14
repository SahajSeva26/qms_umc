import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FiUpload, FiCheckCircle, FiAlertTriangle, FiX } from 'react-icons/fi'
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
import PasswordInput from '@/components/ui/PasswordInput'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

interface MrProvisioningCardProps {
  tenantId: string
  divisionId: string
  // Called after a successful single-MR add only — a bulk import's result
  // summary needs to stay visible instead of closing the drawer.
  onSingleCreated?: () => void
}

const EMPTY_SINGLE_MR_VALUES: SingleMrFormValues = { firstName: '', lastName: '', email: '', password: '', phone: '' }

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.round(bytes / 1024)} KB`
}

// CSV is only shown when the caller also holds tenant:admin/tenant:manage —
// division:manage alone can bulk-import but can't populate the ASM picker.
const MrProvisioningCard = ({ tenantId, divisionId, onSingleCreated }: MrProvisioningCardProps) => {
  const { hasAnyPermission } = usePermission()
  const canLookupRoleData = hasAnyPermission(['tenant:admin', 'tenant:manage'])
  const canAttemptBulkImport = hasAnyPermission(['tenant:admin', 'division:manage'])
  const canShowCsv = canAttemptBulkImport && canLookupRoleData

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
    // Explicitly gated (not just incidentally blocked by asmRoleTypeId being
    // unresolved) — protects against stale cached data surviving a permission change.
    !!tenantId && !!divisionId && !!asmRoleTypeId && canLookupRoleData,
  )
  const asmCandidates = asmRolesData?.data?.items ?? []

  const roleTypeLookupSettled = !isLoadingAsmType && !isLoadingMrType
  const roleTypeLookupErrored = isAsmTypeError || isMrTypeError
  // Only "missing" once both queries genuinely succeeded with no result —
  // an error must show a retry state, not be reported as bad tenant setup.
  const roleTypeMissing = roleTypeLookupSettled && !roleTypeLookupErrored && (!asmRoleTypeId || !mrRoleTypeId)
  // Blocks BOTH write paths, not just Single — both need a real MR/ASM role
  // type id server-side.
  const roleDataBlocked = !roleTypeLookupSettled || roleTypeLookupErrored || roleTypeMissing

  // "No active ASM" is only meaningful once the roles search actually
  // succeeded — otherwise it's still loading, blocked, or itself failed.
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

  // Also resets the native input's value so re-picking the same file still
  // fires onChange; leaves any in-flight result/error untouched.
  const clearSelection = () => {
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // An explicit user-driven Remove additionally drops any stale error/result
  // from a previous attempt, unlike the success-driven auto-clear above.
  const removeFile = () => {
    clearSelection()
    bulkCreateMr.reset()
  }

  // Without this reset, re-picking the same file wouldn't fire onChange —
  // the input's value never actually changed from the browser's perspective.
  const openFilePicker = () => {
    if (fileInputRef.current) fileInputRef.current.value = ''
    fileInputRef.current?.click()
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
    bulkCreateMr.mutate(
      { tenant: tenantId, division: divisionId, supervisor, file },
      { onSuccess: (result) => { if (result.failed === 0 && (result.invalidRows ?? 0) === 0) clearSelection() } },
    )
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
      onSingleCreated?.()
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not add this MR — try again.'))
    }
  }

  const result = bulkCreateMr.data

  return (
    <div>
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
              <Input id="mr-provisioning-email" type="email" autoComplete="off" {...register('email')} />
              {errors.email && <p className="text-[11px] mt-1 text-danger">{errors.email.message}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="mr-provisioning-password" className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Password *</Label>
                <PasswordInput id="mr-provisioning-password" autoComplete="new-password" {...register('password')} />
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
              {file ? (
                <div className="rounded-xl border border-success bg-success-soft px-4 py-3 flex items-center gap-3 text-success">
                  <FiCheckCircle size={18} className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold truncate" title={file.name}>{file.name}</p>
                    <p className="text-[11px] opacity-80">{formatFileSize(file.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={openFilePicker}
                    className="text-[12px] font-semibold underline decoration-dotted underline-offset-2 hover:no-underline shrink-0"
                  >
                    Change file
                  </button>
                  <button
                    type="button"
                    onClick={removeFile}
                    aria-label="Remove selected file"
                    className="shrink-0 rounded-full p-1 hover:bg-black/5"
                  >
                    <FiX size={16} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={openFilePicker}
                  className="w-full rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors hover:bg-(--qms-surface-hover)"
                  style={{ borderColor: 'var(--qms-border)' }}
                >
                  <FiUpload size={20} className="mx-auto mb-1.5" style={{ color: 'var(--qms-text-muted)' }} />
                  <p className="text-[13px] font-semibold" style={{ color: 'var(--qms-text)' }}>
                    Click to choose a CSV file
                  </p>
                </button>
              )}
              <input
                id="mr-provisioning-csv"
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => handlePickFile(e.target.files?.[0] ?? null)}
              />
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
                  {result.failed === 0 && (result.invalidRows ?? 0) === 0 ? (
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
