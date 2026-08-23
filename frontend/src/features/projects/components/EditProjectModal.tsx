import { useState } from 'react'
import { FiSave, FiActivity, FiHeart, FiVideo, FiDroplet, FiShuffle } from 'react-icons/fi'
import type { PaymentTerms, ProjectEntity, ProjectTherapy, ProjectType } from '@/features/projects/project.types'
import { PAYMENT_TERMS_LABEL, PROJECT_THERAPY_LABEL, PROJECT_TYPE_LABEL } from '@/features/projects/projects.constants'
import type { UpdateProjectPayload } from '@/features/projects/project.types'
import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'
import { PLATFORM_TENANT_CODE, PLATFORM_TENANT_FETCH_LIMIT } from '@/features/access-management/accessManagement.constants'
import { useRoles } from '@/features/access-management/role/hooks/useRoles'
import { useRoleTypes } from '@/features/access-management/role-type/hooks/useRoleTypes'
import { useContacts } from '@/features/contacts/hooks/useContacts'
import { useUpdateProject } from '@/features/projects/hooks/useUpdateProject'
import { editProjectSchema } from '@/features/projects/schemas/project.schemas'
import { PROJECT_TYPE_COLOR } from '@/features/projects/projects.utils'
import { PickCard, PickGrid } from '@/components/ui/PickCard'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { labelClasses, labelStyle, fieldClasses } from '@/features/projects/components/wizard/wizard.styles'
import { unwrapId } from '@/utils/unwrapId'

interface EditProjectModalProps {
  project: ProjectEntity
  onClose: () => void
}

// Scoped to UpdateProjectPayload's fields — a strict subset of Create's,
// with no lead/tenant/division/status.
interface EditFormState {
  name: string
  therapy: ProjectTherapy | ''
  type: ProjectType[]
  salesRepId: string
  projectCoordinatorId: string
  marketingContactId: string
  paymentTerms: PaymentTerms
}

// unwrapId guards against null even though these 3 fields are `required: true`
// in project.model.ts — that only enforces new saves, not a populate() that
// resolved to null (stale reference, deleted doc, etc).
const toFormState = (project: ProjectEntity): EditFormState => ({
  name: project.name,
  therapy: project.therapy,
  type: project.type,
  salesRepId: unwrapId(project.salesRep),
  projectCoordinatorId: unwrapId(project.projectCoordinator),
  marketingContactId: unwrapId(project.marketingContact),
  paymentTerms: project.paymentTerms,
})

const THERAPY_OPTIONS = Object.keys(PROJECT_THERAPY_LABEL) as ProjectTherapy[]
const TYPE_OPTIONS = Object.keys(PROJECT_TYPE_LABEL) as ProjectType[]
const PAYMENT_TERMS_OPTIONS: PaymentTerms[] = ['net_30', 'net_60', 'net_90']

// Matches WizardStep1.tsx's icon choices for visual consistency between
// create and edit.
const TYPE_ICONS: Record<ProjectType, typeof FiActivity> = {
  screening_camp: FiActivity,
  diet: FiHeart,
  teleconsultation_diet: FiVideo,
  lab_test: FiDroplet,
  mixed: FiShuffle,
}

const EditProjectModal = ({ project, onClose }: EditProjectModalProps) => {
  const [form, setForm] = useState<EditFormState>(() => toFormState(project))
  const [error, setError] = useState<string | null>(null)
  const updateProject = useUpdateProject()

  const setField = <K extends keyof EditFormState>(key: K, value: EditFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const toggleType = (t: ProjectType) => {
    setField('type', form.type.includes(t) ? form.type.filter((x) => x !== t) : [...form.type, t])
  }

  // marketingContact is sourced from Contacts scoped to the project's own
  // (immutable) division, not Roles.
  const projectDivisionId = unwrapId(project.division, undefined)
  // limit: PLATFORM_TENANT_FETCH_LIMIT — the backend's default 10-result
  // limit can silently exclude the `qms` platform tenant past 10 tenants.
  const { data: tenantData, isError: tenantsErrored } = useTenants({ status: 'active', limit: PLATFORM_TENANT_FETCH_LIMIT })
  // tenant.type is only present on the wire for a system:manage caller; code
  // is always present, so match on it as a fallback.
  const platformTenant = tenantData?.data?.items.find((t) => t.type === 'platform' || t.code === PLATFORM_TENANT_CODE)
  // Sales rep — narrowed to the sales-rep RoleType only; Sales Head is
  // explicitly excluded.
  const { data: salesRepTypeData, isLoading: salesRepTypeLoading, isError: salesRepTypeErrored, isSuccess: salesRepTypeLoaded } = useRoleTypes({ code: 'sales-rep', status: 'active' })
  const salesRepTypeId = salesRepTypeData?.data?.items[0]?.id
  // Hard-stop: `sales-rep` is a required seeded RoleType — if the lookup
  // succeeds but returns zero items, the picker can never resolve a rep.
  const salesRepTypeMissing = salesRepTypeLoaded && !salesRepTypeId

  const { data: salesRepRoleData, isLoading: salesRepRolesLoading, isError: salesRepRolesErrored } = useRoles(
    { tenant: platformTenant?.id, type: salesRepTypeId, status: 'active' },
    !!platformTenant && !!salesRepTypeId,
  )
  const salesRoles = salesRepRoleData?.data?.items ?? []
  const salesRolesLoading = salesRepTypeLoading || salesRepRolesLoading
  const salesRolesErrored = tenantsErrored || salesRepTypeErrored || salesRepRolesErrored

  // Project coordinator — narrowed to the camp-coordinator-screening/
  // camp-coordinator-diet RoleTypes. Same merge + hard-stop shape as Sales rep above.
  const { data: coordScreeningTypeData, isLoading: coordScreeningTypeLoading, isError: coordScreeningTypeErrored, isSuccess: coordScreeningTypeLoaded } = useRoleTypes({ code: 'camp-coordinator-screening', status: 'active' })
  const { data: coordDietTypeData } = useRoleTypes({ code: 'camp-coordinator-diet', status: 'active' })
  const coordScreeningTypeId = coordScreeningTypeData?.data?.items[0]?.id
  const coordDietTypeId = coordDietTypeData?.data?.items[0]?.id
  // Hard-stop, same reasoning as salesRepTypeMissing above.
  const coordTypeMissing = coordScreeningTypeLoaded && !coordScreeningTypeId

  const { data: coordScreeningRoleData, isLoading: coordScreeningRolesLoading, isError: coordScreeningRolesErrored } = useRoles(
    { tenant: platformTenant?.id, type: coordScreeningTypeId, status: 'active' },
    !!platformTenant && !!coordScreeningTypeId,
  )
  const { data: coordDietRoleData, isLoading: coordDietRolesLoading, isError: coordDietRolesErrored } = useRoles(
    { tenant: platformTenant?.id, type: coordDietTypeId, status: 'active' },
    !!platformTenant && !!coordDietTypeId,
  )
  const platformRoles = [...(coordScreeningRoleData?.data?.items ?? []), ...(coordDietRoleData?.data?.items ?? [])]
  const platformRolesLoading = coordScreeningTypeLoading || coordScreeningRolesLoading || coordDietRolesLoading
  const platformRolesErrored = tenantsErrored || coordScreeningTypeErrored || coordScreeningRolesErrored || coordDietRolesErrored

  const { data: marketingContactData, isLoading: marketingContactsLoading, isError: marketingContactsErrored } =
    useContacts({ division: projectDivisionId, status: 'active' }, { enabled: !!projectDivisionId })
  const marketingContacts = marketingContactData?.data?.items ?? []

  const handleSave = async () => {
    const result = editProjectSchema.safeParse({
      name: form.name,
      therapy: form.therapy,
      type: form.type,
      salesRep: form.salesRepId,
      projectCoordinator: form.projectCoordinatorId,
      marketingContact: form.marketingContactId,
      paymentTerms: form.paymentTerms,
    })
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Please complete the required fields.')
      return
    }
    setError(null)

    const payload: UpdateProjectPayload = {
      name: form.name,
      therapy: form.therapy as ProjectTherapy,
      type: form.type,
      salesRep: form.salesRepId,
      projectCoordinator: form.projectCoordinatorId,
      marketingContact: form.marketingContactId,
      paymentTerms: form.paymentTerms,
    }

    try {
      await updateProject.mutateAsync({ id: project.id, payload })
      onClose()
    } catch {
      // no-op: surface handled elsewhere; avoid a silent close-on-failure.
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent
        className="max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0"
        style={{ width: 'min(640px, 92vw)', maxWidth: 'min(640px, 92vw)' }}
        showCloseButton={false}
      >
        <DialogHeader className="px-5 py-4" style={{ borderBottom: '1px solid var(--qms-border)' }}>
          <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>Edit project</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <Label className={labelClasses} style={labelStyle}>Project name *</Label>
            <Input type="text" value={form.name} onChange={(e) => setField('name', e.target.value)} className={fieldClasses} />
          </div>

          <div>
            <Label className={labelClasses} style={labelStyle}>Therapy *</Label>
            <Select value={form.therapy} onValueChange={(v) => setField('therapy', v as ProjectTherapy)}>
              <SelectTrigger className={`w-full ${fieldClasses}`}><SelectValue placeholder="— therapy —" /></SelectTrigger>
              <SelectContent>
                {THERAPY_OPTIONS.map((t) => <SelectItem key={t} value={t}>{PROJECT_THERAPY_LABEL[t]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className={labelClasses} style={labelStyle}>Type of project (multi-select) *</Label>
            <PickGrid>
              {TYPE_OPTIONS.map((t) => (
                <PickCard key={t} active={form.type.includes(t)} color={PROJECT_TYPE_COLOR[t]} label={PROJECT_TYPE_LABEL[t]} icon={TYPE_ICONS[t]} onClick={() => toggleType(t)} />
              ))}
            </PickGrid>
          </div>

          <div>
            <Label className={labelClasses} style={labelStyle}>Sales rep *</Label>
            <Select value={form.salesRepId} onValueChange={(v) => setField('salesRepId', v as string)}>
              <SelectTrigger className={`w-full ${fieldClasses}`}>
                <SelectValue placeholder={salesRolesLoading ? 'Loading...' : 'Select sales rep...'}>
                  {(v: string) => {
                    const r = salesRoles.find((role) => role.id === v)
                    return r ? `${r.name} (${r.code})` : salesRolesLoading ? 'Loading...' : 'Select sales rep...'
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {salesRoles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name} ({r.code})</SelectItem>)}
              </SelectContent>
            </Select>
            {salesRolesErrored && (
              <p className="text-[11px] mt-1 text-danger">Couldn't load sales reps — try again.</p>
            )}
            {salesRepTypeMissing && (
              <p className="text-[11px] mt-1 text-danger">The "Sales rep" role type is missing — contact an admin.</p>
            )}
          </div>

          <div>
            <Label className={labelClasses} style={labelStyle}>Project coordinator *</Label>
            <Select value={form.projectCoordinatorId} onValueChange={(v) => setField('projectCoordinatorId', v as string)}>
              <SelectTrigger className={`w-full ${fieldClasses}`}>
                <SelectValue placeholder={platformRolesLoading ? 'Loading...' : 'Select coordinator...'}>
                  {(v: string) => {
                    const r = platformRoles.find((role) => role.id === v)
                    return r ? `${r.name} (${r.code})` : platformRolesLoading ? 'Loading...' : 'Select coordinator...'
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {platformRoles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name} ({r.code})</SelectItem>)}
              </SelectContent>
            </Select>
            {platformRolesErrored && (
              <p className="text-[11px] mt-1 text-danger">Couldn't load coordinators — try again.</p>
            )}
            {coordTypeMissing && (
              <p className="text-[11px] mt-1 text-danger">The "Camp coordinator" role type is missing — contact an admin.</p>
            )}
          </div>

          <div>
            <Label className={labelClasses} style={labelStyle}>Marketing contact *</Label>
            <Select value={form.marketingContactId} onValueChange={(v) => setField('marketingContactId', v as string)}>
              <SelectTrigger className={`w-full ${fieldClasses}`}>
                <SelectValue placeholder={marketingContactsLoading ? 'Loading...' : 'Select marketing contact...'}>
                  {(v: string) => marketingContacts.find((c) => c.id === v)?.name ?? (marketingContactsLoading ? 'Loading...' : 'Select marketing contact...')}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {marketingContacts.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {marketingContactsErrored && (
              <p className="text-[11px] mt-1 text-danger">Couldn't load marketing contacts — try again.</p>
            )}
          </div>

          <div>
            <Label className={labelClasses} style={labelStyle}>Payment terms *</Label>
            <Select value={form.paymentTerms} onValueChange={(v) => setField('paymentTerms', v as PaymentTerms)}>
              <SelectTrigger className={`w-full ${fieldClasses}`}><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_TERMS_OPTIONS.map((t) => <SelectItem key={t} value={t}>{PAYMENT_TERMS_LABEL[t]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="px-5 pb-5 pt-3" style={{ borderTop: '1px solid var(--qms-border)' }}>
          {error && <p className="text-[12px] text-danger mr-auto self-center">{error}</p>}
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={updateProject.isPending} className="font-bold text-white" style={{ background: 'linear-gradient(135deg, var(--qms-brand), #3b6dff 60%, var(--qms-teal))' }}>
            <FiSave size={14} /> {updateProject.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default EditProjectModal
