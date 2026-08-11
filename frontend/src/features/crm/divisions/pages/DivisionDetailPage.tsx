import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FiArrowLeft, FiSave } from 'react-icons/fi'
import type { DivisionStatus, DivisionTherapy } from '@/types/crm.types'
import { DIVISION_THERAPY_LABEL } from '@/types/crm.types'
import { useDivision } from '@/features/crm/divisions/hooks/useDivision'
import { useUpdateDivision } from '@/features/crm/divisions/hooks/useUpdateDivision'
import { updateDivisionSchema } from '@/features/crm/divisions/schemas/division.schemas'
import { TENANT_ROUTES } from '@/features/access-management/tenant/tenant.routes'
import BulkMrImportCard from '@/features/crm/divisions/components/BulkMrImportCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

const THERAPY_OPTIONS = Object.keys(DIVISION_THERAPY_LABEL) as DivisionTherapy[]
const STATUS_OPTIONS: { value: DivisionStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

// Edit-only detail page for an existing division — replaces EditDivisionModal
// (row click now navigates here instead of opening a modal), same field set
// and same UpdateDivisionPayloadSchema contract: name/therapy/brandFocus/
// mrCount/status only. No Code/Company/Head/Owner fields, none of which the
// backend allows to change post-creation. Creation stays a modal
// (CreateDivisionModal, opened from TenantDetailPage's inline Divisions
// section's "New Division" button) — out of scope for this page per direct
// instruction.
//
// Only reachable from a company's own page now (2026-08-11: the standalone
// /crm/divisions list was retired — Divisions live under Client Management
// (nee "Companies"), not as a sibling top-level page) — so "back" always
// returns to the owning company, not a divisions list that no longer
// exists in the nav.
const DivisionDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data, isLoading, error } = useDivision(id)
  const division = data?.data ?? null

  // division.tenant is populated ({_id, name, code}) on GET-by-id — see
  // DivisionPopulatedTenant's comment — but typed `| string` for the same
  // create/update-echo duality seen throughout this codebase (RolePopulatedTenant
  // et al.), so this resolves both shapes rather than assuming the object form.
  const tenantId = division ? (typeof division.tenant === 'string' ? division.tenant : division.tenant._id) : undefined

  const [name, setName] = useState('')
  const [therapy, setTherapy] = useState<DivisionTherapy | ''>('')
  const [brandFocus, setBrandFocus] = useState('')
  const [mrCount, setMrCount] = useState(0)
  const [status, setStatus] = useState<DivisionStatus | ''>('')
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (division) {
      setName(division.name)
      setTherapy(division.therapy)
      setBrandFocus(division.brandFocus ?? '')
      setMrCount(division.mrCount ?? 0)
      setStatus(division.status ?? 'active')
    }
  }, [division])

  const updateDivision = useUpdateDivision(id ?? '')

  const handleSave = () => {
    const result = updateDivisionSchema.safeParse({
      name,
      therapy: therapy || undefined,
      brandFocus: brandFocus || undefined,
      mrCount,
      status: status || undefined,
    })
    if (!result.success) {
      setFormError(result.error.issues[0]?.message ?? 'Please complete the required fields.')
      return
    }
    setFormError(null)
    updateDivision.mutate(result.data)
  }

  return (
    <div className="max-w-2xl">
      <button
        onClick={() => navigate(tenantId ? TENANT_ROUTES.TENANT_DETAIL.replace(':id', tenantId) : TENANT_ROUTES.TENANTS)}
        className="flex items-center gap-1.5 text-[13px] font-semibold mb-5 transition-colors hover:opacity-80"
        style={{ color: 'var(--qms-text-soft)' }}
      >
        <FiArrowLeft size={14} />
        Back to company
      </button>

      {isLoading && (
        <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
          Loading division…
        </div>
      )}

      {error && !isLoading && (
        <div className="text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
          Failed to load division. Please try again.
        </div>
      )}

      {division && !isLoading && (
        <>
          <div
            className="rounded-xl border p-5 mb-5"
            style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
          >
            <div className="text-lg font-bold" style={{ color: 'var(--qms-text)' }}>
              {division.name}
            </div>
            <div className="text-[13px] font-mono" style={{ color: 'var(--qms-text-muted)' }}>
              {division.code}
            </div>
          </div>

          <div
            className="rounded-xl border p-5"
            style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
          >
            <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--qms-text)' }}>
              Edit division
            </h2>

            <div className="space-y-4">
              <div>
                <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                  Name *
                </Label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-[13px]"
                />
              </div>

              <div>
                <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                  Therapy area *
                </Label>
                <Select key={therapy || 'empty'} value={therapy || undefined} onValueChange={(v) => setTherapy(v as DivisionTherapy)}>
                  <SelectTrigger className="w-full text-[13px]">
                    <SelectValue placeholder="Select therapy area...">
                      {(v: string) => DIVISION_THERAPY_LABEL[v as DivisionTherapy] ?? 'Select therapy area...'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {THERAPY_OPTIONS.map((t) => <SelectItem key={t} value={t}>{DIVISION_THERAPY_LABEL[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                    Brand focus
                  </Label>
                  <Input
                    type="text"
                    value={brandFocus}
                    onChange={(e) => setBrandFocus(e.target.value)}
                    className="text-[13px]"
                  />
                </div>
                <div>
                  <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                    MR count
                  </Label>
                  <Input
                    type="number"
                    value={mrCount || ''}
                    onChange={(e) => setMrCount(Number(e.target.value))}
                    className="text-[13px]"
                  />
                </div>
              </div>

              <div>
                <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                  Status *
                </Label>
                <Select key={status || 'empty'} value={status || undefined} onValueChange={(v) => setStatus(v as DivisionStatus)}>
                  <SelectTrigger className="w-full text-[13px]">
                    <SelectValue>{(v: string) => STATUS_OPTIONS.find((s) => s.value === v)?.label ?? 'Status'}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {formError && <p className="text-[12px] text-danger">{formError}</p>}
            </div>

            {updateDivision.isError && (
              <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger mt-4">
                {(updateDivision.error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                  'Could not update the division — try again.'}
              </div>
            )}
            {updateDivision.isSuccess && (
              <div className="text-xs rounded-xl px-3 py-2 bg-success-soft text-success mt-4">
                Saved.
              </div>
            )}

            <Button
              onClick={handleSave}
              disabled={updateDivision.isPending}
              className="mt-4 font-bold text-white"
              style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
            >
              <FiSave size={14} /> {updateDivision.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>

          {tenantId && <BulkMrImportCard tenantId={tenantId} divisionId={division.id} />}
        </>
      )}
    </div>
  )
}

export default DivisionDetailPage
