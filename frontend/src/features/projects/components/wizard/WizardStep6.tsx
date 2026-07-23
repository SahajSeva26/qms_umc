import { FiX, FiPlus, FiCalendar, FiClipboard, FiRefreshCw, FiList, FiClock, FiBookOpen, FiEye } from 'react-icons/fi'
import type { WizardFormState } from '@/features/projects/wizard.types'
import type { AvailablePointer, ClientReportCadence } from '@/types/project.types'
import { AVAILABLE_POINTER_LABEL, CLIENT_REPORT_CADENCE_LABEL, PAYMENT_TERMS_LABEL, PROJECT_THERAPY_LABEL, PROJECT_TYPE_LABEL } from '@/types/project.types'
import { computeGstBreakdown } from '@/features/projects/projects.utils'
import { formatINR } from '@/utils/formatters'
import SectionHeader from '@/components/ui/SectionHeader'
import { ReviewCard, ReviewGrid, ReviewField } from '@/components/ui/ReviewCard'
import { ChipRow, ChipToggle } from '@/components/ui/ChipToggle'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { labelClasses, labelStyle, fieldClasses } from '@/features/projects/components/wizard/wizard.styles'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

const CADENCE_OPTIONS = Object.keys(CLIENT_REPORT_CADENCE_LABEL) as ClientReportCadence[]
const POINTER_OPTIONS = Object.keys(AVAILABLE_POINTER_LABEL) as AvailablePointer[]

interface WizardStep6Props {
  form: WizardFormState
  setField: <K extends keyof WizardFormState>(key: K, value: WizardFormState[K]) => void
}

const WizardStep6 = ({ form, setField }: WizardStep6Props) => {
  // Server-computed preview only — effectiveEarliestSlot is a real, stored
  // backend field but the exact server recompute rule isn't confirmed, so
  // this is shown as a preview and NOT included in the outgoing payload.
  const effectiveEarliestSlotPreview = new Date(Date.now() + form.daysToBookBefore * 86400000).toISOString().slice(0, 10)
  const { valueAfterGST } = computeGstBreakdown(form.valueBeforeGST, form.gst)

  const togglePointer = (p: AvailablePointer) => {
    setField('availablePointers', form.availablePointers.includes(p) ? form.availablePointers.filter((x) => x !== p) : [...form.availablePointers, p])
  }

  const addDietChart = () => setField('dietChart', [...form.dietChart, { name: '', url: '' }])
  const updateDietChart = (i: number, field: 'name' | 'url', value: string) =>
    setField('dietChart', form.dietChart.map((d, idx) => (idx === i ? { ...d, [field]: value } : d)))
  const removeDietChart = (i: number) => setField('dietChart', form.dietChart.filter((_, idx) => idx !== i))

  return (
    <div className="space-y-1">
      <SectionHeader icon={FiCalendar} spaced={false}>Pharma booking lead time</SectionHeader>
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <Label className={labelClasses} style={labelStyle}>Days the pharma must book ahead</Label>
          <Input type="number" min={0} max={120} value={form.daysToBookBefore} onChange={(e) => setField('daysToBookBefore', Number(e.target.value))} className={fieldClasses} />
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
      {form.dietChart.map((d, i) => (
        <div key={i} className="flex gap-2 mb-2">
          <Input type="text" value={d.name} onChange={(e) => updateDietChart(i, 'name', e.target.value)} className={fieldClasses} placeholder="Chart name" />
          <Input type="text" value={d.url} onChange={(e) => updateDietChart(i, 'url', e.target.value)} className={fieldClasses} placeholder="URL" />
          <button onClick={() => removeDietChart(i)} aria-label="Remove chart" style={{ color: 'var(--qms-text-muted)' }}><FiX size={16} /></button>
        </div>
      ))}
      <button onClick={addDietChart} className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: 'var(--qms-brand)' }}>
        <FiPlus size={13} /> Add diet chart
      </button>

      <SectionHeader icon={FiRefreshCw}>Auto PO renewal reminder</SectionHeader>
      <Input type="number" min={0} max={100} value={form.poRenewalReminder} onChange={(e) => setField('poRenewalReminder', Number(e.target.value))} className={fieldClasses} />
      <p className="text-[11px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>Send reminder at % of billable camps consumed</p>

      <SectionHeader icon={FiCalendar}>Client report cadence</SectionHeader>
      <Select value={form.clientReportCandance} onValueChange={(v) => setField('clientReportCandance', v as ClientReportCadence)}>
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
          <ChipToggle key={p} active={form.availablePointers.includes(p)} onClick={() => togglePointer(p)}>
            {AVAILABLE_POINTER_LABEL[p]}
          </ChipToggle>
        ))}
      </ChipRow>

      <SectionHeader icon={FiClock}>TATs (one per line)</SectionHeader>
      <Textarea value={form.tats} onChange={(e) => setField('tats', e.target.value)} rows={3} className={fieldClasses} />

      <SectionHeader icon={FiBookOpen}>SOPs</SectionHeader>
      <Textarea value={form.sops} onChange={(e) => setField('sops', e.target.value)} rows={3} className={fieldClasses} />

      <SectionHeader icon={FiEye}>Review</SectionHeader>
      <ReviewCard>
        <ReviewGrid>
          <ReviewField label="Name" value={form.name || '—'} />
          <ReviewField label="Lead" value={form.leadTitle || '—'} />
          <ReviewField label="Company" value={form.leadTenantName || '—'} />
          <ReviewField label="Division" value={form.leadDivisionName || '—'} />
          <ReviewField label="Type / Therapy" value={`${form.type.map((t) => PROJECT_TYPE_LABEL[t]).join(', ') || '—'} / ${form.therapy ? PROJECT_THERAPY_LABEL[form.therapy] : '—'}`} />
          <ReviewField label="Execution" value={`${form.mode}${form.mode === 'po' && form.poNumber ? ` · ${form.poNumber}` : ''}`} />
          <ReviewField label="Total value" value={formatINR(valueAfterGST)} />
          <ReviewField label="Camps" value={form.totalCamps ? String(form.totalCamps) : '—'} />
          <ReviewField label="Slots" value={form.campTimeSlots.length ? `${form.campTimeSlots.length} selected` : '—'} />
          <ReviewField label="Payment terms" value={PAYMENT_TERMS_LABEL[form.paymentTerms]} />
        </ReviewGrid>
      </ReviewCard>
    </div>
  )
}

export default WizardStep6
