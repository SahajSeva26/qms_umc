// Channel provider hooks — simulation-mode bodies to be swapped for real
// Twilio/Exotel/WhatsApp Business API calls later, per the prototype's own
// header comment. Isolated in their own module (not inline inside
// reminders.triggers.service.ts, which calls them) so that future swap is a
// change to exactly this one file — the rest of the engine (thread creation,
// scheduling, templates) is unaffected, since it only ever sees this
// module's return shapes, never how a send/call is actually carried out.
//
// ivrToStatus()/statusLabel() live here too: they interpret what a voice
// call's result means for the thread, which is the direct counterpart to
// placeVoiceCall() producing that result — send/receive semantics for the
// same channel.

import type {
  ReminderThreadStatus, CallResult, WaResult,
} from '@/features/reminders/reminders.types'
import { STATUS_LABELS } from '@/features/reminders/reminders.types'
import { seeded } from './reminders.utils'

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
