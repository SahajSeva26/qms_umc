// Shared display helpers for the AI Reminders screen — status colors/labels,
// template-family labels, date formatting. Kept separate from
// reminders.service.ts (the engine) so the UI layer owns zero business logic,
// matching the prototype's own split between reminders-engine.js
// (statusLabel/statusColor live there) and reminder-automation.js (pure
// rendering). Re-exports the engine's own STATUS_LABELS/STATUS_COLORS rather
// than duplicating the 8-value vocabulary a second time.
import type { ReminderThreadStatus, TemplateFamily, ReminderLanguage } from '@/features/reminders/reminders.types'
import { STATUS_LABELS, STATUS_COLORS } from '@/features/reminders/reminders.types'

export const STATUS_LABEL = STATUS_LABELS
export const STATUS_COLOR = STATUS_COLORS

// voice_fo/voice_diet/wa_fo/wa_diet (pre-camp, T-24/T-2) + submit_diet
// (post-camp dietitian-submission nag) — the 5 real template families.
export const FAMILY_LABEL: Record<TemplateFamily, string> = {
  voice_fo: 'AI Voice · FO',
  voice_diet: 'AI Voice · Dietitian',
  wa_fo: 'WhatsApp · FO',
  wa_diet: 'WhatsApp · Dietitian',
  submit_diet: 'WhatsApp · Post-camp submission nag',
}

export const LANGUAGE_LABEL: Record<ReminderLanguage, string> = { en: 'EN', hi: 'HI', mr: 'MR' }

export function statusLabel(s: ReminderThreadStatus): string {
  return STATUS_LABEL[s] ?? s
}

export function statusColor(s: ReminderThreadStatus): string {
  return STATUS_COLOR[s] ?? '#64748b'
}

export function num(n: number): string {
  return Number(n || 0).toLocaleString('en-IN')
}

export function fmtDt(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })
}

export function fmtCampDate(ms?: number | null): string {
  if (!ms) return '—'
  const d = new Date(ms)
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export function ago(iso?: string | null): string {
  if (!iso) return ''
  const d = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  if (d < 60) return d + 's ago'
  if (d < 3600) return Math.round(d / 60) + 'm ago'
  if (d < 86400) return Math.round(d / 3600) + 'h ago'
  return Math.round(d / 86400) + 'd ago'
}
