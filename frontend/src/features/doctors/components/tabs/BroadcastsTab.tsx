import { useMemo, useState } from 'react'
import { FiSend, FiX } from 'react-icons/fi'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'
import type { Doctor, DoctorBroadcast } from '@/features/doctors/doctors.types'
import { formatDate } from '@/utils/formatters'

type Channel = 'WhatsApp' | 'Email' | 'SMS'
type TemplateId = 'reengage' | 'newcamp' | 'reminder' | 'thanks' | 'custom'

const TEMPLATES: { id: TemplateId; label: string }[] = [
  { id: 'reengage', label: 'Re-engagement invite' },
  { id: 'newcamp', label: 'New camp announcement' },
  { id: 'reminder', label: 'Camp confirmation reminder' },
  { id: 'thanks', label: 'Post-camp thank-you' },
  { id: 'custom', label: 'Custom message' },
]

interface BroadcastsTabProps {
  doctors: Doctor[]
  broadcastIds: Set<string>
  onClearBroadcast: () => void
  broadcasts: DoctorBroadcast[]
  onSend: (entry: DoctorBroadcast) => Promise<unknown>
}

function templateText(id: TemplateId, doctor?: Doctor): string {
  const name = doctor?.name ?? '{{name}}'
  const specialty = doctor?.specialty ?? '{{specialty}}'
  const city = doctor?.city ?? '{{city}}'
  switch (id) {
    case 'reengage':
      return `Hello Dr. ${name}, we noticed it has been a while since our last camp together. We have a ${specialty} camp planned in ${city} next month — would you like to host? Reply YES to confirm.`
    case 'newcamp':
      return `Hello Dr. ${name}, QMS is announcing a new screening camp in ${city}. Slot available next week. Confirm via WhatsApp.`
    case 'reminder':
      return `Reminder: Camp confirmation pending for Dr. ${name}. Please confirm date by EOD.`
    case 'thanks':
      return `Thank you Dr. ${name} for hosting the recent camp! Patient feedback was excellent. Looking forward to our next collaboration.`
    case 'custom':
    default:
      return ''
  }
}

const BroadcastsTab = ({ doctors, broadcastIds, onClearBroadcast, broadcasts, onSend }: BroadcastsTabProps) => {
  const [channel, setChannel] = useState<Channel>('WhatsApp')
  const [template, setTemplate] = useState<TemplateId>('reengage')
  const [message, setMessage] = useState(() => templateText('reengage'))

  const selected = useMemo(() => doctors.filter((d) => broadcastIds.has(d.id)), [doctors, broadcastIds])
  const selectedNames = selected.map((d) => d.name)
  const namesLabel = selectedNames.length > 4
    ? `${selectedNames.slice(0, 4).join(', ')} +${selectedNames.length - 4} more`
    : selectedNames.join(', ')

  const handleTemplateChange = (v: TemplateId) => {
    setTemplate(v)
    setMessage(templateText(v, selected[0]))
  }

  const handleSendTest = () => {
    if (!message.trim()) { toast.error('Add a message'); return }
    toast.info(`Test message previewed · ${message.length} chars`)
  }

  const handleSend = async () => {
    if (selected.length === 0) { toast.error('Select doctors first'); return }
    if (!message.trim()) { toast.error('Add a message'); return }
    const entry: DoctorBroadcast = {
      id: `bc-${Date.now()}`,
      doctorIds: selected.map((d) => d.id),
      channel,
      message,
      sentAt: new Date().toISOString(),
    }
    await onSend(entry)
    toast.success(`Broadcast sent to ${selected.length} doctor(s) via ${channel}`)
    onClearBroadcast()
  }

  return (
    <div>
      {selected.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 mb-3 sticky top-0 z-10" style={{ background: 'var(--qms-surface-strong)', border: '1px solid var(--qms-border)' }}>
          <div className="text-[12.5px]" style={{ color: 'var(--qms-text)' }}>
            <span className="font-bold">{selected.length} selected</span>{namesLabel ? ` · ${namesLabel}` : ''}
          </div>
          <button onClick={onClearBroadcast} className="inline-flex items-center gap-1 text-[11.5px] font-semibold px-2 py-1 rounded-lg" style={{ color: 'var(--qms-text-muted)' }}>
            <FiX size={12} /> Clear
          </button>
        </div>
      )}

      <div className="grid gap-3" style={{ gridTemplateColumns: '1.3fr 1fr' }}>
        <div className="rounded-xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--qms-text)' }}>Compose</div>

          <div className="flex gap-1.5 mb-3">
            {(['WhatsApp', 'Email', 'SMS'] as Channel[]).map((c) => (
              <button
                key={c}
                onClick={() => setChannel(c)}
                className="text-[12px] font-semibold px-3 py-1.5 rounded-full border transition-colors"
                style={channel === c
                  ? { borderColor: 'var(--success)', background: 'var(--success-soft)', color: 'var(--success)' }
                  : { borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}
              >
                {c}
              </button>
            ))}
          </div>

          <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Template</label>
          <Select value={template} onValueChange={(v) => handleTemplateChange(v as TemplateId)}>
            <SelectTrigger className="w-full text-[13px] mb-3"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TEMPLATES.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>

          <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Message</label>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} className="text-[13px] mb-1" />
          <div className="text-[11px] mb-3" style={{ color: 'var(--qms-text-muted)' }}>Variables: {'{{name}} {{specialty}} {{city}}'}</div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleSendTest}>Send to me (test)</Button>
            <Button onClick={handleSend}><FiSend size={13} /> Send to {selected.length}</Button>
          </div>
        </div>

        <div className="rounded-xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>Recent broadcasts</div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>{broadcasts.length}</span>
          </div>
          {broadcasts.length === 0 ? (
            <p className="text-[12.5px]" style={{ color: 'var(--qms-text-muted)' }}>No broadcasts sent yet.</p>
          ) : (
            <div className="space-y-2">
              {broadcasts.slice(0, 8).map((b) => (
                <div key={b.id} className="rounded-lg p-2.5" style={{ background: 'var(--qms-surface-strong)' }}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="text-[12.5px] font-semibold truncate" style={{ color: 'var(--qms-text)' }}>{b.message.slice(0, 60)}{b.message.length > 60 ? '…' : ''}</div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: 'rgba(16,185,129,.12)', color: 'var(--success)' }}>{b.channel}</span>
                  </div>
                  <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{formatDate(b.sentAt)} · {b.doctorIds.length} recipient{b.doctorIds.length === 1 ? '' : 's'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BroadcastsTab
