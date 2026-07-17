import type { ChangeEvent } from 'react'
import { FiFile, FiFileText, FiMail, FiUpload, FiX } from 'react-icons/fi'
import type { WizardFormState } from '@/features/projects/wizard.types'
import type { UploadedDoc } from '@/types/project.types'
import { EXECUTION_MODES } from '@/types/project.types'
import { CLIENTS } from '@/types/client.types'
import { PickCard, PickGrid } from '@/components/ui/PickCard'
import SectionHeader from '@/components/ui/SectionHeader'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { labelClasses, labelStyle, fieldClasses } from '@/features/projects/components/wizard/wizard.styles'

const MODE_ICONS = { PO: FiFile, AGREEMENT: FiFileText, MAIL: FiMail }

function addMonthsIso(iso: string, months: number): string {
  const d = new Date(iso)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

function monthsBetween(startIso: string, endIso: string): number {
  const s = new Date(startIso)
  const e = new Date(endIso)
  if (e < s) return 0
  return Math.round((e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()))
}

function slugCompany(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, '')
}

function readFileAsDoc(file: File): Promise<UploadedDoc> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve({ name: file.name, type: file.type, size: file.size, dataUrl: String(reader.result) })
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

interface WizardStep2Props {
  form: WizardFormState
  setField: <K extends keyof WizardFormState>(key: K, value: WizardFormState[K]) => void
}

const WizardStep2 = ({ form, setField }: WizardStep2Props) => {
  const clientName = CLIENTS.find((c) => c.id === form.clientId)?.name ?? ''
  const suggestedAgreementNo = clientName ? `${slugCompany(clientName)}_001` : ''

  const handleDoc = async (e: ChangeEvent<HTMLInputElement>, field: 'agreementDoc' | 'mailAttachmentDoc') => {
    const file = e.target.files?.[0]
    if (!file) return
    setField(field, await readFileAsDoc(file))
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className={labelClasses} style={labelStyle}>Execution mode *</Label>
        <PickGrid>
          {EXECUTION_MODES.map((m) => (
            <PickCard
              key={m.id}
              active={form.executionMode === m.id}
              color={m.color}
              label={m.label}
              icon={MODE_ICONS[m.id]}
              onClick={() => setField('executionMode', m.id)}
            />
          ))}
        </PickGrid>
      </div>

      {form.executionMode === 'PO' && (
        <div className="space-y-3">
          <SectionHeader icon={FiFile}>PO Based details</SectionHeader>
          <div>
            <Label className={labelClasses} style={labelStyle}>PO number *</Label>
            <Input type="text" value={form.poNo} onChange={(e) => setField('poNo', e.target.value)} className={fieldClasses} />
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

      {form.executionMode === 'AGREEMENT' && (
        <div className="space-y-3">
          <SectionHeader icon={FiFileText}>Agreement Based details</SectionHeader>
          <div>
            <Label className={labelClasses} style={labelStyle}>Agreement number</Label>
            <Input type="text" value={form.agreementNo} onChange={(e) => setField('agreementNo', e.target.value)} className={fieldClasses} placeholder={suggestedAgreementNo || 'auto-generated on save'} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className={labelClasses} style={labelStyle}>Start date *</Label>
              <Input
                type="date"
                value={form.agreementStart}
                onChange={(e) => {
                  setField('agreementStart', e.target.value)
                  if (form.agreementExpiry) setField('agreementDurationMonths', monthsBetween(e.target.value, form.agreementExpiry))
                  else if (form.agreementDurationMonths) setField('agreementExpiry', addMonthsIso(e.target.value, form.agreementDurationMonths))
                }}
                className={fieldClasses}
              />
            </div>
            <div>
              <Label className={labelClasses} style={labelStyle}>Expiry date</Label>
              <Input
                type="date"
                value={form.agreementExpiry}
                onChange={(e) => {
                  setField('agreementExpiry', e.target.value)
                  if (form.agreementStart) setField('agreementDurationMonths', monthsBetween(form.agreementStart, e.target.value))
                }}
                className={fieldClasses}
              />
            </div>
            <div>
              <Label className={labelClasses} style={labelStyle}>Duration (months) *</Label>
              <Input
                type="number"
                value={form.agreementDurationMonths || ''}
                onChange={(e) => {
                  const months = Number(e.target.value)
                  setField('agreementDurationMonths', months)
                  if (form.agreementStart) setField('agreementExpiry', addMonthsIso(form.agreementStart, months))
                }}
                className={fieldClasses}
              />
            </div>
          </div>
          <div>
            <Label className={labelClasses} style={labelStyle}>Agreement document</Label>
            {form.agreementDoc ? (
              <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-[12px]" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text)' }}>
                <span className="truncate">{form.agreementDoc.name}</span>
                <button onClick={() => setField('agreementDoc', null)} aria-label="Remove document"><FiX size={13} /></button>
              </div>
            ) : (
              <label className="flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-[12px]" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
                <FiUpload size={13} /> Upload Word / PDF / image
                <input type="file" accept=".doc,.docx,.pdf,image/*" className="hidden" onChange={(e) => handleDoc(e, 'agreementDoc')} />
              </label>
            )}
          </div>
        </div>
      )}

      {form.executionMode === 'MAIL' && (
        <div className="space-y-3">
          <SectionHeader icon={FiMail}>Mail Confirmation details</SectionHeader>
          <div>
            <Label className={labelClasses} style={labelStyle}>Email reference / subject *</Label>
            <Input type="text" value={form.mailRef} onChange={(e) => setField('mailRef', e.target.value)} className={fieldClasses} />
          </div>
          <div>
            <Label className={labelClasses} style={labelStyle}>Attachment</Label>
            {form.mailAttachmentDoc ? (
              <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-[12px]" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text)' }}>
                <span className="truncate">{form.mailAttachmentDoc.name}</span>
                <button onClick={() => setField('mailAttachmentDoc', null)} aria-label="Remove attachment"><FiX size={13} /></button>
              </div>
            ) : (
              <label className="flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-[12px]" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
                <FiUpload size={13} /> Upload attachment
                <input type="file" className="hidden" onChange={(e) => handleDoc(e, 'mailAttachmentDoc')} />
              </label>
            )}
          </div>
          <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
            Mail-confirmation projects require QMS management sign-off to add void camps.
          </p>
        </div>
      )}
    </div>
  )
}

export default WizardStep2
