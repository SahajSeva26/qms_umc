import { useFieldArray, useFormContext, useWatch } from 'react-hook-form'
import { FiFile, FiFileText, FiMail, FiPlus, FiTrash2 } from 'react-icons/fi'
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

// agreementDocument/emailDocument/each PO's file stay plain URL/id text fields — the backend's
// file module has no ENTITY_RELATION entry for project sub-documents yet, so real upload is deferred.
const WizardStep2 = () => {
  const { register, control, setValue, formState: { errors } } = useFormContext<WizardFormState>()
  const fieldError = useWizardFieldError()
  const mode = useWatch({ control, name: 'mode' })
  const agreementStartDate = useWatch({ control, name: 'agreementStartDate' })
  const agreementEndDate = useWatch({ control, name: 'agreementEndDate' })
  const duration = useWatch({ control, name: 'duration' })
  const { fields: poFields, append: appendPo, remove: removePo } = useFieldArray({ control, name: 'purchaseOrders' })
  const purchaseOrders = useWatch({ control, name: 'purchaseOrders' })

  // Each PO row's own expiry defaults to +12 months from ITS OWN date, independent of other rows —
  // mirrors the single-PO behavior this replaced, just scoped per row instead of globally.
  const autoFillExpiry = (index: number, dateValue: string) => {
    const expiry = purchaseOrders?.[index]?.expiry
    if (expiry) return
    const computed = addMonthsIso(dateValue, 12)
    if (computed) setValue(`purchaseOrders.${index}.expiry`, computed, { shouldDirty: true })
  }

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
          <div className="flex items-center justify-between">
            <SectionHeader icon={FiFile}>PO Based details</SectionHeader>
            <button
              type="button"
              onClick={() => appendPo({ number: '', date: '', expiry: '' })}
              className="text-[12px] font-semibold flex items-center gap-1"
              style={{ color: 'var(--qms-brand)' }}
            >
              <FiPlus size={13} /> Add PO
            </button>
          </div>
          <div className="space-y-3">
            {poFields.map((f, i) => (
              <div key={f.id} className="rounded-lg border p-3 space-y-3" style={{ borderColor: 'var(--qms-border)' }}>
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-3">
                    <div>
                      <Label className={labelClasses} style={labelStyle}>PO number *</Label>
                      <Input type="text" className={fieldClasses} {...register(`purchaseOrders.${i}.number`)} />
                      {errors.purchaseOrders?.[i]?.number && (
                        <p className="text-[11px] mt-1 text-danger">{errors.purchaseOrders[i]?.number?.message}</p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className={labelClasses} style={labelStyle}>PO date *</Label>
                        <Input
                          type="date"
                          {...register(`purchaseOrders.${i}.date`, { onChange: (e) => autoFillExpiry(i, e.target.value) })}
                          className={fieldClasses}
                        />
                        {errors.purchaseOrders?.[i]?.date && (
                          <p className="text-[11px] mt-1 text-danger">{errors.purchaseOrders[i]?.date?.message}</p>
                        )}
                      </div>
                      <div>
                        <Label className={labelClasses} style={labelStyle}>PO expiry</Label>
                        <Input type="date" {...register(`purchaseOrders.${i}.expiry`)} className={fieldClasses} placeholder="blank → +12 months" />
                      </div>
                    </div>
                  </div>
                  {poFields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePo(i)}
                      aria-label="Remove purchase order"
                      className="shrink-0 rounded-full p-1.5 hover:bg-black/5 mt-6"
                    >
                      <FiTrash2 size={14} style={{ color: 'var(--qms-text-muted)' }} />
                    </button>
                  )}
                </div>
              </div>
            ))}
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
            <Label className={labelClasses} style={labelStyle}>Agreement document</Label>
            <Input type="text" disabled className={fieldClasses} placeholder="Document upload isn't wired up yet" />
            <p className="text-[11px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
              The backend expects a real uploaded file here, not a URL — left disabled until that's wired up.
            </p>
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
            <Label className={labelClasses} style={labelStyle}>Attachment</Label>
            <Input type="text" disabled className={fieldClasses} placeholder="Document upload isn't wired up yet" />
            <p className="text-[11px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
              The backend expects a real uploaded file here, not a URL — left disabled until that's wired up.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default WizardStep2
