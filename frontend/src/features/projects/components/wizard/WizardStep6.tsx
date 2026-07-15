import { FiArrowUp, FiArrowDown, FiX, FiPlus, FiActivity, FiCalendar, FiClipboard, FiRefreshCw, FiList, FiClock, FiBookOpen, FiEye } from 'react-icons/fi'
import type { WizardFormState } from '@/features/projects/wizard.types'
import { PROJECT_STATUSES, REPORT_CADENCES, REPORT_POINTERS } from '@/types/project.types'
import { CLIENTS, DIVISIONS } from '@/types/client.types'
import { SALES_PEOPLE, COORDINATOR_PEOPLE, MARKETING_CONTACTS } from '@/features/projects/projects.mock'
import { formatINR } from '@/utils/formatters'
import { PickCard, PickGrid } from '@/components/ui/PickCard'
import SectionHeader from '@/components/ui/SectionHeader'
import { ReviewCard, ReviewGrid, ReviewField } from '@/components/ui/ReviewCard'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { labelClasses, labelStyle, fieldClasses } from '@/features/projects/components/wizard/wizard.styles'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

interface WizardStep6Props {
  form: WizardFormState
  setField: <K extends keyof WizardFormState>(key: K, value: WizardFormState[K]) => void
}

const WizardStep6 = ({ form, setField }: WizardStep6Props) => {
  const availablePointers = REPORT_POINTERS.filter((p) => !form.reportFormat.includes(p))
  const effectiveEarliestSlot = new Date(Date.now() + form.bookingLeadDays * 86400000).toISOString().slice(0, 10)
  const gstAmount = Math.round(form.valueBeforeGst * (form.gstPct / 100))

  const movePointer = (index: number, dir: -1 | 1) => {
    const next = [...form.reportFormat]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setField('reportFormat', next)
  }

  const addPointer = (pointer: string) => setField('reportFormat', [...form.reportFormat, pointer])
  const removePointer = (pointer: string) => setField('reportFormat', form.reportFormat.filter((p) => p !== pointer))

  const addDietChart = () =>
    setField('dietCharts', [...form.dietCharts, { id: `dc-${Date.now()}`, name: '', url: '', uploadedAt: new Date().toISOString() }])
  const updateDietChart = (id: string, field: 'name' | 'url', value: string) =>
    setField('dietCharts', form.dietCharts.map((d) => (d.id === id ? { ...d, [field]: value } : d)))
  const removeDietChart = (id: string) => setField('dietCharts', form.dietCharts.filter((d) => d.id !== id))

  const client = CLIENTS.find((c) => c.id === form.clientId)
  const division = DIVISIONS.find((d) => d.id === form.divisionId)
  const sales = SALES_PEOPLE.find((p) => p.id === form.salesPersonId)
  const coordinator = COORDINATOR_PEOPLE.find((p) => p.id === form.coordinatorId)
  const marketing = MARKETING_CONTACTS.find((m) => m.id === form.marketingContactId)

  return (
    <div className="space-y-1">
      <SectionHeader icon={FiActivity} spaced={false}>Project status *</SectionHeader>
      <PickGrid>
        {PROJECT_STATUSES.map((s) => (
          <PickCard key={s.id} active={form.status === s.id} color={s.color} label={s.label} onClick={() => setField('status', s.id)} />
        ))}
      </PickGrid>

      <SectionHeader icon={FiCalendar}>Pharma booking lead time</SectionHeader>
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <Label className={labelClasses} style={labelStyle}>Days the pharma must book ahead</Label>
          <Input type="number" min={0} max={120} value={form.bookingLeadDays} onChange={(e) => setField('bookingLeadDays', Number(e.target.value))} className={fieldClasses} />
        </div>
        <div>
          <Label className={labelClasses} style={labelStyle}>Effective earliest slot</Label>
          <Input type="text" value={effectiveEarliestSlot} disabled className={fieldClasses} />
        </div>
      </div>
      <p className="text-[11px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>
        e.g. if you set 4 days and the pharma logs in on 2026-05-01, they can only see camp slots from
        2026-05-05 onwards. Set to 0 for same-day bookings.
      </p>

      <SectionHeader icon={FiClipboard}>Diet chart planning · download links</SectionHeader>
      {form.dietCharts.map((d) => (
        <div key={d.id} className="flex gap-2 mb-2">
          <Input type="text" value={d.name} onChange={(e) => updateDietChart(d.id, 'name', e.target.value)} className={fieldClasses} placeholder="Chart name" />
          <Input type="text" value={d.url} onChange={(e) => updateDietChart(d.id, 'url', e.target.value)} className={fieldClasses} placeholder="URL" />
          <button onClick={() => removeDietChart(d.id)} aria-label="Remove chart" style={{ color: 'var(--qms-text-muted)' }}><FiX size={16} /></button>
        </div>
      ))}
      <button onClick={addDietChart} className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: 'var(--qms-brand)' }}>
        <FiPlus size={13} /> Add diet chart
      </button>
      <p className="text-[11px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>Dietitians receive the latest link via WhatsApp reminder.</p>

      <SectionHeader icon={FiRefreshCw}>Auto PO renewal reminder</SectionHeader>
      <Input type="number" min={0} max={100} value={form.renewalReminderPct} onChange={(e) => setField('renewalReminderPct', Number(e.target.value))} className={fieldClasses} />
      <p className="text-[11px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>Send reminder at % of billable camps consumed</p>

      <SectionHeader icon={FiCalendar}>Client report cadence</SectionHeader>
      <Select value={form.reportCadence} onValueChange={(v) => setField('reportCadence', v as WizardFormState['reportCadence'])}>
        <SelectTrigger className={`w-full ${fieldClasses}`}><SelectValue /></SelectTrigger>
        <SelectContent>
          {REPORT_CADENCES.map((c) => (
            <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <SectionHeader icon={FiList}>Report format — measurable pointers (sequence matters)</SectionHeader>
      <div className="flex flex-col gap-1">
        {form.reportFormat.map((pointer, i) => (
          <div key={pointer} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px]" style={{ background: 'rgba(0,0,0,.03)' }}>
            <span className="inline-flex items-center justify-center w-5.5 h-5.5 rounded-full text-[11px] font-extrabold text-white shrink-0" style={{ background: 'var(--qms-brand)' }}>
              {i + 1}
            </span>
            <span className="flex-1" style={{ color: 'var(--qms-text)' }}>{pointer}</span>
            <button onClick={() => movePointer(i, -1)} disabled={i === 0} aria-label="Move up" className="p-0.5" style={{ color: 'var(--qms-text-soft)', opacity: i === 0 ? 0.3 : 1 }}><FiArrowUp size={12} /></button>
            <button onClick={() => movePointer(i, 1)} disabled={i === form.reportFormat.length - 1} aria-label="Move down" className="p-0.5" style={{ color: 'var(--qms-text-soft)', opacity: i === form.reportFormat.length - 1 ? 0.3 : 1 }}><FiArrowDown size={12} /></button>
            <button onClick={() => removePointer(pointer)} aria-label="Remove pointer" className="ml-auto" style={{ color: 'var(--danger)' }}><FiX size={13} /></button>
          </div>
        ))}
      </div>
      {availablePointers.length > 0 && (
        <div className="mt-2">
          <div className="flex flex-wrap gap-1.5">
            {availablePointers.map((p) => (
              <button key={p} onClick={() => addPointer(p)} className="text-[11px] font-bold px-2.5 py-1 rounded-full border" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)', background: 'var(--qms-surface)' }}>
                + {p}
              </button>
            ))}
          </div>
        </div>
      )}

      <SectionHeader icon={FiClock}>TATs (one per line)</SectionHeader>
      <Textarea value={form.tats} onChange={(e) => setField('tats', e.target.value)} rows={3} className={fieldClasses} />

      <SectionHeader icon={FiBookOpen}>SOPs</SectionHeader>
      <Textarea value={form.sops} onChange={(e) => setField('sops', e.target.value)} rows={3} className={fieldClasses} />

      <SectionHeader icon={FiEye}>Review</SectionHeader>
      <ReviewCard>
        <ReviewGrid>
          <ReviewField label="ID" value="auto-generated on save" />
          <ReviewField label="Name" value={form.name || '—'} />
          <ReviewField label="Client" value={client?.name ?? '—'} />
          <ReviewField label="Division" value={division?.name ?? '—'} />
          <ReviewField label="Type / Therapy" value={`${form.type || '—'} / ${form.therapy || '—'}`} />
          <ReviewField label="Status" value={form.status} />
          <ReviewField label="Execution" value={`${form.executionMode}${form.executionMode === 'PO' && form.poNo ? ` · ${form.poNo}` : ''}`} />
          <ReviewField label="Total value" value={formatINR(form.valueBeforeGst + gstAmount)} />
          <ReviewField label="Camps" value={form.totalCamps ? String(form.totalCamps) : '—'} />
          <ReviewField label="Slots" value={form.campTimeSlots.length ? `${form.campTimeSlots.length} selected` : '—'} />
          <ReviewField label="Scope" value={form.goLiveScope === 'PAN_INDIA' ? 'PAN-India' : (form.goLiveDetails.slice(0, 5).join(', ') || '—') + (form.goLiveDetails.length > 5 ? '…' : '')} />
          <ReviewField label="Booking" value={form.bookingHierarchy.join(' · ') || '—'} />
          <ReviewField label="Sales" value={sales?.name ?? '—'} />
          <ReviewField label="Coordinator" value={coordinator?.name ?? '—'} />
          <ReviewField label="Pharma marketing" value={marketing?.name ?? '—'} />
        </ReviewGrid>
      </ReviewCard>
    </div>
  )
}

export default WizardStep6
