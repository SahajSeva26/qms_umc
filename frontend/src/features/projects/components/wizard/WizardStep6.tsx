import { FiArrowUp, FiArrowDown, FiX, FiPlus } from 'react-icons/fi'
import type { WizardFormState } from '@/features/projects/wizard.types'
import { PROJECT_STATUSES, REPORT_CADENCES, REPORT_POINTERS } from '@/types/project.types'
import { CLIENTS, DIVISIONS } from '@/types/client.types'
import { SALES_PEOPLE, COORDINATOR_PEOPLE, MARKETING_CONTACTS } from '@/features/projects/projects.mock'
import { formatINR } from '@/utils/formatters'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

const labelClasses = 'block text-[10px] font-semibold tracking-widest uppercase mb-2'
const labelStyle = { color: 'var(--qms-text-muted)' }

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
    <div className="space-y-4">
      <div>
        <Label className={labelClasses} style={labelStyle}>Project status *</Label>
        <div className="flex gap-2">
          {PROJECT_STATUSES.map((s) => (
            <button
              key={s.id}
              onClick={() => setField('status', s.id)}
              className="flex-1 px-3 py-2 rounded-xl border transition-all text-[12px] font-semibold"
              style={
                form.status === s.id
                  ? { background: `${s.color}18`, borderColor: s.color, color: s.color }
                  : { background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }
              }
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className={labelClasses} style={labelStyle}>Pharma booking lead time</Label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Input type="number" min={0} max={120} value={form.bookingLeadDays} onChange={(e) => setField('bookingLeadDays', Number(e.target.value))} className="text-[13px]" />
            <p className="text-[11px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>Days the pharma must book ahead</p>
          </div>
          <div>
            <Input type="text" value={effectiveEarliestSlot} disabled className="text-[13px]" />
            <p className="text-[11px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>Effective earliest slot</p>
          </div>
        </div>
        <p className="text-[11px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
          e.g. if you set 4 days and the pharma logs in on 2026-05-01, they can only see camp slots from
          2026-05-05 onwards. Set to 0 for same-day bookings.
        </p>
      </div>

      <div>
        <Label className={labelClasses} style={labelStyle}>Diet chart planning · download links</Label>
        {form.dietCharts.map((d) => (
          <div key={d.id} className="flex gap-2 mb-2">
            <Input type="text" value={d.name} onChange={(e) => updateDietChart(d.id, 'name', e.target.value)} className="text-[13px]" placeholder="Chart name" />
            <Input type="text" value={d.url} onChange={(e) => updateDietChart(d.id, 'url', e.target.value)} className="text-[13px]" placeholder="URL" />
            <button onClick={() => removeDietChart(d.id)} aria-label="Remove chart" style={{ color: 'var(--qms-text-muted)' }}><FiX size={16} /></button>
          </div>
        ))}
        <button onClick={addDietChart} className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: 'var(--qms-brand)' }}>
          <FiPlus size={13} /> Add diet chart
        </button>
        <p className="text-[11px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>Dietitians receive the latest link via WhatsApp reminder.</p>
      </div>

      <div>
        <Label className={labelClasses} style={labelStyle}>Auto PO renewal reminder</Label>
        <Input type="number" min={0} max={100} value={form.renewalReminderPct} onChange={(e) => setField('renewalReminderPct', Number(e.target.value))} className="text-[13px]" />
        <p className="text-[11px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>Send reminder at % of billable camps consumed</p>
      </div>

      <div>
        <Label className={labelClasses} style={labelStyle}>Client report cadence</Label>
        <Select value={form.reportCadence} onValueChange={(v) => setField('reportCadence', v as WizardFormState['reportCadence'])}>
          <SelectTrigger className="w-full text-[13px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {REPORT_CADENCES.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className={labelClasses} style={labelStyle}>Report format — measurable pointers (sequence matters)</Label>
        <div className="space-y-1.5 mb-2">
          {form.reportFormat.map((pointer, i) => (
            <div key={pointer} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg" style={{ background: 'var(--qms-surface-strong)' }}>
              <span className="text-[11px] font-bold w-5" style={{ color: 'var(--qms-text-muted)' }}>{i + 1}.</span>
              <span className="flex-1 text-[12px] font-medium" style={{ color: 'var(--qms-text)' }}>{pointer}</span>
              <button onClick={() => movePointer(i, -1)} disabled={i === 0} aria-label="Move up" style={{ color: 'var(--qms-text-muted)', opacity: i === 0 ? 0.3 : 1 }}><FiArrowUp size={12} /></button>
              <button onClick={() => movePointer(i, 1)} disabled={i === form.reportFormat.length - 1} aria-label="Move down" style={{ color: 'var(--qms-text-muted)', opacity: i === form.reportFormat.length - 1 ? 0.3 : 1 }}><FiArrowDown size={12} /></button>
              <button onClick={() => removePointer(pointer)} aria-label="Remove pointer" style={{ color: 'var(--qms-text-muted)' }}><FiX size={13} /></button>
            </div>
          ))}
        </div>
        {availablePointers.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>Available pointers</div>
            <div className="flex flex-wrap gap-1.5">
              {availablePointers.map((p) => (
                <button key={p} onClick={() => addPointer(p)} className="text-[11px] font-semibold px-2.5 py-1 rounded-full border" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }}>
                  + {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        <Label className={labelClasses} style={labelStyle}>TATs (one per line)</Label>
        <Textarea value={form.tats} onChange={(e) => setField('tats', e.target.value)} rows={3} className="text-[13px]" />
      </div>

      <div>
        <Label className={labelClasses} style={labelStyle}>SOPs</Label>
        <Textarea value={form.sops} onChange={(e) => setField('sops', e.target.value)} rows={3} className="text-[13px]" />
      </div>

      <div className="rounded-xl border p-3" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
        <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>Review</div>
        <div className="grid grid-cols-2 gap-2 text-[12px]">
          <div><span style={{ color: 'var(--qms-text-muted)' }}>ID:</span> auto-generated on save</div>
          <div><span style={{ color: 'var(--qms-text-muted)' }}>Name:</span> {form.name || '—'}</div>
          <div><span style={{ color: 'var(--qms-text-muted)' }}>Client:</span> {client?.name ?? '—'}</div>
          <div><span style={{ color: 'var(--qms-text-muted)' }}>Division:</span> {division?.name ?? '—'}</div>
          <div><span style={{ color: 'var(--qms-text-muted)' }}>Type / Therapy:</span> {form.type || '—'} / {form.therapy || '—'}</div>
          <div><span style={{ color: 'var(--qms-text-muted)' }}>Status:</span> {form.status}</div>
          <div><span style={{ color: 'var(--qms-text-muted)' }}>Execution:</span> {form.executionMode}{form.executionMode === 'PO' && form.poNo ? ` · ${form.poNo}` : ''}</div>
          <div><span style={{ color: 'var(--qms-text-muted)' }}>Total value:</span> {formatINR(form.valueBeforeGst + gstAmount)}</div>
          <div><span style={{ color: 'var(--qms-text-muted)' }}>Camps:</span> {form.totalCamps || '—'}</div>
          <div><span style={{ color: 'var(--qms-text-muted)' }}>Slots:</span> {form.campTimeSlots.length ? `${form.campTimeSlots.length} selected` : '—'}</div>
          <div><span style={{ color: 'var(--qms-text-muted)' }}>Scope:</span> {form.goLiveScope === 'PAN_INDIA' ? 'PAN-India' : (form.goLiveDetails.slice(0, 5).join(', ') || '—') + (form.goLiveDetails.length > 5 ? '…' : '')}</div>
          <div><span style={{ color: 'var(--qms-text-muted)' }}>Booking:</span> {form.bookingHierarchy.join(' · ') || '—'}</div>
          <div><span style={{ color: 'var(--qms-text-muted)' }}>Sales:</span> {sales?.name ?? '—'}</div>
          <div><span style={{ color: 'var(--qms-text-muted)' }}>Coordinator:</span> {coordinator?.name ?? '—'}</div>
          <div><span style={{ color: 'var(--qms-text-muted)' }}>Pharma marketing:</span> {marketing?.name ?? '—'}</div>
        </div>
      </div>
    </div>
  )
}

export default WizardStep6
