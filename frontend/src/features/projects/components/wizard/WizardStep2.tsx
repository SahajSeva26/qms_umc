import { useFormContext, useWatch } from 'react-hook-form'
import { FiFile, FiFileText, FiMail } from 'react-icons/fi'
import type { WizardFormState } from '@/features/projects/wizard.types'
import type { ExecutionModeType } from '@/types/project.types'
import { EXECUTION_MODE_LABEL } from '@/types/project.types'
import { addMonthsIso, monthsBetween, asZeroWhenBlank } from '@/features/projects/projects.utils'
import { PickCard, PickGrid } from '@/components/ui/PickCard'
import SectionHeader from '@/components/ui/SectionHeader'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { labelClasses, labelStyle, fieldClasses } from '@/features/projects/components/wizard/wizard.styles'
import { useWizardFieldError } from '@/features/projects/components/wizard/WizardValidationContext'

const MODE_ICONS: Record<ExecutionModeType, typeof FiFile> = { po: FiFile, agreement: FiFileText, mail_confirmation: FiMail }
const MODE_OPTIONS: ExecutionModeType[] = ['po', 'agreement', 'mail_confirmation']

// agreementDocument/emailDocument are plain URL text fields on the backend
// schema — no file-upload endpoint exists for them yet.
const WizardStep2 = () => {
  const { register, control, setValue } = useFormContext<WizardFormState>()
  const fieldError = useWizardFieldError()
  const mode = useWatch({ control, name: 'mode' })
  const poExpiry = useWatch({ control, name: 'poExpiry' })
  const agreementStartDate = useWatch({ control, name: 'agreementStartDate' })
  const agreementEndDate = useWatch({ control, name: 'agreementEndDate' })
  const duration = useWatch({ control, name: 'duration' })

  return (
    <div className="space-y-4">
      <div>
        <Label className={labelClasses} style={labelStyle}>Execution mode *</Label>
        <PickGrid>
          {MODE_OPTIONS.map((m) => (
            <PickCard
              key={m}
              active={mode === m}
              label={EXECUTION_MODE_LABEL[m]}
              icon={MODE_ICONS[m]}
              onClick={() => setValue('mode', m, { shouldValidate: true, shouldDirty: true })}
            />
          ))}
        </PickGrid>
      </div>

      {mode === 'po' && (
        <div className="space-y-3">
          <SectionHeader icon={FiFile}>PO Based details</SectionHeader>
          <div>
            <Label className={labelClasses} style={labelStyle}>PO number *</Label>
            <Input type="text" className={fieldClasses} {...register('poNumber')} />
            {fieldError('poNumber') && <p className="text-[11px] mt-1 text-danger">{fieldError('poNumber')}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className={labelClasses} style={labelStyle}>PO date *</Label>
              <Input
                type="date"
                {...register('poDate', {
                  onChange: (e) => {
                    if (!poExpiry) {
                      const expiry = addMonthsIso(e.target.value, 12)
                      if (expiry) setValue('poExpiry', expiry, { shouldDirty: true })
                    }
                  },
                })}
                className={fieldClasses}
              />
              {fieldError('poDate') && <p className="text-[11px] mt-1 text-danger">{fieldError('poDate')}</p>}
            </div>
            <div>
              <Label className={labelClasses} style={labelStyle}>PO expiry</Label>
              <Input type="date" {...register('poExpiry')} className={fieldClasses} placeholder="blank → +12 months" />
            </div>
          </div>
        </div>
      )}

      {mode === 'agreement' && (
        <div className="space-y-3">
          <SectionHeader icon={FiFileText}>Agreement Based details</SectionHeader>
          <div>
            <Label className={labelClasses} style={labelStyle}>Agreement number</Label>
            <Input type="text" {...register('agreementNumber')} className={fieldClasses} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className={labelClasses} style={labelStyle}>Start date *</Label>
              <Input
                type="date"
                {...register('agreementStartDate', {
                  onChange: (e) => {
                    if (agreementEndDate) {
                      const months = monthsBetween(e.target.value, agreementEndDate)
                      if (months !== null) setValue('duration', months, { shouldDirty: true })
                    } else if (duration) {
                      const endDate = addMonthsIso(e.target.value, duration)
                      if (endDate) setValue('agreementEndDate', endDate, { shouldDirty: true })
                    }
                  },
                })}
                className={fieldClasses}
              />
              {fieldError('agreementStartDate') && <p className="text-[11px] mt-1 text-danger">{fieldError('agreementStartDate')}</p>}
            </div>
            <div>
              <Label className={labelClasses} style={labelStyle}>Expiry date</Label>
              <Input
                type="date"
                {...register('agreementEndDate', {
                  onChange: (e) => {
                    if (agreementStartDate) {
                      const months = monthsBetween(agreementStartDate, e.target.value)
                      if (months !== null) setValue('duration', months, { shouldDirty: true })
                    }
                  },
                })}
                className={fieldClasses}
              />
            </div>
            <div>
              <Label className={labelClasses} style={labelStyle}>Duration (months) *</Label>
              <Input
                type="number"
                min={0}
                step={1}
                {...register('duration', {
                  setValueAs: asZeroWhenBlank,
                  onChange: (e) => {
                    const months = asZeroWhenBlank(e.target.value)
                    if (agreementStartDate) {
                      const endDate = addMonthsIso(agreementStartDate, months)
                      if (endDate) setValue('agreementEndDate', endDate, { shouldDirty: true })
                    }
                  },
                })}
                className={fieldClasses}
              />
            </div>
          </div>
          <div>
            <Label className={labelClasses} style={labelStyle}>Agreement document (URL)</Label>
            <Input type="text" {...register('agreementDocument')} className={fieldClasses} placeholder="https://…" />
          </div>
        </div>
      )}

      {mode === 'mail_confirmation' && (
        <div className="space-y-3">
          <SectionHeader icon={FiMail}>Mail Confirmation details</SectionHeader>
          <div>
            <Label className={labelClasses} style={labelStyle}>Email reference / subject *</Label>
            <Input type="text" {...register('emailReference')} className={fieldClasses} />
            {fieldError('emailReference') && <p className="text-[11px] mt-1 text-danger">{fieldError('emailReference')}</p>}
          </div>
          <div>
            <Label className={labelClasses} style={labelStyle}>Attachment (URL)</Label>
            <Input type="text" {...register('emailDocument')} className={fieldClasses} placeholder="https://…" />
          </div>
        </div>
      )}
    </div>
  )
}

export default WizardStep2
