import { useState } from 'react'
import {
  FiUsers,
  FiUserCheck,
  FiMap,
  FiBriefcase,
  FiBell,
  FiClock,
  FiMessageCircle,
  FiMail,
  FiPhoneCall,
  FiInfo,
} from 'react-icons/fi'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/sonner'
import type { Camp } from '@/types/camp.types'
import { formatDate } from '@/utils/formatters'
import { getDoctor } from '@/features/camps/camps.utils'

interface CampRemindersModalProps {
  open: boolean
  onClose: () => void
  camp: Camp
}

// Mirrors camps-manager.js REMINDER_TIMINGS exactly (window.openCampReminders, ~line 184)
const REMINDER_TIMINGS = [
  { id: 'T48', label: '48 hours before', placeholder: 'Pre-camp confirmation message...' },
  { id: 'T24', label: '24 hours before', placeholder: "Tomorrow's camp reminder..." },
  { id: 'T2', label: '2 hours before', placeholder: 'Final 2-hour reminder...' },
] as const

// Mirrors camps-manager.js REMINDER_CHANNELS exactly (~line 190)
const REMINDER_CHANNELS = [
  { id: 'WA', label: 'WhatsApp', icon: FiMessageCircle },
  { id: 'EMAIL', label: 'Email', icon: FiMail },
  { id: 'VOICE', label: 'AI Voice', icon: FiPhoneCall },
] as const

type TimingId = (typeof REMINDER_TIMINGS)[number]['id']
type ChannelId = (typeof REMINDER_CHANNELS)[number]['id']

interface TimingConfig {
  channels: ChannelId[]
  message: string
}

interface TargetsState {
  doctor: boolean
  fo: boolean
  client: boolean
  patients: boolean
}

// Default reminders if none set — mirrors window.openCampReminders's `stored` fallback exactly
const defaultTimings: Record<TimingId, TimingConfig> = {
  T48: { channels: ['WA'], message: '' },
  T24: { channels: ['WA', 'EMAIL'], message: '' },
  T2: { channels: ['WA', 'VOICE'], message: '' },
}

const defaultTargets: TargetsState = { doctor: true, fo: true, client: false, patients: false }

const CampRemindersModal = ({ open, onClose, camp }: CampRemindersModalProps) => {
  const doctor = getDoctor(camp.doctorId)

  const [timings, setTimings] = useState<Record<TimingId, TimingConfig>>(() => ({
    T48: { ...defaultTimings.T48 },
    T24: { ...defaultTimings.T24 },
    T2: { ...defaultTimings.T2 },
  }))
  const [targets, setTargets] = useState<TargetsState>({ ...defaultTargets })

  const toggleChannel = (timingId: TimingId, channelId: ChannelId) => {
    setTimings((prev) => {
      const conf = prev[timingId]
      const has = conf.channels.includes(channelId)
      const channels = has ? conf.channels.filter((c) => c !== channelId) : [...conf.channels, channelId]
      return { ...prev, [timingId]: { ...conf, channels } }
    })
  }

  const updateMessage = (timingId: TimingId, message: string) => {
    setTimings((prev) => ({ ...prev, [timingId]: { ...prev[timingId], message } }))
  }

  const toggleTarget = (key: keyof TargetsState) => {
    setTargets((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSave = () => {
    const totalCh = REMINDER_TIMINGS.reduce((a, t) => a + timings[t.id].channels.length, 0)
    const totalT = Object.values(targets).filter(Boolean).length
    toast.info(
      `UI only — would persist onto camp.reminders: ${totalT} target${totalT === 1 ? '' : 's'} · ${totalCh} channel-slot${totalCh === 1 ? '' : 's'} (wiring comes next pass)`
    )
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-brand)' }}
            >
              <FiBell size={14} />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>
                Reminders
              </DialogTitle>
              <div className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>
                {camp.id}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="text-xs mb-3.5" style={{ color: 'var(--qms-text-muted)' }}>
          Reminders for <b style={{ color: 'var(--qms-text)' }}>{camp.id}</b> on{' '}
          <b style={{ color: 'var(--qms-text)' }}>{formatDate(camp.date)}</b> · {doctor?.name || 'TBD'}.
        </div>

        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>
          <FiUsers size={13} /> Send to
        </div>
        <div
          className="rounded-xl border p-3 mb-3.5 flex flex-wrap gap-x-4 gap-y-2"
          style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
        >
          <label className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer" style={{ color: 'var(--qms-text)' }}>
            <input type="checkbox" checked={targets.doctor} onChange={() => toggleTarget('doctor')} />
            <FiUserCheck size={13} /> Doctor
          </label>
          <label className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer" style={{ color: 'var(--qms-text)' }}>
            <input type="checkbox" checked={targets.fo} onChange={() => toggleTarget('fo')} />
            <FiMap size={13} /> Field Officer
          </label>
          <label className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer" style={{ color: 'var(--qms-text)' }}>
            <input type="checkbox" checked={targets.client} onChange={() => toggleTarget('client')} />
            <FiBriefcase size={13} /> Client (MR/RM)
          </label>
          <label className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer" style={{ color: 'var(--qms-text)' }}>
            <input type="checkbox" checked={targets.patients} onChange={() => toggleTarget('patients')} />
            <FiUsers size={13} /> Patient list
          </label>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>
          <FiBell size={13} /> Timing &amp; channels
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-3.5">
          {REMINDER_TIMINGS.map((t) => {
            const conf = timings[t.id]
            const isOn = conf.channels.length > 0
            return (
              <div
                key={t.id}
                className="rounded-xl border p-3"
                style={
                  isOn
                    ? { borderColor: 'var(--qms-brand)', background: 'var(--qms-surface)', boxShadow: '0 0 0 2px color-mix(in srgb, var(--qms-brand) 15%, transparent)' }
                    : { borderColor: 'var(--qms-border)', background: 'var(--qms-surface)' }
                }
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>
                    <FiClock size={13} /> {t.label}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>
                    {conf.channels.length} ch
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {REMINDER_CHANNELS.map((ch) => {
                    const on = conf.channels.includes(ch.id)
                    const Icon = ch.icon
                    return (
                      <span
                        key={ch.id}
                        onClick={() => toggleChannel(t.id, ch.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] cursor-pointer select-none"
                        style={
                          on
                            ? { background: 'var(--qms-brand)', color: '#fff', borderColor: 'var(--qms-brand)' }
                            : { background: 'var(--qms-surface-strong)', color: 'var(--qms-text-soft)', borderColor: 'var(--qms-border)' }
                        }
                      >
                        <Icon size={11} /> {ch.label}
                      </span>
                    )
                  })}
                </div>
                <Textarea
                  rows={2}
                  className="mt-2 text-[11px]"
                  placeholder={t.placeholder}
                  value={conf.message}
                  onChange={(e) => updateMessage(t.id, e.target.value)}
                />
              </div>
            )
          })}
        </div>

        <div
          className="rounded-xl border p-2.5 text-[11px] flex items-start gap-1.5"
          style={{ background: 'color-mix(in srgb, #8b5cf6 5%, transparent)', borderColor: 'color-mix(in srgb, #8b5cf6 20%, transparent)', color: 'var(--qms-text-soft)' }}
        >
          <FiInfo size={11} style={{ color: '#8b5cf6', marginTop: 1 }} />
          <span>
            AI voice calls use placeholder TTS and the doctor&apos;s mobile from the doctor master. WA + Email reminders
            go through the Gmail/360dialog integration once configured.
          </span>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>
            <FiBell size={14} /> Save reminders
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CampRemindersModal
