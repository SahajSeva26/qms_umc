// AI Reminders engine — exact port of the prototype's window.QMS_REMIND
// (s:\QMS-Camp-Portal-feature-qms-sales-ops-suite\assets\js\reminders-engine.js).
// TODO: entirely mock/frontend-only — sendWhatsApp()/placeVoiceCall() are the
// prototype's own "provider hooks": simulation-mode bodies to be swapped for
// real Twilio/Exotel/WhatsApp Business API calls later, per the prototype's
// own header comment — not a vague gap, a deliberate swap-point.
//
// STABLE FACADE — this file's path and exports are the feature's public
// service API. The actual engine is decomposed by business responsibility
// under services/ (config, thread data-access, recipients/scheduling,
// templates, channel-provider dispatch, trigger orchestration, analytics —
// see each module's own header for why it's split the way it is). Nothing
// here does any work itself; it only re-exports. Components, pages and the
// useReminders hook keep importing from this exact path — none of them need
// to know the engine lives in services/ underneath.
//
// If you're adding a new engine capability: put its implementation in the
// appropriate services/reminders.*.service.ts module (or a new one if it's a
// genuinely new responsibility), then re-export it here.

export { seeded } from './services/reminders.utils'
export { getConfig, saveConfig } from './services/reminders.config.service'
export { getTemplates, saveTemplates, renderTemplate, buildContext } from './services/reminders.templates.service'
export { getThreads } from './services/reminders.threads.service'
export { campStartMs, recipientsFor } from './services/reminders.recipients.service'
export { sendWhatsApp, placeVoiceCall, ivrToStatus, statusLabel } from './services/reminders.dispatch.service'
export { suggestBackup, tick, manualTrigger, bulkTrigger } from './services/reminders.triggers.service'
export { summary } from './services/reminders.analytics.service'

export type { EngineRecipient } from '@/features/reminders/reminders.types'
