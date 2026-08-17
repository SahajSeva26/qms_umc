// Dashboard KPI aggregation over an already-fetched thread list. Pure
// function, no persistence, no dependency on any other Reminders service —
// genuinely independent of thread creation/dispatch/templates.

import type { ReminderThread, ReminderThreadStatus, ReminderSummary } from '@/features/reminders/reminders.types'

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
