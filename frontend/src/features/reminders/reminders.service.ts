// AI Reminders engine — exact port of the prototype's window.QMS_REMIND
// (s:\QMS-Camp-Portal-feature-qms-sales-ops-suite\assets\js\reminders-engine.js).
// TODO: entirely mock/frontend-only — sendWhatsApp()/placeVoiceCall() are the
// prototype's own "provider hooks": simulation-mode bodies to be swapped for
// real Twilio/Exotel/WhatsApp Business API calls later, per the prototype's
// own header comment — not a vague gap, a deliberate swap-point.

import type { Camp } from '@/types/camp.types'
import type { Person } from '@/types/people.types'
import { CLIENTS } from '@/types/client.types'
import type {
  ReminderThread, ReminderThreadStatus, ReminderTemplates, ReminderConfig, TemplateFamily,
  RecipientType, ThreadAttempt, TickResult, ReminderSummary, CallResult, WaResult,
} from '@/features/reminders/reminders.types'
import { DEFAULT_TEMPLATES, DEFAULT_CONFIG, STATUS_LABELS } from '@/features/reminders/reminders.types'

// clientName() — exact port of reminders-engine.js's clientName() lookup
// (clients().find(x => x.id === id).name, falling back to the raw id).
function clientName(clientId: string): string {
  return CLIENTS.find((c) => c.id === clientId)?.name ?? (clientId || '—')
}

const KEYS = {
  THREADS: 'qms.remind.threads',
  TEMPLATES: 'qms.remind.templates',
  CONFIG: 'qms.remind.config',
}

function load<T>(key: string, seed: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch {
    // fall through to seed
  }
  return JSON.parse(JSON.stringify(seed))
}

function persist<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // demo persistence only
  }
}

function genId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 6).toUpperCase()}${Date.now().toString(36).slice(-4).toUpperCase()}`
}

function nowIso(): string {
  return new Date().toISOString()
}

// seeded() — FNV-1a-style deterministic PRNG, exact port of reminders-engine.js's seeded().
export function seeded(str: string): () => number {
  let s = 2166136261 >>> 0
  const key = String(str || 'x')
  for (let i = 0; i < key.length; i++) {
    s ^= key.charCodeAt(i)
    s = Math.imul(s, 16777619) >>> 0
  }
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

export function getConfig(): ReminderConfig {
  return { ...DEFAULT_CONFIG, ...load(KEYS.CONFIG, {} as Partial<ReminderConfig>) }
}

export async function saveConfig(patch: Partial<ReminderConfig>): Promise<ReminderConfig> {
  const next = { ...getConfig(), ...patch }
  persist(KEYS.CONFIG, next)
  return next
}

export function getTemplates(): ReminderTemplates {
  return load(KEYS.TEMPLATES, DEFAULT_TEMPLATES)
}

export async function saveTemplates(templates: ReminderTemplates): Promise<ReminderTemplates> {
  persist(KEYS.TEMPLATES, templates)
  return templates
}

function loadThreads(): ReminderThread[] {
  return load(KEYS.THREADS, [])
}

function saveThreadsInternal(list: ReminderThread[]) {
  persist(KEYS.THREADS, list.slice(0, 800))
}

// TODO: replace with real API calls once backend endpoints exist
export async function getThreads(): Promise<ReminderThread[]> {
  return loadThreads()
}

export function threadsForCamp(campId: string, threads?: ReminderThread[]): ReminderThread[] {
  return (threads ?? loadThreads()).filter((t) => t.campId === campId)
}

// slotStartHour() — "10-2" → 10 (AM); "6-10" → 18 (PM). Exact port.
function slotStartHour(slot: string | undefined): number {
  const m = String(slot || '').match(/^(\d+)/)
  if (!m) return 10
  const h = Number(m[1])
  return h < 7 ? h + 12 : h
}

export function campStartMs(camp: Camp): number | null {
  if (!camp.date) return null
  const h = slotStartHour(camp.slot)
  const d = new Date(`${camp.date}T${String(h).padStart(2, '0')}:00:00`)
  return d.getTime()
}

export interface EngineRecipient {
  type: RecipientType
  id: string
  name: string
  phone: string
}

// deriveDietitianForCamp() — camp.dietitianId if set, else (for Diet camps
// only) a seeded pseudo-random pick from the dietitian pool, exact port.
function deriveDietitianForCamp(camp: Camp, people: Person[]): string {
  if (camp.dietitianId) return camp.dietitianId
  if (camp.type !== 'Diet') return ''
  const pool = people.filter((p) => p.role === 'Dietitian')
  if (!pool.length) return ''
  const rng = seeded(`${camp.id}|diet`)
  return pool[Math.floor(rng() * pool.length)].id
}

// recipientsFor() — FO (if camp.foId set) + Dietitian (derived) only. Exact port.
export function recipientsFor(camp: Camp, people: Person[]): EngineRecipient[] {
  const out: EngineRecipient[] = []
  if (camp.foId) {
    const p = people.find((x) => x.id === camp.foId)
    out.push({ type: 'FO', id: camp.foId, name: camp.foName || p?.name || camp.foId, phone: p?.phone || '+91 9XX XXX XXXX' })
  }
  const did = deriveDietitianForCamp(camp, people)
  if (did) {
    const p = people.find((x) => x.id === did)
    out.push({ type: 'Dietitian', id: did, name: p?.name || did, phone: p?.phone || '+91 9XX XXX XXXX' })
  }
  return out
}

// renderTemplate() — [Square] [Bracket] placeholder syntax, exact port.
export function renderTemplate(text: string, ctx: Record<string, string | number>): string {
  return String(text || '').replace(/\[(\w+)\]/g, (_, k: string) => (ctx[k] != null ? String(ctx[k]) : ''))
}

function templateFor(channel: 'voice' | 'wa' | 'submit', recipientType: RecipientType, language: ReminderConfig['language']): string {
  const t = getTemplates()
  const prefix = channel === 'voice' ? 'voice_' : channel === 'submit' ? 'submit_' : 'wa_'
  const key = (prefix + (recipientType === 'FO' ? 'fo' : 'diet')) as TemplateFamily
  const set = t[key]
  if (!set) return ''
  const lang = set[language] ? language : 'en'
  return set[lang] ?? ''
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

// ── Provider hooks — simulation-mode bodies (swap for real Twilio/Exotel/
// WhatsApp Business API calls to go live; rest of the module is unaffected). ──

export function sendWhatsApp(payload: { threadId: string; recipientId: string; phone: string; body: string }): { provider: string; messageId: string; result: WaResult } {
  const rng = seeded(`${payload.threadId || ''}|wa|${payload.recipientId}`)
  const r = rng()
  const result: WaResult = r < 0.05 ? 'FAILED' : r < 0.15 ? 'DELIVERED' : 'READ'
  return { provider: 'sim:whatsapp', messageId: `wam_${Math.random().toString(36).slice(2, 10)}`, result }
}

export function placeVoiceCall(payload: { threadId: string; recipientId: string; phone: string; script: string; attempt: number }): {
  provider: string; callId: string; result: CallResult; ivrKey: '1' | '2' | '3' | '4' | null; duration: number; recordingUrl: string
} {
  const rng = seeded(`${payload.threadId || ''}|voice|${payload.recipientId}|${payload.attempt || 1}`)
  const r = rng()
  let callResult: CallResult
  let ivrKey: '1' | '2' | '3' | '4' | null = null
  let duration = 0
  if (r < 0.08) callResult = 'BUSY'
  else if (r < 0.13) callResult = 'REJECTED'
  else if (r < 0.22) callResult = 'NO_ANSWER'
  else {
    callResult = 'ANSWERED'
    duration = 22 + Math.floor(rng() * 60)
    const k = rng()
    ivrKey = k < 0.65 ? '1' : k < 0.78 ? '2' : k < 0.85 ? '3' : '4'
  }
  return {
    provider: 'sim:voice',
    callId: `cal_${Math.random().toString(36).slice(2, 10)}`,
    result: callResult, ivrKey, duration,
    recordingUrl: callResult === 'ANSWERED' ? `/sim/rec/${payload.threadId}-a${payload.attempt || 1}.mp3` : '',
  }
}

// ivrToStatus() — 1 confirm, 2 delayed, 3 not attending, 4 coordinator-connected. Exact port.
export function ivrToStatus(key: string | null): ReminderThreadStatus {
  return ({ '1': 'CONFIRMED', '2': 'DELAYED', '3': 'NOT_ATTENDING', '4': 'COORDINATOR_CONNECTED' } as Record<string, ReminderThreadStatus>)[String(key)] ?? 'NO_RESPONSE'
}

export function statusLabel(status: ReminderThreadStatus): string {
  return STATUS_LABELS[status] ?? status
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

function simulateDispatch(thread: ReminderThread, cfg: ReminderConfig, camp: Camp, people: Person[]) {
  thread.status = 'IN_PROGRESS'
  const t0 = Date.now()
  const recipient: EngineRecipient = { type: thread.recipientType, id: thread.recipientId, name: thread.recipientName, phone: thread.recipientPhone }
  const tplCtx = buildContext(camp, recipient)

  if (cfg.channels.whatsapp) {
    const wa = sendWhatsApp({ threadId: thread.id, recipientId: thread.recipientId, phone: thread.recipientPhone, body: renderTemplate(templateFor('wa', thread.recipientType, thread.language), tplCtx) })
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
    const call = placeVoiceCall({ threadId: thread.id, recipientId: thread.recipientId, phone: thread.recipientPhone, script: renderTemplate(templateFor('voice', thread.recipientType, thread.language), tplCtx), attempt: i })
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
function simulatePostSubmitDispatch(thread: ReminderThread, camp: Camp) {
  thread.status = 'IN_PROGRESS'
  const t0 = Date.now()
  const recipient: EngineRecipient = { type: thread.recipientType, id: thread.recipientId, name: thread.recipientName, phone: thread.recipientPhone }
  const ctx = buildContext(camp, recipient)
  const body = renderTemplate(templateFor('submit', 'Dietitian', thread.language), ctx)
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
          simulateDispatch(t, cfg, c, people)
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
            simulatePostSubmitDispatch(t, c)
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

  const threads = loadThreads()
  const existing = threads.find((t) => t.campId === campId && t.recipientType === recipientType && t.recipientId === recipientId && t.stage === stage)
  let t: ReminderThread
  if (existing) {
    simulateDispatch(existing, cfg, camp, people)
    t = existing
  } else {
    t = createThread(camp, recipient, stage, cfg)
    simulateDispatch(t, cfg, camp, people)
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
      simulateDispatch(t, cfg, c, people)
      threads.unshift(t)
      n++
    }
  }
  saveThreadsInternal(threads)
  return n
}

// summary() — dashboard KPI aggregation, exact port.
export function summary(threads: ReminderThread[]): ReminderSummary {
  const by: Partial<Record<ReminderThreadStatus, number>> = {}
  let waSent = 0, waDelivered = 0, waRead = 0, callsPlaced = 0, callsAnswered = 0, totalDuration = 0
  const responseTimes: number[] = []

  threads.forEach((t) => {
    by[t.status] = (by[t.status] ?? 0) + 1
    t.attempts.forEach((a) => {
      if (a.channel === 'WHATSAPP') {
        waSent++
        if (a.result === 'DELIVERED' || a.result === 'READ') waDelivered++
        if (a.result === 'READ') waRead++
      }
      if (a.channel === 'AI_VOICE') {
        callsPlaced++
        if (a.result === 'ANSWERED') { callsAnswered++; totalDuration += Number(a.duration || 0) }
      }
    })
    if (t.response?.at) {
      responseTimes.push((new Date(t.response.at).getTime() - new Date(t.createdAt).getTime()) / 60000)
    }
  })

  const avgResp = responseTimes.length ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : null
  return {
    total: threads.length, by,
    waSent, waDelivered, waRead,
    waDeliveryPct: waSent ? Math.round((100 * waDelivered) / waSent) : 0,
    callsPlaced, callsAnswered,
    callSuccessPct: callsPlaced ? Math.round((100 * callsAnswered) / callsPlaced) : 0,
    avgCallDuration: callsAnswered ? Math.round(totalDuration / callsAnswered) : 0,
    avgResponseMins: avgResp,
  }
}
