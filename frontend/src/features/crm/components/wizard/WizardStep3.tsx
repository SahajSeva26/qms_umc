import type { WizardFormState } from '@/features/crm/wizard.types'
import { PROJECT_TYPES, QMS_OFFERINGS } from '@/features/crm/crm.mock'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

const labelClasses = 'block text-[10px] font-semibold tracking-widest uppercase mb-2'
const labelStyle = { color: 'var(--qms-text-muted)' }

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
        <Label className={labelClasses} style={labelStyle}>Project type *</Label>
        <div className="flex flex-wrap gap-1.5">
          {PROJECT_TYPES.map((pt) => (
            <button
              key={pt}
              onClick={() => setField('projectType', pt)}
              className="text-[12px] font-semibold px-3 py-1.5 rounded-lg border transition-all"
              style={
                form.projectType === pt
                  ? { background: 'var(--qms-brand)', borderColor: 'var(--qms-brand)', color: '#fff' }
                  : { background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }
              }
            >
              {pt}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className={labelClasses} style={labelStyle}>QMS can offer *</Label>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {QMS_OFFERINGS.map((offer) => (
            <button
              key={offer}
              onClick={() => toggleOffer(offer)}
              className="text-[12px] font-semibold px-3 py-1.5 rounded-lg border transition-all"
              style={
                form.qmsOffers.includes(offer)
                  ? { background: 'var(--qms-teal)', borderColor: 'var(--qms-teal)', color: '#fff' }
                  : { background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }
              }
            >
              {offer}
            </button>
          ))}
        </div>

        {form.qmsOffers.map((offer) => (
          <div key={offer} className="rounded-xl border p-3 mb-2" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-strong)' }}>
            <div className="text-[12px] font-bold mb-2" style={{ color: 'var(--qms-text)' }}>{offer}</div>
            <Input
              type="text"
              value={form.qmsOfferDetails[offer]?.sub ?? ''}
              onChange={(e) => updateDetail(offer, 'sub', e.target.value)}
              className="text-[13px] mb-2"
              placeholder="Sub-offering detail..."
            />
            <Textarea
              value={form.qmsOfferDetails[offer]?.reason ?? ''}
              onChange={(e) => updateDetail(offer, 'reason', e.target.value)}
              rows={2}
              className="text-[13px]"
              placeholder="Reason for this offering *"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default WizardStep3
