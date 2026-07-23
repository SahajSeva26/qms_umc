import { FiFile, FiFileText, FiMail } from 'react-icons/fi'
import type { WizardFormState } from '@/features/projects/wizard.types'
import type { ExecutionModeType } from '@/types/project.types'
import { EXECUTION_MODE_LABEL } from '@/types/project.types'
import { PickCard, PickGrid } from '@/components/ui/PickCard'
import SectionHeader from '@/components/ui/SectionHeader'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { labelClasses, labelStyle, fieldClasses } from '@/features/projects/components/wizard/wizard.styles'

const MODE_ICONS: Record<ExecutionModeType, typeof FiFile> = { po: FiFile, agreement: FiFileText, mail_confirmation: FiMail }
const MODE_OPTIONS: ExecutionModeType[] = ['po', 'agreement', 'mail_confirmation']

export function addMonthsIso(iso: string, months: number): string {
  const d = new Date(iso)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

export function monthsBetween(startIso: string, endIso: string): number {
  const s = new Date(startIso)
  const e = new Date(endIso)
  if (e < s) return 0
  return Math.round((e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()))
}

interface WizardStep2Props {
  form: WizardFormState
  setField: <K extends keyof WizardFormState>(key: K, value: WizardFormState[K]) => void
}

// No confirmed real file-upload endpoint exists for agreementDocument/
// emailDocument yet — both are plain URL text fields on the backend schema
// (`type: String`), so these are simple "paste a URL" inputs rather than the
// old mock's FileReader-to-base64 upload flow, which never round-tripped
// through any real endpoint anyway.
const WizardStep2 = ({ form, setField }: WizardStep2Props) => {
  return (
    <div className="space-y-4">
      <div>
        <Label className={labelClasses} style={labelStyle}>Execution mode *</Label>
        <PickGrid>
          {MODE_OPTIONS.map((m) => (
            <PickCard
              key={m}
              active={form.mode === m}
              label={EXECUTION_MODE_LABEL[m]}
              icon={MODE_ICONS[m]}
              onClick={() => setField('mode', m)}
            />
          ))}
        </PickGrid>
      </div>

      {form.mode === 'po' && (
        <div className="space-y-3">
          <SectionHeader icon={FiFile}>PO Based details</SectionHeader>
          <div>
            <Label className={labelClasses} style={labelStyle}>PO number *</Label>
            <Input type="text" value={form.poNumber} onChange={(e) => setField('poNumber', e.target.value)} className={fieldClasses} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className={labelClasses} style={labelStyle}>PO date *</Label>
              <Input
                type="date"
                value={form.poDate}
                onChange={(e) => {
                  setField('poDate', e.target.value)
                  if (!form.poExpiry) setField('poExpiry', addMonthsIso(e.target.value, 12))
                }}
                className={fieldClasses}
              />
            </div>
            <div>
              <Label className={labelClasses} style={labelStyle}>PO expiry</Label>
              <Input type="date" value={form.poExpiry} onChange={(e) => setField('poExpiry', e.target.value)} className={fieldClasses} placeholder="blank → +12 months" />
            </div>
          </div>
        </div>
      )}

      {form.mode === 'agreement' && (
        <div className="space-y-3">
          <SectionHeader icon={FiFileText}>Agreement Based details</SectionHeader>
          <div>
            <Label className={labelClasses} style={labelStyle}>Agreement number</Label>
            <Input type="text" value={form.agreementNumber} onChange={(e) => setField('agreementNumber', e.target.value)} className={fieldClasses} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className={labelClasses} style={labelStyle}>Start date *</Label>
              <Input
                type="date"
                value={form.agreementStartDate}
                onChange={(e) => {
                  setField('agreementStartDate', e.target.value)
                  if (form.agreementEndDate) setField('duration', monthsBetween(e.target.value, form.agreementEndDate))
                  else if (form.duration) setField('agreementEndDate', addMonthsIso(e.target.value, form.duration))
                }}
                className={fieldClasses}
              />
            </div>
            <div>
              <Label className={labelClasses} style={labelStyle}>Expiry date</Label>
              <Input
                type="date"
                value={form.agreementEndDate}
                onChange={(e) => {
                  setField('agreementEndDate', e.target.value)
                  if (form.agreementStartDate) setField('duration', monthsBetween(form.agreementStartDate, e.target.value))
                }}
                className={fieldClasses}
              />
            </div>
            <div>
              <Label className={labelClasses} style={labelStyle}>Duration (months) *</Label>
              <Input
                type="number"
                value={form.duration || ''}
                onChange={(e) => {
                  const months = Number(e.target.value)
                  setField('duration', months)
                  if (form.agreementStartDate) setField('agreementEndDate', addMonthsIso(form.agreementStartDate, months))
                }}
                className={fieldClasses}
              />
            </div>
          </div>
          <div>
            <Label className={labelClasses} style={labelStyle}>Agreement document (URL)</Label>
            <Input type="text" value={form.agreementDocument} onChange={(e) => setField('agreementDocument', e.target.value)} className={fieldClasses} placeholder="https://…" />
          </div>
        </div>
      )}

      {form.mode === 'mail_confirmation' && (
        <div className="space-y-3">
          <SectionHeader icon={FiMail}>Mail Confirmation details</SectionHeader>
          <div>
            <Label className={labelClasses} style={labelStyle}>Email reference / subject *</Label>
            <Input type="text" value={form.emailReference} onChange={(e) => setField('emailReference', e.target.value)} className={fieldClasses} />
          </div>
          <div>
            <Label className={labelClasses} style={labelStyle}>Attachment (URL)</Label>
            <Input type="text" value={form.emailDocument} onChange={(e) => setField('emailDocument', e.target.value)} className={fieldClasses} placeholder="https://…" />
          </div>
        </div>
      )}
    </div>
  )
}

export default WizardStep2
