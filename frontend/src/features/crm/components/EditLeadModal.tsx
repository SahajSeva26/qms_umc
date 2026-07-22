import { useState } from 'react'
import { FiPackage, FiSave } from 'react-icons/fi'
import type { LeadEntity, LeadOffer, LeadProjectType } from '@/types/crm.types'
import { LEAD_PROJECT_TYPE_LABEL } from '@/types/crm.types'
import type { UpdateLeadPayload } from '@/types/crm.types'
import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'
import { useRoles } from '@/features/access-management/role/hooks/useRoles'
import { editLeadSchema } from '@/features/crm/schemas/lead.schemas'
import { THERAPIES, SPECIALTIES, CURRENT_ACTIVITIES, QMS_OFFERINGS } from '@/features/crm/crm.constants'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import DatePicker from '@/components/ui/DatePicker'
import { SegRow, SegButton } from '@/components/ui/SegButton'
import { WzChipRow, WzChipToggle } from '@/components/ui/WzChip'
import ChipPicker from '@/features/crm/components/wizard/ChipPicker'
import { labelClasses, labelStyle, fieldClasses } from '@/features/crm/components/wizard/wizard.styles'

interface EditLeadModalProps {
  lead: LeadEntity
  onSave: (payload: UpdateLeadPayload) => Promise<unknown>
  onClose: () => void
}

// All 13 fields UpdateLeadPayloadSchema accepts (crm.types.ts's own doc
// comment on UpdateLeadPayload lists exactly this set) — tenant/division/
// status are deliberately absent from both the payload and this form:
// tenant/division are immutable post-create, and status only ever moves
// through moveStage, never this endpoint.
interface EditFormState {
  contactPersonId: string
  salesPersonId: string
  title: string
  problemStatement: string
  numberOfMRS: number
  projectType: LeadProjectType | ''
  focusTherapy: string[]
  focusTherapyDoctor: string[]
  currentlyDoing: string[]
  offers: LeadOffer[]
  notes: string
  estimatedValue: number
  confidence: number
  followUpDate: string
}

const toFormState = (lead: LeadEntity): EditFormState => ({
  contactPersonId: typeof lead.contactPerson === 'string' ? lead.contactPerson : lead.contactPerson._id ?? '',
  salesPersonId: typeof lead.salesPerson === 'string' ? lead.salesPerson : lead.salesPerson._id ?? '',
  title: lead.title,
  problemStatement: lead.problemStatement,
  numberOfMRS: lead.numberOfMRS,
  projectType: lead.projectType,
  focusTherapy: lead.focusTherapy,
  focusTherapyDoctor: lead.focusTherapyDoctor,
  currentlyDoing: lead.currentlyDoing,
  offers: lead.offers,
  notes: lead.notes ?? '',
  estimatedValue: lead.estimatedValue,
  confidence: lead.confidence,
  followUpDate: lead.followUpDate ? lead.followUpDate.slice(0, 10) : '',
})

const PROJECT_TYPES: LeadProjectType[] = ['screening', 'diet', 'tele_diet', 'lab', 'mixed']

const EditLeadModal = ({ lead, onSave, onClose }: EditLeadModalProps) => {
  const [form, setForm] = useState<EditFormState>(() => toFormState(lead))
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const setField = <K extends keyof EditFormState>(key: K, value: EditFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  // Lead's own tenant is immutable here — contact person is scoped to it,
  // same rule the wizard enforces at create time (contactPerson.tenant must
  // equal the lead's tenant, see lead.service.ts's create() guard).
  const tenantId = typeof lead.tenant === 'string' ? lead.tenant : lead.tenant._id
  const { data: contactRoleData, isLoading: contactRolesLoading, isError: contactRolesErrored } =
    useRoles(tenantId ? { tenant: tenantId, status: 'active' } : { tenant: undefined })
  const contactRoles = contactRoleData?.data?.items ?? []

  const { data: tenantData, isError: tenantsErrored } = useTenants({ status: 'active' })
  const platformTenant = tenantData?.data?.items.find((t) => t.type === 'platform')
  const { data: salesRoleData, isLoading: salesRolesLoading, isError: salesRolesErrored } =
    useRoles(platformTenant ? { tenant: platformTenant.id, status: 'active' } : { tenant: undefined })
  const salesRoles = platformTenant ? salesRoleData?.data?.items ?? [] : []

  const isOfferSelected = (code: string) => form.offers.some((o) => o.code === code)
  const toggleOffer = (code: string) => {
    setField('offers', isOfferSelected(code) ? form.offers.filter((o) => o.code !== code) : [...form.offers, { code, subOffer: '', reason: '' }])
  }
  const updateOffer = (code: string, field: 'subOffer' | 'reason', value: string) => {
    setField('offers', form.offers.map((o) => (o.code === code ? { ...o, [field]: value } : o)))
  }
  const toggleActivity = (activity: string) => {
    setField('currentlyDoing', form.currentlyDoing.includes(activity) ? form.currentlyDoing.filter((a) => a !== activity) : [...form.currentlyDoing, activity])
  }

  const handleSave = async () => {
    const result = editLeadSchema.safeParse(form)
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Please complete the required fields.')
      return
    }
    setError(null)

    const payload: UpdateLeadPayload = {
      contactPerson: form.contactPersonId,
      salesPerson: form.salesPersonId,
      title: form.title,
      problemStatement: form.problemStatement,
      numberOfMRS: form.numberOfMRS,
      projectType: form.projectType || undefined,
      focusTherapy: form.focusTherapy,
      focusTherapyDoctor: form.focusTherapyDoctor,
      currentlyDoing: form.currentlyDoing,
      offers: form.offers,
      notes: form.notes || undefined,
      estimatedValue: form.estimatedValue,
      confidence: form.confidence,
      followUpDate: form.followUpDate || undefined,
    }

    setIsSaving(true)
    try {
      await onSave(payload)
      onClose()
    } catch {
      // no-op: useLeads' updateLeadMutation.onError already toasted
    } finally {
      setIsSaving(false)
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
          <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>Edit lead</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <Label className={labelClasses} style={labelStyle}>Title *</Label>
            <Input
              type="text"
              value={form.title}
              onChange={(e) => setField('title', e.target.value)}
              className={fieldClasses}
            />
          </div>

          <div>
            <Label className={labelClasses} style={labelStyle}>Problem statement *</Label>
            <Textarea
              value={form.problemStatement}
              onChange={(e) => setField('problemStatement', e.target.value)}
              rows={3}
              className={fieldClasses}
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Label className={labelClasses} style={labelStyle}>No. of MRs</Label>
              <Input
                type="number"
                value={form.numberOfMRS || ''}
                onChange={(e) => setField('numberOfMRS', Number(e.target.value))}
                className={fieldClasses}
              />
            </div>
            <div>
              <Label className={labelClasses} style={labelStyle}>Estimated value (₹)</Label>
              <Input
                type="number"
                value={form.estimatedValue || ''}
                onChange={(e) => setField('estimatedValue', Number(e.target.value))}
                className={fieldClasses}
              />
            </div>
          </div>

          <div>
            <Label className={labelClasses} style={labelStyle}>Contact person *</Label>
            <Select value={form.contactPersonId} onValueChange={(v) => setField('contactPersonId', v as string)}>
              <SelectTrigger className={`w-full ${fieldClasses}`}>
                <SelectValue placeholder={contactRolesLoading ? 'Loading...' : 'Select contact person...'}>
                  {(v: string) => {
                    const r = contactRoles.find((role) => role.id === v)
                    return r ? `${r.name} (${r.code})` : contactRolesLoading ? 'Loading...' : 'Select contact person...'
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {contactRoles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name} ({r.code})</SelectItem>)}
              </SelectContent>
            </Select>
            {contactRolesErrored && (
              <p className="text-[11px] mt-1 text-danger">Couldn't load contacts — try again.</p>
            )}
          </div>

          <div>
            <Label className={labelClasses} style={labelStyle}>Sales rep *</Label>
            <Select value={form.salesPersonId} onValueChange={(v) => setField('salesPersonId', v as string)}>
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
            {(tenantsErrored || salesRolesErrored) && (
              <p className="text-[11px] mt-1 text-danger">Couldn't load sales reps — try again.</p>
            )}
          </div>

          <div>
            <Label className={labelClasses} style={labelStyle}>Focus therapy *</Label>
            <ChipPicker options={THERAPIES} selected={form.focusTherapy} onChange={(v) => setField('focusTherapy', v)} placeholder="Add a therapy area..." />
          </div>

          <div>
            <Label className={labelClasses} style={labelStyle}>Focus doctor specialty *</Label>
            <ChipPicker options={SPECIALTIES} selected={form.focusTherapyDoctor} onChange={(v) => setField('focusTherapyDoctor', v)} placeholder="Add a specialty..." />
          </div>

          <div>
            <Label className={labelClasses} style={labelStyle}>Currently doing *</Label>
            <WzChipRow>
              {CURRENT_ACTIVITIES.map((activity) => (
                <WzChipToggle key={activity} active={form.currentlyDoing.includes(activity)} onClick={() => toggleActivity(activity)}>
                  {activity}
                </WzChipToggle>
              ))}
            </WzChipRow>
          </div>

          <div>
            <Label className={labelClasses} style={labelStyle}>Type of project *</Label>
            <SegRow>
              {PROJECT_TYPES.map((pt) => (
                <SegButton key={pt} active={form.projectType === pt} onClick={() => setField('projectType', pt)}>
                  {LEAD_PROJECT_TYPE_LABEL[pt]}
                </SegButton>
              ))}
            </SegRow>
          </div>

          <div>
            <Label className={labelClasses} style={labelStyle}>QMS can offer *</Label>
            <WzChipRow>
              {QMS_OFFERINGS.map((offer) => (
                <WzChipToggle key={offer.code} active={isOfferSelected(offer.code)} onClick={() => toggleOffer(offer.code)}>
                  {offer.label}
                </WzChipToggle>
              ))}
            </WzChipRow>

            {form.offers.map((offer) => {
              const label = QMS_OFFERINGS.find((o) => o.code === offer.code)?.label ?? offer.code
              return (
                <div key={offer.code} className="rounded-[10px] border p-2.5 mt-2" style={{ borderColor: 'var(--qms-border)' }}>
                  <div className="flex items-center gap-1.5 text-[12px] font-extrabold mb-1.5" style={{ color: 'var(--qms-text)' }}>
                    <FiPackage size={12} /> {label}
                  </div>
                  <Input
                    type="text"
                    value={offer.subOffer ?? ''}
                    onChange={(e) => updateOffer(offer.code, 'subOffer', e.target.value)}
                    className={`${fieldClasses} mb-2`}
                    placeholder="Sub-offering detail..."
                  />
                  <Textarea
                    value={offer.reason ?? ''}
                    onChange={(e) => updateOffer(offer.code, 'reason', e.target.value)}
                    rows={2}
                    className={fieldClasses}
                    placeholder="Reason for this offering *"
                  />
                </div>
              )
            })}
          </div>

          <div>
            <Label className={labelClasses} style={labelStyle}>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
              rows={3}
              className={fieldClasses}
              placeholder="Internal notes..."
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Label className={labelClasses} style={labelStyle}>Next follow-up date</Label>
              <DatePicker
                value={form.followUpDate}
                onChange={(iso) => setField('followUpDate', iso)}
                className={`w-full ${fieldClasses}`}
              />
            </div>
            <div>
              <Label className={labelClasses} style={labelStyle}>
                Confidence — <span style={{ color: 'var(--qms-brand)', fontWeight: 800 }}>{form.confidence}%</span>
              </Label>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={form.confidence}
                onChange={(e) => setField('confidence', Number(e.target.value))}
                className="w-full mt-2.5"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="px-5 pb-5 pt-3" style={{ borderTop: '1px solid var(--qms-border)' }}>
          {error && <p className="text-[12px] text-danger mr-auto self-center">{error}</p>}
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving} className="font-bold text-white" style={{ background: 'linear-gradient(135deg, var(--qms-brand), #3b6dff 60%, var(--qms-teal))' }}>
            <FiSave size={14} /> {isSaving ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default EditLeadModal
