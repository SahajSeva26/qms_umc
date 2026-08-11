// Reminder thread persistence/data-access. Owns KEYS.THREADS.
//
// loadThreads()/saveThreadsInternal() are exported for use WITHIN
// features/reminders/services/ only (reminders.triggers.service.ts reads and
// mutates the thread list as part of tick()/manualTrigger()/bulkTrigger()) —
// they were never part of the public service API and the facade
// (reminders.service.ts) does not re-export them, preserving the exact same
// encapsulation the original single-file service had.
// TODO: replace with real API calls once backend endpoints exist.

import type { ReminderThread } from '@/features/reminders/reminders.types'
import { KEYS, load, persist } from './reminders.storage'

export function loadThreads(): ReminderThread[] {
  return load(KEYS.THREADS, [])
}

export function saveThreadsInternal(list: ReminderThread[]) {
  persist(KEYS.THREADS, list.slice(0, 800))
}

export async function getThreads(): Promise<ReminderThread[]> {
  return loadThreads()
}
