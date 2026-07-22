import { FiPackage } from 'react-icons/fi'
import type { WizardFormState } from '@/features/crm/wizard.types'
import { PROJECT_TYPES, QMS_OFFERINGS } from '@/features/crm/crm.mock'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { SegRow, SegButton } from '@/components/ui/SegButton'
import { WzChipRow, WzChipToggle } from '@/components/ui/WzChip'
import { labelClasses, labelStyle, fieldClasses } from '@/features/crm/components/wizard/wizard.styles'

interface WizardStep3Props {
  form: WizardFormState
  setField: <K extends keyof WizardFormState>(key: K, value: WizardFormState[K]) => void
}

const WizardStep3 = ({ form, setField }: WizardStep3Props) => {
  const toggleOffer = (offer: string) => {
    if (form.qmsOffers.includes(offer)) {
      const next = { ...form.qmsOfferDetails }
      delete next[offer]
      setField('qmsOffers', form.qmsOffers.filter((o) => o !== offer))
      setField('qmsOfferDetails', next)
    } else {
      setField('qmsOffers', [...form.qmsOffers, offer])
      setField('qmsOfferDetails', { ...form.qmsOfferDetails, [offer]: { sub: '', reason: '' } })
    }
  }

  const updateDetail = (offer: string, field: 'sub' | 'reason', value: string) => {
    setField('qmsOfferDetails', {
      ...form.qmsOfferDetails,
      [offer]: { ...form.qmsOfferDetails[offer], [field]: value },
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className={labelClasses} style={labelStyle}>Type of project *</Label>
        <SegRow>
          {PROJECT_TYPES.map((pt) => (
            <SegButton key={pt} active={form.projectType === pt} onClick={() => setField('projectType', pt)}>
              {pt}
            </SegButton>
          ))}
        </SegRow>
      </div>

      <div>
        <Label className={labelClasses} style={labelStyle}>QMS can offer *</Label>
        <WzChipRow>
          {QMS_OFFERINGS.map((offer) => (
            <WzChipToggle key={offer} active={form.qmsOffers.includes(offer)} onClick={() => toggleOffer(offer)}>
              {offer}
            </WzChipToggle>
          ))}
        </WzChipRow>

        {form.qmsOffers.map((offer) => (
          <div key={offer} className="rounded-[10px] border p-2.5 mt-2" style={{ borderColor: 'var(--qms-border)' }}>
            <div className="flex items-center gap-1.5 text-[12px] font-extrabold mb-1.5" style={{ color: 'var(--qms-text)' }}>
              <FiPackage size={12} /> {offer}
            </div>
            <Input
              type="text"
              value={form.qmsOfferDetails[offer]?.sub ?? ''}
              onChange={(e) => updateDetail(offer, 'sub', e.target.value)}
              className={`${fieldClasses} mb-2`}
              placeholder="Sub-offering detail..."
            />
            <Textarea
              value={form.qmsOfferDetails[offer]?.reason ?? ''}
              onChange={(e) => updateDetail(offer, 'reason', e.target.value)}
              rows={2}
              className={fieldClasses}
              placeholder="Reason for this offering *"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default WizardStep3
