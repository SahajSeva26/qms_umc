// Reminder engine configuration — on/off, language, channels, SLA/lead-time
// settings. Owns KEYS.CONFIG.
// TODO: replace with real API calls once backend endpoints exist.

import type { ReminderConfig } from '@/features/reminders/reminders.types'
import { DEFAULT_CONFIG } from '@/features/reminders/reminders.types'
import { KEYS, load, persist } from './reminders.storage'

export function getConfig(): ReminderConfig {
  return { ...DEFAULT_CONFIG, ...load(KEYS.CONFIG, {} as Partial<ReminderConfig>) }
}

export async function saveConfig(patch: Partial<ReminderConfig>): Promise<ReminderConfig> {
  const next = { ...getConfig(), ...patch }
  persist(KEYS.CONFIG, next)
  return next
}
