// AI Reminders domain types — exact port of the prototype's
// s:\QMS-Camp-Portal-feature-qms-sales-ops-suite\assets\js\reminders-engine.js
// (window.QMS_REMIND), NOT a from-scratch redesign. Recipients are FO/Dietitian
// ONLY (no MR/Doctor concept in this engine — those roles belong to other
// screens). Placeholders use [Square] [Bracket] syntax, matching the
// prototype's renderTemplate()'s `/\[(\w+)\]/g` regex exactly — do not use
// {{curly}} syntax, it will not match anything a real template author expects
// if they're used to reading the prototype's own scripts.
// TODO: entirely mock/frontend-only — no real WhatsApp/IVR vendor exists;
// sendWhatsApp()/placeVoiceCall() in reminders.service.ts are simulation-mode
// provider hooks — the prototype's own comment describes flipping
// `simulation: false` and wiring real Twilio/Exotel/WhatsApp Business API
// calls into those exact two functions later, so the TODO here is genuinely
// "swap this simulated body for a real fetch() call," not a vague gap.

export type ReminderLanguage = 'en' | 'hi' | 'mr'

// Recipient roles — FO and Dietitian only (recipientsFor() in the prototype
// never produces MR/Doctor recipients; those don't exist in this engine).
export type RecipientType = 'FO' | 'Dietitian'

// Template families — voice_fo/voice_diet/wa_fo/wa_diet (pre-camp, T-24/T-2)
// plus submit_diet (post-camp dietitian-submission nag, WhatsApp-only,
// repeats every 24h for up to 30 days via a POSTSUBMIT_<n> stage until the
// dietitian submits data through the unique link).
export type TemplateFamily = 'voice_fo' | 'voice_diet' | 'wa_fo' | 'wa_diet' | 'submit_diet'

export interface ReminderTemplateSet {
  en: string
  hi: string
  mr: string
}

export type ReminderTemplates = Record<TemplateFamily, ReminderTemplateSet>

// Pre-camp stages are literally 'T24'/'T2' (lead-time keys); post-camp stages
// are dynamically generated as `POSTSUBMIT_<daysSinceCampEnd>` (0..30) — a
// stage is a free-form string, not a small closed union, matching the
// prototype's own stage key shape exactly.
export type ReminderStage = 'T24' | 'T2' | string

// 8-value thread status vocabulary — exact match to reminders-engine.js's
// ivrToStatus()/statusLabel()/statusColor() maps. IVR key 1→CONFIRMED,
// 2→DELAYED, 3→NOT_ATTENDING, 4→COORDINATOR_CONNECTED; anything else (no
// answer within the retry budget, busy, rejected) → NO_RESPONSE, and if the
// thread never got a WhatsApp delivery/read AND ran out of call retries, the
// engine escalates to Camp Coordinator + Operations Manager → ESCALATED.
export type ReminderThreadStatus =
  | 'SCHEDULED' | 'IN_PROGRESS' | 'CONFIRMED' | 'DELAYED' | 'NOT_ATTENDING'
  | 'NO_RESPONSE' | 'ESCALATED' | 'COORDINATOR_CONNECTED'

export const STATUS_LABELS: Record<ReminderThreadStatus, string> = {
  SCHEDULED: 'Scheduled', IN_PROGRESS: 'In progress', CONFIRMED: 'Confirmed',
  DELAYED: 'Delayed', NOT_ATTENDING: 'Not attending', NO_RESPONSE: 'No response',
  ESCALATED: 'Escalated', COORDINATOR_CONNECTED: 'Coordinator connected',
}

export const STATUS_COLORS: Record<ReminderThreadStatus, string> = {
  SCHEDULED: '#94a3b8', IN_PROGRESS: '#0ea5e9', CONFIRMED: '#10b981',
  DELAYED: '#f59e0b', NOT_ATTENDING: '#f43f5e', NO_RESPONSE: '#64748b',
  ESCALATED: '#b91c1c', COORDINATOR_CONNECTED: '#7c5cff',
}

export type CallResult = 'BUSY' | 'REJECTED' | 'NO_ANSWER' | 'ANSWERED'
export type WaResult = 'FAILED' | 'DELIVERED' | 'READ'

export interface ThreadAttempt {
  at: string
  channel: 'WHATSAPP' | 'AI_VOICE'
  result: WaResult | CallResult
  messageId?: string
  ivrKey?: '1' | '2' | '3' | '4' | null
  recordingUrl?: string
  duration?: number
  attempt?: number
  details: string
}

export interface ThreadResponse {
  key: '1' | '2' | '3' | '4'
  label: string
  at: string
}

export interface ThreadEscalation {
  at: string
  to: string[]
  reason: string
  backupSuggestion: string
}

// One thread per (camp × recipient × stage) — exact shape of createThread()'s
// return value in reminders-engine.js.
export interface ReminderThread {
  id: string
  campId: string
  campName: string
  campCity: string
  campState: string
  campStartMs: number | null
  campSlot: string
  campType: string
  clientId: string
  clientName: string
  recipientType: RecipientType
  recipientId: string
  recipientName: string
  recipientPhone: string
  stage: ReminderStage
  language: ReminderLanguage
  status: ReminderThreadStatus
  attempts: ThreadAttempt[]
  response: ThreadResponse | null
  escalation: ThreadEscalation | null
  backupSuggestion: string
  createdAt: string
  updatedAt: string
  simulated: boolean
}

export interface ReminderConfig {
  enabled: boolean
  language: ReminderLanguage
  leadTimes: { T24: number; T2: number } // minutes before camp
  sla: { responseMinutes: number; escalateAfterCalls: number; escalateAfterWa: number }
  quietHours: { start: number; end: number } // hour-of-day, e.g. 22–7 — DEAD: no
  // code path in the prototype reads quietHours to skip dispatch despite the
  // field's name/comment implying it does; preserved for editor parity only.
  channels: { whatsapp: boolean; voice: boolean; sms: boolean; email: boolean }
  holiday: boolean
  simulation: boolean
}

export const DEFAULT_CONFIG: ReminderConfig = {
  enabled: true,
  language: 'en',
  leadTimes: { T24: 24 * 60, T2: 2 * 60 },
  sla: { responseMinutes: 30, escalateAfterCalls: 2, escalateAfterWa: 1 },
  quietHours: { start: 22, end: 7 },
  channels: { whatsapp: true, voice: true, sms: false, email: false },
  holiday: false,
  simulation: true,
}

// Bilingual templates — placeholders use [Name] [Camp] [Date] [Time]
// [Location] [Patients] [Map] [Link], exact transcription of
// reminders-engine.js's DEFAULT_TEMPLATES (including submit_diet, the
// post-camp nag family many earlier drafts of this port were missing).
export const DEFAULT_TEMPLATES: ReminderTemplates = {
  voice_fo: {
    en: 'Hello [Name]. This is an automated reminder from QMS Healthcare. You are assigned for [Camp] on [Date] at [Time], location [Location]. Expected patients [Patients]. Press 1 to confirm. Press 2 if running late. Press 3 if unable to attend. Press 4 to connect with the coordinator. Thank you.',
    hi: 'नमस्ते [Name]. QMS Healthcare की ओर से ऑटोमेटेड रिमाइंडर। आप [Date] को [Time] पर [Location] में [Camp] के लिए अस्साइन हैं। मरीज़ अनुमानित [Patients]। पुष्टि के लिए 1 दबाएँ, देरी के लिए 2, असमर्थता के लिए 3, समन्वयक से बात करने के लिए 4 दबाएँ। धन्यवाद।',
    mr: 'नमस्कार [Name]. QMS Healthcare कडून automated reminder. तुम्ही [Date] रोजी [Time] वाजता [Location] येथे [Camp] साठी नियुक्त आहात. अंदाजे रुग्ण [Patients]. पुष्टीसाठी 1 दाबा, उशीर असल्यास 2, येऊ शकत नसल्यास 3, समन्वयकाशी बोलण्यासाठी 4 दाबा. धन्यवाद.',
  },
  voice_diet: {
    en: 'Hello [Name]. This is an automated reminder from QMS Healthcare. You are scheduled for the [Camp] camp on [Date] at [Time], location [Location]. Press 1 to confirm. Press 2 if delayed. Press 3 if unavailable. Press 4 for coordinator assistance. Thank you.',
    hi: 'नमस्ते [Name]. QMS Healthcare की ओर से ऑटोमेटेड रिमाइंडर। आप [Date] को [Time] पर [Location] में [Camp] कैम्प के लिए नियत हैं। 1 — पुष्टि, 2 — देरी, 3 — उपलब्ध नहीं, 4 — समन्वयक से बात। धन्यवाद।',
    mr: 'नमस्कार [Name]. QMS Healthcare कडून reminder. [Date] रोजी [Time] वाजता [Location] येथे [Camp] कॅम्पसाठी नियुक्त. 1 — confirm, 2 — उशीर, 3 — उपलब्ध नाही, 4 — coordinator. धन्यवाद.',
  },
  wa_fo: {
    en: 'Dear [Name],\n\nReminder for your assigned healthcare camp.\n\nCamp: [Camp]\nDate: [Date]\nTime: [Time]\nLocation: [Location]\nExpected patients: [Patients]\nGoogle Map: [Map]\n\nPlease confirm your availability.\n\nRegards,\nQMS Healthcare',
    hi: 'प्रिय [Name],\n\nआपके निर्धारित कैम्प के लिए रिमाइंडर।\n\nकैम्प: [Camp]\nतारीख़: [Date]\nसमय: [Time]\nस्थान: [Location]\nमरीज़ अनुमानित: [Patients]\nGoogle Map: [Map]\n\nकृपया उपलब्धता की पुष्टि करें।\n\nधन्यवाद,\nQMS Healthcare',
    mr: 'प्रिय [Name],\n\nतुमच्या नियुक्त कॅम्पसाठी reminder.\n\nकॅम्प: [Camp]\nतारीख: [Date]\nवेळ: [Time]\nस्थान: [Location]\nअंदाजे रुग्ण: [Patients]\nGoogle Map: [Map]\n\nकृपया उपलब्धतेची पुष्टी करा.\n\nधन्यवाद,\nQMS Healthcare',
  },
  wa_diet: {
    en: 'Dear [Name],\n\nReminder for the diet camp you are scheduled for.\n\nCamp: [Camp]\nDate: [Date]\nTime: [Time]\nLocation: [Location]\nGoogle Map: [Map]\n\nPlease confirm.\n\nRegards,\nQMS Healthcare',
    hi: 'प्रिय [Name],\n\nनिर्धारित डाइट कैम्प के लिए रिमाइंडर।\n\nकैम्प: [Camp]\nतारीख़: [Date]\nसमय: [Time]\nस्थान: [Location]\nGoogle Map: [Map]\n\nकृपया पुष्टि करें।\n\nधन्यवाद,\nQMS Healthcare',
    mr: 'प्रिय [Name],\n\nनियुक्त diet कॅम्पसाठी reminder.\n\nकॅम्प: [Camp]\nतारीख: [Date]\nवेळ: [Time]\nस्थान: [Location]\nGoogle Map: [Map]\n\nकृपया पुष्टी करा.\n\nधन्यवाद,\nQMS Healthcare',
  },
  submit_diet: {
    en: 'Dear [Name],\n\nThe diet camp on [Date] ([Camp] · [Location]) is complete. Please upload the patient count, camp photos and report here:\n\n[Link]\n\nThis reminder will repeat every 24 hours until the data is submitted.\n\nRegards,\nQMS Healthcare',
    hi: 'प्रिय [Name],\n\n[Date] का डाइट कैम्प ([Camp] · [Location]) पूरा हुआ। कृपया मरीज़ संख्या, कैम्प फ़ोटो और रिपोर्ट यहाँ अपलोड करें:\n\n[Link]\n\nजब तक डेटा सबमिट नहीं होता, यह रिमाइंडर हर 24 घंटे में दोहराया जाएगा।\n\nधन्यवाद,\nQMS Healthcare',
    mr: 'प्रिय [Name],\n\n[Date] रोजीचा diet कॅम्प ([Camp] · [Location]) पूर्ण झाला आहे. कृपया रुग्ण संख्या, कॅम्प फोटो आणि अहवाल येथे upload करा:\n\n[Link]\n\nडेटा submit होईपर्यंत हे reminder दर 24 तासांनी पुनरावृत्ती होईल.\n\nधन्यवाद,\nQMS Healthcare',
  },
}

export interface TickResult {
  created: number
  dispatched: number
  skipped?: 'holiday'
}

export interface ReminderSummary {
  total: number
  by: Partial<Record<ReminderThreadStatus, number>>
  waSent: number
  waDelivered: number
  waRead: number
  waDeliveryPct: number
  callsPlaced: number
  callsAnswered: number
  callSuccessPct: number
  avgCallDuration: number
  avgResponseMins: number | null
}
