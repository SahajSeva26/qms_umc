import { useMemo, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { FiX, FiPlus, FiCalendar, FiClipboard, FiRefreshCw, FiList, FiClock, FiBookOpen, FiEye } from 'react-icons/fi'
import type { WizardFormState } from '@/features/projects/wizard.types'
import type { AvailablePointer, ClientReportCadence } from '@/types/project.types'
import { AVAILABLE_POINTER_LABEL, CLIENT_REPORT_CADENCE_LABEL, PAYMENT_TERMS_LABEL, PROJECT_THERAPY_LABEL, PROJECT_TYPE_LABEL } from '@/types/project.types'
import { computeGstBreakdown, computeBookingPreview, MAX_DAYS_TO_BOOK_BEFORE, asZeroWhenBlank } from '@/features/projects/projects.utils'
import { formatINR } from '@/utils/formatters'
import SectionHeader from '@/components/ui/SectionHeader'
import { ReviewCard, ReviewGrid, ReviewField } from '@/components/ui/ReviewCard'
import { ChipRow, ChipToggle } from '@/components/ui/ChipToggle'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { labelClasses, labelStyle, fieldClasses } from '@/features/projects/components/wizard/wizard.styles'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { useWizardFieldError } from '@/features/projects/components/wizard/WizardValidationContext'

const CADENCE_OPTIONS = Object.keys(CLIENT_REPORT_CADENCE_LABEL) as ClientReportCadence[]
const POINTER_OPTIONS = Object.keys(AVAILABLE_POINTER_LABEL) as AvailablePointer[]

const WizardStep6 = () => {
  const { register, control, setValue } = useFormContext<WizardFormState>()
  const fieldError = useWizardFieldError()
  const daysToBookBefore = useWatch({ control, name: 'daysToBookBefore' })
  const dietChart = useWatch({ control, name: 'dietChart' })
  const clientReportCandance = useWatch({ control, name: 'clientReportCandance' })
  const availablePointers = useWatch({ control, name: 'availablePointers' })
  const name = useWatch({ control, name: 'name' })
  const leadTitle = useWatch({ control, name: 'leadTitle' })
  const leadTenantName = useWatch({ control, name: 'leadTenantName' })
  const leadDivisionName = useWatch({ control, name: 'leadDivisionName' })
  const type = useWatch({ control, name: 'type' })
  const therapy = useWatch({ control, name: 'therapy' })
  const mode = useWatch({ control, name: 'mode' })
  const poNumber = useWatch({ control, name: 'poNumber' })
  const valueBeforeGST = useWatch({ control, name: 'valueBeforeGST' })
  const gst = useWatch({ control, name: 'gst' })
  const totalCamps = useWatch({ control, name: 'totalCamps' })
  const campTimeSlots = useWatch({ control, name: 'campTimeSlots' })
  const paymentTerms = useWatch({ control, name: 'paymentTerms' })

  const [now] = useState(() => Date.now())
  // Preview only — never submitted in the outgoing payload.
  const effectiveEarliestSlotPreview = useMemo(
    () => computeBookingPreview(daysToBookBefore, now),
    [daysToBookBefore, now],
  )
  const { valueAfterGST } = computeGstBreakdown(valueBeforeGST, gst)

  const togglePointer = (p: AvailablePointer) => {
    setValue('availablePointers', availablePointers.includes(p) ? availablePointers.filter((x) => x !== p) : [...availablePointers, p], { shouldDirty: true })
  }

  const addDietChart = () => setValue('dietChart', [...dietChart, { name: '', url: '' }], { shouldDirty: true })
  const updateDietChart = (i: number, field: 'name' | 'url', value: string) =>
    setValue('dietChart', dietChart.map((d, idx) => (idx === i ? { ...d, [field]: value } : d)), { shouldDirty: true })
  const removeDietChart = (i: number) => setValue('dietChart', dietChart.filter((_, idx) => idx !== i), { shouldDirty: true })

  return (
    <div className="space-y-1">
      <SectionHeader icon={FiCalendar} spaced={false}>Pharma booking lead time</SectionHeader>
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <Label className={labelClasses} style={labelStyle}>Days the pharma must book ahead</Label>
          <Input type="number" min={0} max={MAX_DAYS_TO_BOOK_BEFORE} {...register('daysToBookBefore', { setValueAs: asZeroWhenBlank })} className={fieldClasses} />
          {fieldError('daysToBookBefore') && <p className="text-[11px] mt-1 text-danger">{fieldError('daysToBookBefore')}</p>}
        </div>
        <div>
          <Label className={labelClasses} style={labelStyle}>Effective earliest slot (preview)</Label>
          <Input type="text" value={effectiveEarliestSlotPreview} disabled className={fieldClasses} />
        </div>
      </div>
      <p className="text-[11px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>
        e.g. if you set 4 days and the pharma logs in on 2026-05-01, they can only see camp slots from
        2026-05-05 onwards. Set to 0 for same-day bookings.
      </p>

      <SectionHeader icon={FiClipboard}>Diet chart planning · download links</SectionHeader>
      {dietChart.map((d, i) => (
        <div key={i} className="flex gap-2 mb-2">
          <Input type="text" value={d.name} onChange={(e) => updateDietChart(i, 'name', e.target.value)} className={fieldClasses} placeholder="Chart name" />
          <Input type="text" value={d.url} onChange={(e) => updateDietChart(i, 'url', e.target.value)} className={fieldClasses} placeholder="URL" />
          <button type="button" onClick={() => removeDietChart(i)} aria-label="Remove chart" style={{ color: 'var(--qms-text-muted)' }}><FiX size={16} /></button>
        </div>
      ))}
      <button type="button" onClick={addDietChart} className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: 'var(--qms-brand)' }}>
        <FiPlus size={13} /> Add diet chart
      </button>

      <SectionHeader icon={FiRefreshCw}>Auto PO renewal reminder</SectionHeader>
      <Input type="number" min={0} max={100} {...register('poRenewalReminder', { setValueAs: asZeroWhenBlank })} className={fieldClasses} />
      {fieldError('poRenewalReminder') && <p className="text-[11px] mt-1 text-danger">{fieldError('poRenewalReminder')}</p>}
      <p className="text-[11px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>Send reminder at % of billable camps consumed</p>

      <SectionHeader icon={FiCalendar}>Client report cadence</SectionHeader>
      <Select value={clientReportCandance} onValueChange={(v) => setValue('clientReportCandance', v as ClientReportCadence, { shouldDirty: true })}>
        <SelectTrigger className={`w-full ${fieldClasses}`}><SelectValue /></SelectTrigger>
        <SelectContent>
          {CADENCE_OPTIONS.map((c) => (
            <SelectItem key={c} value={c}>{CLIENT_REPORT_CADENCE_LABEL[c]}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <SectionHeader icon={FiList}>Available report pointers</SectionHeader>
      <ChipRow>
        {POINTER_OPTIONS.map((p) => (
          <ChipToggle key={p} active={availablePointers.includes(p)} onClick={() => togglePointer(p)}>
            {AVAILABLE_POINTER_LABEL[p]}
          </ChipToggle>
        ))}
      </ChipRow>

      <SectionHeader icon={FiClock}>TATs (one per line)</SectionHeader>
      <Textarea {...register('tats')} rows={3} className={fieldClasses} />

      <SectionHeader icon={FiBookOpen}>SOPs</SectionHeader>
      <Textarea {...register('sops')} rows={3} className={fieldClasses} />

      <SectionHeader icon={FiEye}>Review</SectionHeader>
      <ReviewCard>
        <ReviewGrid>
          <ReviewField label="Name" value={name || '—'} />
          <ReviewField label="Lead" value={leadTitle || '—'} />
          <ReviewField label="Company" value={leadTenantName || '—'} />
          <ReviewField label="Division" value={leadDivisionName || '—'} />
          <ReviewField label="Type / Therapy" value={`${type.map((t) => PROJECT_TYPE_LABEL[t]).join(', ') || '—'} / ${therapy ? PROJECT_THERAPY_LABEL[therapy] : '—'}`} />
          <ReviewField label="Execution" value={`${mode}${mode === 'po' && poNumber ? ` · ${poNumber}` : ''}`} />
          <ReviewField label="Total value" value={formatINR(valueAfterGST)} />
          <ReviewField label="Camps" value={totalCamps ? String(totalCamps) : '—'} />
          <ReviewField label="Slots" value={campTimeSlots.length ? `${campTimeSlots.length} selected` : '—'} />
          <ReviewField label="Payment terms" value={PAYMENT_TERMS_LABEL[paymentTerms]} />
        </ReviewGrid>
      </ReviewCard>
    </div>
  )
}

export default WizardStep6
