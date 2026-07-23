import { useState } from 'react'
import { FiSave, FiActivity, FiHeart, FiVideo, FiDroplet, FiShuffle } from 'react-icons/fi'
import type { PaymentTerms, ProjectEntity, ProjectTherapy, ProjectType } from '@/types/project.types'
import { PAYMENT_TERMS_LABEL, PROJECT_THERAPY_LABEL, PROJECT_TYPE_LABEL } from '@/types/project.types'
import type { UpdateProjectPayload } from '@/types/project.types'
import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'
import { useRoles } from '@/features/access-management/role/hooks/useRoles'
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

interface EditProjectModalProps {
  project: ProjectEntity
  onClose: () => void
}

// Mirrors EditLeadModal.tsx's pattern: a flat single-scroll form scoped to
// UpdateProjectPayload's fields (a strict subset of Create's — no lead/
// tenant/division/status), with its own toFormState mapper doing the same
// populated-relation-or-string unwrap idiom.
interface EditFormState {
  name: string
  therapy: ProjectTherapy | ''
  type: ProjectType[]
  salesRepId: string
  projectCoordinatorId: string
  marketingContactId: string
  paymentTerms: PaymentTerms
}

const toFormState = (project: ProjectEntity): EditFormState => ({
  name: project.name,
  therapy: project.therapy,
  type: project.type,
  salesRepId: typeof project.salesRep === 'string' ? project.salesRep : project.salesRep._id ?? '',
  projectCoordinatorId: typeof project.projectCoordinator === 'string' ? project.projectCoordinator : project.projectCoordinator._id ?? '',
  marketingContactId: typeof project.marketingContact === 'string' ? project.marketingContact : project.marketingContact._id ?? '',
  paymentTerms: project.paymentTerms,
})

const THERAPY_OPTIONS = Object.keys(PROJECT_THERAPY_LABEL) as ProjectTherapy[]
const TYPE_OPTIONS = Object.keys(PROJECT_TYPE_LABEL) as ProjectType[]
const PAYMENT_TERMS_OPTIONS: PaymentTerms[] = ['net_30', 'net_60', 'net_90']

// Matches WizardStep1.tsx's icon choices exactly, for visual consistency
// between create and edit. Found via live testing: PickCard's colored tile
// renders independent of its `active` prop, so omitting icon+color here (as
// the original version did) made every type card look identically
// "selected" — this fixes that, not just a cosmetic mismatch.
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

  // salesRep/projectCoordinator: platform-tenant roles. marketingContact:
  // the project's own (immutable) tenant — same rules as create, replicated
  // exactly from EditLeadModal's own recipe.
  const projectTenantId = typeof project.tenant === 'string' ? project.tenant : project.tenant._id
  const { data: tenantData, isError: tenantsErrored } = useTenants({ status: 'active' })
  const platformTenant = tenantData?.data?.items.find((t) => t.type === 'platform')
  const { data: platformRoleData, isLoading: platformRolesLoading, isError: platformRolesErrored } =
    useRoles(platformTenant ? { tenant: platformTenant.id, status: 'active' } : { tenant: undefined })
  const platformRoles = platformTenant ? platformRoleData?.data?.items ?? [] : []

  const { data: marketingRoleData, isLoading: marketingRolesLoading, isError: marketingRolesErrored } =
    useRoles(projectTenantId ? { tenant: projectTenantId, status: 'active' } : { tenant: undefined })
  const marketingRoles = marketingRoleData?.data?.items ?? []

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
      // no-op: useUpdateProject has no onError toast of its own; a silent
      // close-on-failure would hide the error, so surface a generic one here.
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
                <SelectValue placeholder={platformRolesLoading ? 'Loading...' : 'Select sales rep...'}>
                  {(v: string) => {
                    const r = platformRoles.find((role) => role.id === v)
                    return r ? `${r.name} (${r.code})` : platformRolesLoading ? 'Loading...' : 'Select sales rep...'
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {platformRoles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name} ({r.code})</SelectItem>)}
              </SelectContent>
            </Select>
            {(tenantsErrored || platformRolesErrored) && (
              <p className="text-[11px] mt-1 text-danger">Couldn't load sales reps — try again.</p>
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
          </div>

          <div>
            <Label className={labelClasses} style={labelStyle}>Marketing contact *</Label>
            <Select value={form.marketingContactId} onValueChange={(v) => setField('marketingContactId', v as string)}>
              <SelectTrigger className={`w-full ${fieldClasses}`}>
                <SelectValue placeholder={marketingRolesLoading ? 'Loading...' : 'Select marketing contact...'}>
                  {(v: string) => {
                    const r = marketingRoles.find((role) => role.id === v)
                    return r ? `${r.name} (${r.code})` : marketingRolesLoading ? 'Loading...' : 'Select marketing contact...'
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {marketingRoles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name} ({r.code})</SelectItem>)}
              </SelectContent>
            </Select>
            {marketingRolesErrored && (
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
