import { useEffect, useState } from 'react'
import { FiSave, FiRotateCcw } from 'react-icons/fi'
import { toast } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { ReminderLanguage, TemplateFamily, ReminderConfig, ReminderTemplates } from '@/features/reminders/reminders.types'
import { DEFAULT_TEMPLATES } from '@/features/reminders/reminders.types'
import { renderTemplate, buildContext } from '@/features/reminders/reminders.service'
import type { EngineRecipient } from '@/features/reminders/reminders.service'
import { useReminderTemplates, useReminderConfig } from '@/features/reminders/hooks/useReminders'
import { FAMILY_LABEL, LANGUAGE_LABEL } from '@/features/reminders/reminders.ui'
import type { Camp } from '@/types/camp.types'

const FAMILIES: TemplateFamily[] = ['voice_fo', 'voice_diet', 'wa_fo', 'wa_diet', 'submit_diet']
const LANGS: ReminderLanguage[] = ['en', 'hi', 'mr']
const CHANNEL_KEYS: (keyof ReminderConfig['channels'])[] = ['whatsapp', 'voice', 'sms', 'email']

const PANEL_STYLE: React.CSSProperties = { background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }

// Sample camp + recipient for the live preview — runs the REAL buildContext()
// engine function (real Date/Time formatting via campStartMs(), real Map/Link
// fallback chains) against sample data, mirroring reminder-automation.js's own
// tabTemplates() preview (which does the same: a sampleCamp through the real
// buildContext()), rather than hand-rolling a fake, hardcoded context object.
const SAMPLE_CAMP: Camp = {
  id: 'SAMPLE-001', date: '2026-08-16', slot: '10-2', type: 'Screening', status: 'CONFIRMED',
  clientId: 'cli-sun', doctorId: 'sample-doc', city: 'Mumbai', state: 'MH',
  patientsExpected: 60, patientsDone: 0, devicesAllocated: [], rxCount: 0, feedback: 0, foRating: 0,
}

function samplePreviewContext(family: TemplateFamily): Record<string, string | number> {
  const isFo = family === 'voice_fo' || family === 'wa_fo'
  const recipient: EngineRecipient = { type: isFo ? 'FO' : 'Dietitian', id: 'sample', name: isFo ? 'Ravi Kumar' : 'Sneha Kulkarni', phone: '+91 98200 00000' }
  return buildContext(SAMPLE_CAMP, recipient)
}

const TemplatesSettingsTab = () => {
  const { templates, saveTemplates, isLoading: templatesLoading } = useReminderTemplates()
  const { config, saveConfig, isLoading: configLoading } = useReminderConfig()

  const [family, setFamily] = useState<TemplateFamily>('wa_fo')
  const [lang, setLang] = useState<ReminderLanguage>('en')
  const [draft, setDraft] = useState<ReminderTemplates | null>(null)

  useEffect(() => {
    if (templates) setDraft(templates)
  }, [templates])

  const [cfgDraft, setCfgDraft] = useState<ReminderConfig | null>(null)
  useEffect(() => {
    if (config) setCfgDraft(config)
  }, [config])

  const body = draft?.[family]?.[lang] ?? ''

  const setBody = (next: string) => {
    if (!draft) return
    setDraft({ ...draft, [family]: { ...draft[family], [lang]: next } })
  }

  const handleSaveTemplate = async () => {
    if (!draft) return
    try {
      await saveTemplates(draft)
      toast.success(`Template saved · ${FAMILY_LABEL[family]} · ${LANGUAGE_LABEL[lang]}`)
    } catch {
      toast.error('Failed to save template')
    }
  }

  const handleResetTemplates = async () => {
    if (!confirm('Reset all templates back to the QMS defaults?')) return
    try {
      await saveTemplates(DEFAULT_TEMPLATES)
      setDraft(DEFAULT_TEMPLATES)
      toast.info('Templates reset to defaults')
    } catch {
      toast.error('Failed to reset templates')
    }
  }

  const handleSaveConfig = async () => {
    if (!cfgDraft) return
    try {
      await saveConfig(cfgDraft)
      toast.success('Settings saved')
    } catch {
      toast.error('Failed to save settings')
    }
  }

  return (
    <div>
      <div className="grid gap-3 mb-3.5" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
        <div className="rounded-xl border p-3.5" style={PANEL_STYLE}>
          <div className="text-[13px] font-extrabold mb-2" style={{ color: 'var(--qms-text)' }}>Message templates</div>
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {FAMILIES.map((f) => (
              <button
                key={f}
                onClick={() => setFamily(f)}
                className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border"
                style={{
                  background: family === f ? 'linear-gradient(135deg,#7c5cff,#3b6dff)' : 'transparent',
                  color: family === f ? '#fff' : 'var(--qms-text-soft)',
                  borderColor: family === f ? 'transparent' : 'var(--qms-border)',
                }}
              >
                {FAMILY_LABEL[f]}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {LANGS.map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border"
                style={{
                  background: lang === l ? 'linear-gradient(135deg,#7c5cff,#3b6dff)' : 'transparent',
                  color: lang === l ? '#fff' : 'var(--qms-text-soft)',
                  borderColor: lang === l ? 'transparent' : 'var(--qms-border)',
                }}
              >
                {LANGUAGE_LABEL[l]}
              </button>
            ))}
          </div>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            disabled={templatesLoading || !draft}
            className="font-sans text-[12px] leading-relaxed"
          />
          <div className="text-[11px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
            Placeholders: <b>[Name]</b> · <b>[Camp]</b> · <b>[Date]</b> · <b>[Time]</b> · <b>[Location]</b> · <b>[Patients]</b> · <b>[Map]</b> · <b>[Link]</b>
          </div>
          <div className="flex gap-1.5 mt-2">
            <Button onClick={handleSaveTemplate} disabled={!draft}><FiSave size={14} /> Save template</Button>
            <Button variant="ghost" onClick={handleResetTemplates}><FiRotateCcw size={14} /> Reset all to default</Button>
          </div>
        </div>

        <div className="rounded-xl border p-3.5" style={PANEL_STYLE}>
          <div className="text-[13px] font-extrabold mb-2" style={{ color: 'var(--qms-text)' }}>Preview (sample camp)</div>
          <div
            className="rounded-[10px] border p-3 text-[12px] leading-relaxed whitespace-pre-wrap"
            style={{ background: 'color-mix(in srgb, #3b6dff 6%, transparent)', borderColor: 'var(--qms-border)', color: 'var(--qms-text)' }}
          >
            {renderTemplate(body, samplePreviewContext(family))}
          </div>
        </div>
      </div>

      {cfgDraft && (
        <div className="rounded-xl border p-3.5" style={PANEL_STYLE}>
          <div className="text-[13px] font-extrabold mb-2" style={{ color: 'var(--qms-text)' }}>Automation settings</div>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))' }}>
            <Field label="Engine">
              <Select value={cfgDraft.enabled ? '1' : '0'} onValueChange={(v) => setCfgDraft({ ...cfgDraft, enabled: v === '1' })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Enabled</SelectItem>
                  <SelectItem value="0">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Mode">
              <Select value={cfgDraft.simulation ? '1' : '0'} onValueChange={(v) => setCfgDraft({ ...cfgDraft, simulation: v === '1' })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Simulation</SelectItem>
                  <SelectItem value="0">Live providers</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Default language">
              <Select value={cfgDraft.language} onValueChange={(v) => setCfgDraft({ ...cfgDraft, language: v as ReminderLanguage })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANGS.map((l) => <SelectItem key={l} value={l}>{LANGUAGE_LABEL[l]}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Holiday mode" note="skips dispatch for the whole tick when on">
              <Select value={cfgDraft.holiday ? '1' : '0'} onValueChange={(v) => setCfgDraft({ ...cfgDraft, holiday: v === '1' })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Off</SelectItem>
                  <SelectItem value="1">On — skip dispatch</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Lead time T-24 (minutes)">
              <Input
                type="number"
                value={cfgDraft.leadTimes.T24}
                onChange={(e) => setCfgDraft({ ...cfgDraft, leadTimes: { ...cfgDraft.leadTimes, T24: Math.max(1, Number(e.target.value || 1440)) } })}
              />
            </Field>
            <Field label="Lead time T-2 (minutes)">
              <Input
                type="number"
                value={cfgDraft.leadTimes.T2}
                onChange={(e) => setCfgDraft({ ...cfgDraft, leadTimes: { ...cfgDraft.leadTimes, T2: Math.max(1, Number(e.target.value || 120)) } })}
              />
            </Field>
            <Field label="Escalate after N voice calls">
              <Input
                type="number"
                value={cfgDraft.sla.escalateAfterCalls}
                onChange={(e) => setCfgDraft({ ...cfgDraft, sla: { ...cfgDraft.sla, escalateAfterCalls: Math.max(1, Number(e.target.value || 2)) } })}
              />
            </Field>
            <Field label="Response SLA (minutes)">
              <Input
                type="number"
                value={cfgDraft.sla.responseMinutes}
                onChange={(e) => setCfgDraft({ ...cfgDraft, sla: { ...cfgDraft.sla, responseMinutes: Math.max(1, Number(e.target.value || 30)) } })}
              />
            </Field>
            <Field label="Escalate-after-WA window" note="count of unread WA sends before escalating">
              <Input
                type="number"
                value={cfgDraft.sla.escalateAfterWa}
                onChange={(e) => setCfgDraft({ ...cfgDraft, sla: { ...cfgDraft.sla, escalateAfterWa: Math.max(0, Number(e.target.value || 1)) } })}
              />
            </Field>
            <Field label="Quiet hours — start" note="dead field: not enforced by the scheduler">
              <Input
                type="number"
                value={cfgDraft.quietHours.start}
                onChange={(e) => setCfgDraft({ ...cfgDraft, quietHours: { ...cfgDraft.quietHours, start: Number(e.target.value || 0) } })}
              />
            </Field>
            <Field label="Quiet hours — end" note="dead field: not enforced by the scheduler">
              <Input
                type="number"
                value={cfgDraft.quietHours.end}
                onChange={(e) => setCfgDraft({ ...cfgDraft, quietHours: { ...cfgDraft.quietHours, end: Number(e.target.value || 0) } })}
              />
            </Field>
            <div className="col-span-full">
              <label className="text-[11px] font-semibold block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Channels</label>
              <div className="flex gap-2 flex-wrap mt-1">
                {CHANNEL_KEYS.map((k) => (
                  <label key={k} className="flex gap-1.5 items-center px-2.5 py-1.5 rounded-lg border text-[12px] font-semibold" style={{ borderColor: 'var(--qms-border)' }}>
                    <input
                      type="checkbox"
                      checked={cfgDraft.channels[k]}
                      onChange={(e) => setCfgDraft({ ...cfgDraft, channels: { ...cfgDraft.channels, [k]: e.target.checked } })}
                    />
                    {k.toUpperCase()}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-2.5">
            <Button onClick={handleSaveConfig} disabled={configLoading}><FiSave size={14} /> Save settings</Button>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] font-semibold block mb-1" style={{ color: 'var(--qms-text-muted)' }}>{label}</label>
      {children}
      {note && <div className="text-[10px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>{note}</div>}
    </div>
  )
}

export default TemplatesSettingsTab
