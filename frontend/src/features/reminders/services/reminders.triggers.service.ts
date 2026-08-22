// The core reminders engine — thread creation, dispatch simulation,
// escalation, and the three scheduling entry points (tick/manualTrigger/
// bulkTrigger). This is the top of the dependency graph within
// features/reminders/services/: it composes config, threads, recipients,
// templates and dispatch, none of which depend back on this module.
// TODO: replace with real API calls once backend endpoints exist.

import type { Camp } from '@/features/camps/camp.types'
import type { Person } from '@/types/people.types'
import { CLIENTS } from '@/types/client.types'
import type {
  ReminderThread, ReminderConfig, RecipientType, ThreadAttempt, TickResult, EngineRecipient, ReminderTemplates,
} from '@/features/reminders/reminders.types'
import { getConfig } from './reminders.config.service'
import { loadThreads, saveThreadsInternal } from './reminders.threads.service'
import { campStartMs, recipientsFor } from './reminders.recipients.service'
import { getTemplates, templateFor, renderTemplate, buildContext } from './reminders.templates.service'
import { sendWhatsApp, placeVoiceCall, ivrToStatus, statusLabel } from './reminders.dispatch.service'
import { genId, nowIso } from './reminders.utils'

// clientName() — exact port of reminders-engine.js's clientName() lookup
// (clients().find(x => x.id === id).name, falling back to the raw id).
function clientName(clientId: string): string {
  return CLIENTS.find((c) => c.id === clientId)?.name ?? (clientId || '—')
}

function createThread(camp: Camp, recipient: EngineRecipient, stage: string, cfg: ReminderConfig): ReminderThread {
  return {
    id: genId('rem'),
    campId: camp.id,
    campName: (camp as unknown as { name?: string }).name || `${camp.type || ''} · ${camp.city || ''}`,
    campCity: camp.city || '',
    campState: camp.state || '',
    campStartMs: campStartMs(camp),
    campSlot: camp.slot || '',
    campType: camp.type || '',
    clientId: camp.clientId || '',
    clientName: clientName(camp.clientId),
    recipientType: recipient.type,
    recipientId: recipient.id,
    recipientName: recipient.name,
    recipientPhone: recipient.phone,
    stage,
    language: cfg.language || 'en',
    status: 'SCHEDULED',
    attempts: [],
    response: null,
    escalation: null,
    backupSuggestion: '',
    createdAt: nowIso(),
    updatedAt: nowIso(),
    simulated: !!cfg.simulation,
  }
}

// suggestBackup() — same-role pool (excluding current recipient), preferring
// someone whose hq/city matches the camp's city, else the pool's first
// entry. Exact port (city-affinity, NOT a schedule-conflict check).
export function suggestBackup(camp: Camp, recipientType: RecipientType, excludeId: string, people: Person[]): string {
  const pool = recipientType === 'FO'
    ? people.filter((p) => p.role === 'Field Officer' && p.id !== excludeId)
    : people.filter((p) => p.role === 'Dietitian' && p.id !== excludeId)
  if (!pool.length) return ''
  const city = (camp.city || '').toLowerCase()
  const local = pool.find((p) => String(p.hq || '').toLowerCase() === city)
  return (local ?? pool[0]).name
}

function simulateDispatch(thread: ReminderThread, cfg: ReminderConfig, camp: Camp, people: Person[], templates: ReminderTemplates) {
  thread.status = 'IN_PROGRESS'
  const t0 = Date.now()
  const recipient: EngineRecipient = { type: thread.recipientType, id: thread.recipientId, name: thread.recipientName, phone: thread.recipientPhone }
  const tplCtx = buildContext(camp, recipient)

  if (cfg.channels.whatsapp) {
    const wa = sendWhatsApp({ threadId: thread.id, recipientId: thread.recipientId, phone: thread.recipientPhone, body: renderTemplate(templateFor(templates, 'wa', thread.recipientType, thread.language), tplCtx) })
    thread.attempts.push({
      at: new Date(t0).toISOString(),
      channel: 'WHATSAPP', result: wa.result, messageId: wa.messageId,
      details: `Template "${thread.recipientType === 'FO' ? 'wa_fo' : 'wa_diet'}" · ${thread.language}`,
    })
  }

  let confirmed = false
  const maxCalls = cfg.sla.escalateAfterCalls || 2
  for (let i = 1; i <= maxCalls && cfg.channels.voice && !confirmed; i++) {
    const at = new Date(t0 + i * 60 * 1000).toISOString()
    const call = placeVoiceCall({ threadId: thread.id, recipientId: thread.recipientId, phone: thread.recipientPhone, script: renderTemplate(templateFor(templates, 'voice', thread.recipientType, thread.language), tplCtx), attempt: i })
    thread.attempts.push({
      at, channel: 'AI_VOICE', result: call.result, ivrKey: call.ivrKey,
      recordingUrl: call.recordingUrl, duration: call.duration, attempt: i,
      details: `Attempt ${i}${call.ivrKey ? ` · IVR ${call.ivrKey}` : ''}`,
    } as ThreadAttempt)
    if (call.result === 'ANSWERED' && call.ivrKey) {
      confirmed = true
      thread.response = { key: call.ivrKey, label: statusLabel(ivrToStatus(call.ivrKey)), at }
      thread.status = ivrToStatus(call.ivrKey)
    }
  }

  if (!confirmed) {
    const waRead = thread.attempts.find((a) => a.channel === 'WHATSAPP' && (a.result === 'READ' || a.result === 'DELIVERED'))
    if (!waRead || maxCalls >= cfg.sla.escalateAfterCalls) {
      thread.status = 'ESCALATED'
      thread.escalation = {
        at: new Date(t0 + (maxCalls + 1) * 60 * 1000).toISOString(),
        to: ['Camp Coordinator', 'Operations Manager'],
        reason: `No IVR confirmation after ${maxCalls} calls${waRead ? '' : ' and no WhatsApp delivery'}`,
        backupSuggestion: suggestBackup(camp, thread.recipientType, thread.recipientId, people),
      }
      thread.backupSuggestion = thread.escalation.backupSuggestion
    } else {
      thread.status = 'NO_RESPONSE'
    }
  }

  thread.updatedAt = nowIso()
}

// Post-camp submission dispatch — WhatsApp only, carries the unique
// submission link. Status stays IN_PROGRESS until the dietitian actually
// submits via the diet-submit page (this engine never self-confirms it).
function simulatePostSubmitDispatch(thread: ReminderThread, camp: Camp, templates: ReminderTemplates) {
  thread.status = 'IN_PROGRESS'
  const t0 = Date.now()
  const recipient: EngineRecipient = { type: thread.recipientType, id: thread.recipientId, name: thread.recipientName, phone: thread.recipientPhone }
  const ctx = buildContext(camp, recipient)
  const body = renderTemplate(templateFor(templates, 'submit', 'Dietitian', thread.language), ctx)
  const wa = sendWhatsApp({ threadId: thread.id, recipientId: thread.recipientId, phone: thread.recipientPhone, body })
  thread.attempts.push({
    at: new Date(t0).toISOString(),
    channel: 'WHATSAPP', result: wa.result, messageId: wa.messageId,
    details: `Post-camp submission reminder · ${thread.stage} · link ${camp.submissionUrl || '—'}`,
  })
  thread.updatedAt = nowIso()
}

function threadKey(campId: string, recipientType: string, recipientId: string, stage: string): string {
  return `${campId}|${recipientType}|${recipientId}|${stage}`
}

// tick() — scan camps, create + dispatch due pre-camp (T24/T2) and post-camp
// (POSTSUBMIT_<n>, Diet camps only, capped at 30 days) reminders. Idempotent
// via threadKey dedup, exact port of reminders-engine.js's tick().
export async function tick(camps: Camp[], people: Person[]): Promise<TickResult> {
  const cfg = getConfig()
  if (!cfg.enabled) return { created: 0, dispatched: 0 }
  if (cfg.holiday) return { created: 0, dispatched: 0, skipped: 'holiday' }

  const templates = getTemplates()
  const threads = loadThreads()
  const byKey = new Map<string, ReminderThread>()
  threads.forEach((t) => byKey.set(threadKey(t.campId, t.recipientType, t.recipientId, t.stage), t))

  let created = 0
  const now = Date.now()

  for (const c of camps) {
    const sUp = String(c.status || '').toUpperCase()
    if (sUp === 'CANCELLED' || sUp === 'CANCELLED_CHARGED') continue
    const startMs = campStartMs(c)
    if (!startMs) continue

    if (sUp !== 'CLOSED' && now <= startMs + 60 * 60 * 1000) {
      const stages: [string, number][] = [['T24', cfg.leadTimes.T24], ['T2', cfg.leadTimes.T2]]
      for (const [stage, leadMin] of stages) {
        const triggerMs = startMs - leadMin * 60 * 1000
        if (now < triggerMs) continue
        for (const r of recipientsFor(c, people)) {
          const key = threadKey(c.id, r.type, r.id, stage)
          if (byKey.has(key)) continue
          const t = createThread(c, r, stage, cfg)
          simulateDispatch(t, cfg, c, people, templates)
          threads.unshift(t)
          byKey.set(key, t)
          created++
        }
      }
    }

    if (c.type === 'Diet' && c.dietitianId && !c.submissionCompleted) {
      const endMs = startMs + 4 * 60 * 60 * 1000
      if (now >= endMs) {
        const daysSince = Math.floor((now - endMs) / (24 * 60 * 60 * 1000))
        if (daysSince >= 0 && daysSince <= 30) {
          const stage = `POSTSUBMIT_${daysSince}`
          const d = people.find((x) => x.id === c.dietitianId)
          const recipient: EngineRecipient = { type: 'Dietitian', id: c.dietitianId, name: d?.name || c.dietitianId, phone: d?.phone || '+91 9XX XXX XXXX' }
          const key = threadKey(c.id, recipient.type, recipient.id, stage)
          if (!byKey.has(key)) {
            const t = createThread(c, recipient, stage, cfg)
            simulatePostSubmitDispatch(t, c, templates)
            threads.unshift(t)
            byKey.set(key, t)
            created++
          }
        }
      }
    }
  }

  saveThreadsInternal(threads)
  return { created, dispatched: created }
}

// manualTrigger() — bypasses the lead-time gate; re-dispatches (appends
// attempts to) an existing thread if one already exists for this
// (camp, recipient, stage), else creates one. Exact port.
export async function manualTrigger(campId: string, recipientType: RecipientType, recipientId: string, stage: string, camps: Camp[], people: Person[]): Promise<ReminderThread | null> {
  const cfg = getConfig()
  const camp = camps.find((c) => c.id === campId)
  if (!camp) return null
  const recipient = recipientsFor(camp, people).find((r) => r.type === recipientType && r.id === recipientId)
  if (!recipient) return null

  const templates = getTemplates()
  const threads = loadThreads()
  const existing = threads.find((t) => t.campId === campId && t.recipientType === recipientType && t.recipientId === recipientId && t.stage === stage)
  let t: ReminderThread
  if (existing) {
    simulateDispatch(existing, cfg, camp, people, templates)
    t = existing
  } else {
    t = createThread(camp, recipient, stage, cfg)
    simulateDispatch(t, cfg, camp, people, templates)
    threads.unshift(t)
  }
  saveThreadsInternal(threads)
  return t
}

// bulkTrigger() — fire a given stage across every eligible (non-closed,
// non-cancelled) camp's recipients, skipping any (camp, recipient, stage)
// that already has a thread. Exact port.
export async function bulkTrigger(stage: string, camps: Camp[], people: Person[]): Promise<number> {
  const cfg = getConfig()
  const templates = getTemplates()
  const threads = loadThreads()
  let n = 0
  for (const c of camps) {
    const sUp = String(c.status || '').toUpperCase()
    if (sUp === 'CLOSED' || sUp === 'CANCELLED' || sUp === 'CANCELLED_CHARGED') continue
    if (!campStartMs(c)) continue
    for (const r of recipientsFor(c, people)) {
      const key = threadKey(c.id, r.type, r.id, stage)
      if (threads.find((x) => threadKey(x.campId, x.recipientType, x.recipientId, x.stage) === key)) continue
      const t = createThread(c, r, stage, cfg)
      simulateDispatch(t, cfg, c, people, templates)
      threads.unshift(t)
      n++
    }
  }
  saveThreadsInternal(threads)
  return n
}
