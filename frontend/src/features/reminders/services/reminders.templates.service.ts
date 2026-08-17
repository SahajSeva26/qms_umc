// Reminder message templates — CRUD (owns KEYS.TEMPLATES) plus rendering:
// picking the right template family for a channel/recipient/language and
// substituting [Placeholder] values into it.
// TODO: replace with real API calls once backend endpoints exist.

import type { Camp } from '@/types/camp.types'
import type {
  ReminderTemplates, ReminderConfig, TemplateFamily, RecipientType, EngineRecipient,
} from '@/features/reminders/reminders.types'
import { DEFAULT_TEMPLATES } from '@/features/reminders/reminders.types'
import { KEYS, load, persist } from './reminders.storage'
import { campStartMs } from './reminders.recipients.service'

export function getTemplates(): ReminderTemplates {
  return load(KEYS.TEMPLATES, DEFAULT_TEMPLATES)
}

export async function saveTemplates(templates: ReminderTemplates): Promise<ReminderTemplates> {
  persist(KEYS.TEMPLATES, templates)
  return templates
}

// templateFor() — exported for reminders.triggers.service.ts's dispatch
// simulation; not part of the public facade (was module-private in the
// original single-file service). Takes the already-loaded template set
// rather than calling getTemplates() itself — a dispatch loop (tick/
// bulkTrigger over many camps × recipients × stages) can call this several
// times per thread, and the underlying set never changes mid-dispatch, so
// the caller loads it once and passes it through instead of re-parsing the
// same localStorage blob on every call.
export function templateFor(templates: ReminderTemplates, channel: 'voice' | 'wa' | 'submit', recipientType: RecipientType, language: ReminderConfig['language']): string {
  const prefix = channel === 'voice' ? 'voice_' : channel === 'submit' ? 'submit_' : 'wa_'
  const key = (prefix + (recipientType === 'FO' ? 'fo' : 'diet')) as TemplateFamily
  const set = templates[key]
  if (!set) return ''
  const lang = set[language] ? language : 'en'
  return set[lang] ?? ''
}

// renderTemplate() — [Square] [Bracket] placeholder syntax, exact port.
export function renderTemplate(text: string, ctx: Record<string, string | number>): string {
  return String(text || '').replace(/\[(\w+)\]/g, (_, k: string) => (ctx[k] != null ? String(ctx[k]) : ''))
}

// buildContext() — the [Placeholder] substitution map, exact port including
// the Link fallback chain (submissionUrl → constructed diet-submit URL from
// submissionToken → empty). Exported so the Templates & Settings preview can
// run the exact real code path (incl. real Date/Time formatting) against a
// sample camp, matching reminder-automation.js's own tabTemplates() preview.
export function buildContext(camp: Camp, recipient: EngineRecipient): Record<string, string | number> {
  const startMs = campStartMs(camp)
  const dt = new Date(startMs || Date.now())
  return {
    Name: recipient.name,
    Camp: (camp as unknown as { name?: string }).name || `${camp.type} camp · ${camp.city || ''}`,
    Date: dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
    Time: dt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }),
    Location: [camp.city, camp.state].filter(Boolean).join(', ') || camp.address || '—',
    Patients: camp.patientsExpected || 50,
    Map: camp.gmapLink || `https://maps.google.com/?q=${encodeURIComponent([camp.city, camp.state].filter(Boolean).join(', '))}`,
    Link: camp.submissionUrl || (camp.submissionToken ? `pages/diet-submit.html?token=${encodeURIComponent(camp.submissionToken)}` : ''),
  }
}
