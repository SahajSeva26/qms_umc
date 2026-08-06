import { useRef, useState } from 'react'
import { FiUpload, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi'
import { useRoleTypes } from '@/features/access-management/role-type/hooks/useRoleTypes'
import { useRoles } from '@/features/access-management/role/hooks/useRoles'
import { useBulkCreateMr } from '@/features/crm/divisions/hooks/useBulkCreateMr'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

interface BulkMrImportCardProps {
  tenantId: string
  divisionId: string
}

// Bulk-imports MRs for this division via POST /divisions/bulk-mr
// (division.routes.ts/.service.ts's bulkCreateMr, added alongside "division
// compulsory for roles of pharma" / "added: role heirarchy") — every row in
// the uploaded CSV becomes one User + one pharma-mr Role, ALL reporting to
// the single ASM selected below (the backend has no per-row supervisor
// column — `supervisor` is one batch-level id stamped onto every row). Since
// this card only ever renders inside DivisionDetailPage, tenant and division
// are already fixed and known — the only thing left to pick is which ASM
// under this division the imported MRs report to.
//
// ASM candidates are resolved the same two-step way RoleDetailPage.tsx
// resolves a role's supervisor candidates: look up the tenant's `pharma-asm`
// RoleType id, then search Roles scoped to {tenant, division, type, status:
// 'active'}. Inactive ASMs are excluded from the picker for the same reason
// RoleDetailPage.tsx excludes them from its own supervisor picker — the
// backend's own supervisor validation never checks status itself.
const BulkMrImportCard = ({ tenantId, divisionId }: BulkMrImportCardProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [supervisor, setSupervisor] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const { data: asmRoleTypeData } = useRoleTypes({ code: 'pharma-asm', status: 'active', tenant: tenantId }, !!tenantId)
  const asmRoleTypeId = asmRoleTypeData?.data?.items?.[0]?.id

  const { data: asmRolesData, isLoading: isLoadingAsms } = useRoles(
    { tenant: tenantId, division: divisionId, type: asmRoleTypeId, status: 'active' },
    !!tenantId && !!divisionId && !!asmRoleTypeId,
  )
  const asmCandidates = asmRolesData?.data?.items ?? []

  const bulkCreateMr = useBulkCreateMr()

  const handlePickFile = (picked: File | null) => {
    setFile(picked)
    bulkCreateMr.reset()
  }

  const handleImport = () => {
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

  const result = bulkCreateMr.data

  return (
    <div
      className="rounded-xl border p-5 mt-5"
      style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
    >
      <h2 className="text-sm font-bold mb-1" style={{ color: 'var(--qms-text)' }}>
        Bulk import MRs
      </h2>
      <p className="text-[12px] mb-4" style={{ color: 'var(--qms-text-muted)' }}>
        Upload a CSV to create MR accounts for this division in bulk. Every MR created will report to the ASM selected below.
      </p>

      <div className="space-y-4">
        <div>
          <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
            Supervisor (ASM) *
          </Label>
          <Select key={supervisor || 'empty'} value={supervisor || undefined} onValueChange={(v) => setSupervisor(v ?? '')}>
            <SelectTrigger className="w-full text-[13px]">
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
          {!isLoadingAsms && asmCandidates.length === 0 && (
            <p className="text-[11px] mt-1.5 text-danger">
              No active ASM found for this division — create one before bulk-importing MRs.
            </p>
          )}
        </div>

        <div>
          <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
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
      </div>

      {bulkCreateMr.isError && (
        <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger mt-4">
          {(bulkCreateMr.error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Could not import MRs — try again.'}
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
        disabled={bulkCreateMr.isPending}
        className="mt-4 font-bold text-white"
        style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
      >
        <FiUpload size={14} /> {bulkCreateMr.isPending ? 'Importing…' : 'Import MRs'}
      </Button>
    </div>
  )
}

export default BulkMrImportCard
