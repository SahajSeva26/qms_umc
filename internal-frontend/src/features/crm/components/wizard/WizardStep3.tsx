import { FiPackage } from 'react-icons/fi'
import type { WizardFormState } from '@/features/crm/wizard.types'
import type { LeadProjectType } from '@/types/crm.types'
import { LEAD_PROJECT_TYPE_LABEL } from '@/types/crm.types'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { SegRow, SegButton } from '@/components/ui/SegButton'
import { WzChipRow, WzChipToggle } from '@/components/ui/WzChip'
import { labelClasses, labelStyle, fieldClasses } from '@/features/crm/components/wizard/wizard.styles'
import { QMS_OFFERINGS } from '@/features/crm/crm.constants'

const PROJECT_TYPES: LeadProjectType[] = ['screening', 'diet', 'tele_diet', 'lab', 'mixed']

interface WizardStep3Props {
  form: WizardFormState
  setField: <K extends keyof WizardFormState>(key: K, value: WizardFormState[K]) => void
}

const WizardStep3 = ({ form, setField }: WizardStep3Props) => {
  const isSelected = (code: string) => form.offers.some((o) => o.code === code)

  const toggleOffer = (code: string) => {
    if (isSelected(code)) {
      setField('offers', form.offers.filter((o) => o.code !== code))
    } else {
      setField('offers', [...form.offers, { code, subOffer: '', reason: '' }])
    }
  }

  const updateOffer = (code: string, field: 'subOffer' | 'reason', value: string) => {
    setField('offers', form.offers.map((o) => (o.code === code ? { ...o, [field]: value } : o)))
  }

  return (
    <div className="space-y-4">
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
            <WzChipToggle key={offer.code} active={isSelected(offer.code)} onClick={() => toggleOffer(offer.code)}>
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
    </div>
  )
}

export default WizardStep3
