# Coverage & Alerts round — build + independent audit + fix pass (2026-07-20/21)

Scope: the 3 previously-stubbed "Coverage & Alerts" nav screens — **HQ Mapping & Serviceability** (`/admin/hq`), **Incidents · SOS** (`/om/incidents`), **AI Reminders** (`/admin/reminders`). All 3 were either a dangling link with no feature folder (HQ Mapping) or aliased to an unrelated placeholder page (Incidents, Reminders) before this round.

Same methodology as the Field Network (2026-07-19) and Dietitians (2026-07-20) rounds: research the real prototype source in full → build shared foundational data/service layers → build all 3 pages in parallel against those layers → **independently audit** by dispatching fresh agents with zero access to the build specs to re-read the actual prototype and diff against the actual built files → fix every real finding → re-verify.

## What was built

- **Shared HQ/geo engine** (`features/hq/{hq.types,hq.service,cityGazetteer,hq.mock}.ts`) — Haversine distance, a 90-city gazetteer, the 4-tier `classifyHq()` engine (GREEN/YELLOW/ORANGE/RED, 35/50km thresholds, 80% FO-load cutoff, device-match tie-break), the deliberately distinct 3-tier `classifyCity()` (Mapping drill-down/bulk-check), the deliberately distinct bulk-check status vocabulary (SERVICEABLE/NON-SERVICEABLE/UNKNOWN CITY), and `buildExpansion()` (the AI expansion recommender).
- **HQ Mapping & Serviceability page** (`features/hq/pages/HqPage.tsx` + 11 tabs under `components/hqmapping/`) — admin/sales/ops/coord/map/mapping/hq/fo/bulk/reports/ai, an SVG map, the Company→Division→HQ drill-down, bulk city-check tool, AI recommendations panel.
- **Shared incidents extensions** (additive changes to the existing `features/fo/{fo.types,fo.service}.ts` + `hooks/useFo.ts`) — richer `Incident` lifecycle fields, `INCIDENT_CATEGORIES` SLA table, `SEVERITY_COLORS`/`STATUS_COLORS`, a machine fault-flagging sub-service (`isMachineFaulty`/`flagMachineFaulty`/`clearMachineFlag`/`suggestReplacement`), new assign/start/resolve/close/cancel mutations, `computeSlaState()`.
- **Incidents · SOS page** (`features/om/pages/IncidentsPage.tsx` + components under `components/incidents/`) — Kanban board, a deliberately filterless All-tickets table, a Faulty Machines tab, a Camps-on-hold dialog, an OM-side Raise Ticket modal, proper shadcn-dialog assign/resolve/close/cancel actions (no native `confirm()`/`prompt()`).
- **Shared AI Reminders engine** (`features/reminders/{reminders.types,reminders.service}.ts` + `hooks/useReminders.ts`) — **rebuilt twice this round** (see Fix Pass below); the final version is an exact port of the prototype's `window.QMS_REMIND` (`reminders-engine.js`).
- **AI Reminders page** (`features/reminders/pages/RemindersPage.tsx` + 4 tabs) — Dashboard, Camp Timelines (+ detail drawer), Triggers, Templates & Settings.

All 3 pages route-wired (`ADMIN_ROUTES.ADMIN_HQ`, `OM_ROUTES.OM_INCIDENTS`, `ADMIN_ROUTES.ADMIN_REMINDERS`), replacing the prior placeholder/aliased routing. A cross-cutting seed-data gap was also fixed during integration: `types/people.mock.ts`'s `DEVICE_CATALOG` had no `type` field set, which meant every FO's `deviceTypes` came out empty and `classifyHq()` could never actually resolve GREEN against real seed data — fixed by setting `type`/`status`/`vendorCity`/`vendor`/`nextCalibration` on all 8 seeded devices.

## Independent audit — findings and verdicts

Three fresh agents, each blind to the build specs, re-read the real prototype source (`hq-mapping.js`/`hq-serviceability.js`; `incidents.js`/`incidents-data.js`/`machine-replacement.js`; `reminder-automation.js`/`reminders-engine.js`) and diffed line-by-line against the built React files.

### AI Reminders — CRITICAL, systemic (fully rebuilt)

The initial build's shared engine did not port `reminder-automation.js`/`reminders-engine.js` at all — it implemented an invented domain model that happened to share surface-level UI chrome (tab names, KPI layout) with the real prototype while getting almost every underlying rule wrong:

| | Built (wrong) | Real prototype |
|---|---|---|
| Recipients | MR / DOCTOR / FO / DIETITIAN | **FO / Dietitian only** — no MR/Doctor concept in this engine |
| Statuses | PENDING/SENT/DELIVERED/READ/CONFIRMED/DECLINED/NO_RESPONSE/ESCALATED | **SCHEDULED/IN_PROGRESS/CONFIRMED/DELAYED/NOT_ATTENDING/NO_RESPONSE/ESCALATED/COORDINATOR_CONNECTED** |
| Template families | camp_confirm/camp_reminder_24h/camp_reminder_2h/doctor_confirm/fo_dispatch | **voice_fo/voice_diet/wa_fo/wa_diet/submit_diet** |
| Placeholders | `{{curly}}` | **`[Square][Bracket]`** |
| IVR keys | 3-way (confirm/decline/no-response) | **4-way** (1 confirm, 2 delayed, 3 not attending, 4 coordinator-connected) |
| Scheduling | invented rolling "hours-until" bands | **absolute per-stage trigger timestamps** (`startMs - leadMin*60000`) |
| Escalation | time-aging poll (`autoEscalateAfterMin`) | **call-attempt-exhaustion** (`escalateAfterCalls`, synchronous, no polling) |
| `submit_diet` (post-camp dietitian nag, repeats daily 30 days) | **missing entirely** | live, wired, reachable every tick |

**Fix**: `reminders.types.ts` and `reminders.service.ts` were rewritten from scratch as an exact, function-by-function port of `reminders-engine.js` (confirmed by direct line-by-line reading, not by trusting the prior build's self-report) — correct recipients, statuses, template families (all 5, including `submit_diet`), `[Square]` placeholder syntax, the real WhatsApp/IVR simulated-outcome probabilities, the real call-attempt-exhaustion escalation logic, and the real `tick()`/`manualTrigger()`/`bulkTrigger()`/`suggestBackup()` signatures. All 5 UI components + the page shell were then rewritten against the corrected engine by a fresh build pass. Re-verified clean (`tsc -b --noEmit --force`, `npm run build`).

### Incidents · SOS — 4 real findings, fixed

1. **SLA/severity table diverged on 4 of 7 categories** (High) — `sos` was 15min (real: 10), `consumable_shortage` was MED/240min (real: HIGH/60min), `gps_fraud` was MED (real: HIGH), `other` was 480min (real: 1440min/24h). Fixed: `INCIDENT_CATEGORIES` in `fo.types.ts` now an exact transcription of `incidents-data.js`'s `CATEGORIES` table, including exact hex severity/status colors.
2. **Drawer's "preserved bug" referenced a nonexistent field** (Medium) — the built code copied the prototype's broken template-literal (`incidents.js:241`, `${...}` inside a single-quoted string) but rendered it unconditionally and referenced `t.replacement.km`, a field that doesn't exist anywhere on this codebase's `Incident` type (only in the prototype's own richer `{device, km, reason}` shape). Fixed: since this app's device/replacement model has no distance concept at all, the fake km-suffix was removed rather than fabricating a field just to reproduce a cosmetic prototype typo.
3. **`campOnHold` stored field was wired but never settable to `true` anywhere** (Low-Medium) — dead code; the dialog's real "on hold" detection (faulty-device cross-reference) already worked correctly and matches the prototype's actual mechanism. Fixed: removed the dead field/mutation/hook entirely rather than fabricate a trigger condition that doesn't exist in the prototype.
4. **Inconsistent bug-preservation choice** (Low, no functional issue) — one analogous broken-template-literal bug in the Raise Ticket modal was fixed rather than preserved, while the drawer's was (partially) preserved. Noted for consistency; no further action taken since the fixed behavior is strictly better and the drawer bug is now also removed (see #2).

### HQ Mapping & Serviceability — 2 real findings, fixed

1. **`activeFos()` silently dropped FOs with unresolvable coordinates** (Medium-High) — an FO whose `hq` city isn't in the 90-city gazetteer (and has no explicit `lat`/`lng`) vanished entirely from FO Master, KPI counts, and the load-distribution table, instead of appearing with a "NO COORDS" flag as the prototype does (`hq-serviceability.js:239-263` returns every active FO regardless of geocoding success; only ranking/GREEN-eligibility skip no-coords FOs). Fixed: `GeoFo.lat`/`lng` reverted to optional, `activeFos()` no longer filters its return value, and the 2 UI consumers (`HqMapSvg.tsx`, `FoMasterTab.tsx`) now null-guard the plot/display instead of relying on the data already being filtered upstream — `FoMasterTab.tsx` already had a correct "NO COORDS" pill, it just never got a chance to render.
2. **`AdminTab`'s MR-serviceability rollup used an "any discipline" criterion** instead of the prototype's per-project, discipline-specific check (Low-Medium) — `hq-serviceability.js:214-231`'s `mrProjectRows()`/`mrServiceableForType()` scopes serviceability to *that project's own camp type* (screening/diet/lab), not "any of the three." Fixed: rebuilt `buildProjectRollups()` against the app's real `ClientProject` master (`features/crm/clients/clients.mock.ts`'s `PROJECTS`, already used elsewhere in the app, e.g. `dietitians.service.ts`) with the correct per-project `mrServiceableForType()` check, and relabeled the table "by project" instead of "by division."

## Verification

- `npx tsc -b --noEmit --force` (full non-incremental) — clean, zero errors, after every fix.
- `npm run build` — clean, only pre-existing/unrelated warnings (Google Fonts `@import` order, bundle chunk-size advisory).
- Live Playwright verification was run successfully once, before the audit fixes (all 3 screens PASS'd — page loads, all tabs render real data, an OM-side raise-ticket write-path confirmed end-to-end, the GREEN-classification data-seed fix confirmed live). **A second live spot-check targeting the specific post-audit fixes (esp. the rebuilt Reminders engine) could not be completed** — no browser-automation tool was available in the session at that point. This is a real, disclosed gap: the Reminders engine rebuild in particular has only been verified via `tsc`/`build` + direct code-reading against the prototype source, not via a live browser pass. **Recommend a live Playwright spot-check of `/admin/reminders` specifically before considering this round fully closed** — earlier rounds' experience is that structural rewrites (as opposed to narrow formula fixes) are exactly the kind of change most likely to hide a runtime-only bug that typechecking can't catch.

## Second-round recheck (2026-07-21, later same day)

The user asked for the same fixes to be independently rechecked. Dispatched 3 more fresh agents — zero access to this document or any prior claims — to re-verify each claimed fix against the real prototype source AND do a fresh sweep for anything new. Given the first round's critical failure, the Reminders recheck agent was explicitly instructed to treat the rebuild with maximum skepticism.

**HQ Mapping**: Claim 1 (activeFos no-coords fix) — **CONFIRMED FIXED**, no issues. Claim 2 (MR-serviceability discipline fix) — **PARTIALLY FIXED**: the underlying logic and `PROJECTS` wiring were genuinely correct, but `AdminTab.tsx`'s rollup table had silently dropped the Company and Type columns the prototype shows, and stored a raw unresolved `clientId` instead of a real company name. **Fixed**: `buildProjectRollups()` now resolves the client name via `CLIENTS`, and the table renders Company + Type columns. Fresh sweep of `classifyHq`/`classifyCity`/`buildExpansion`/role-gating/the map-ring found nothing further — the map-ring was noted as an actual improvement over the prototype (parameterized on `radiusKm` instead of a hardcoded `35`).

**Incidents · SOS**: all 4 original fixes — **CONFIRMED FIXED**, re-derived independently against `incidents-data.js`'s real 7-row table and `machine-replacement.js`'s real hold-detection logic, zero orphaned `campOnHold` references anywhere in the frontend. Fresh sweep found **1 new, pre-existing bug** untouched by the original fix pass: `RaiseSosModal.tsx` (the FO-side raise-ticket modal) had its own hardcoded `severityFor()` function duplicating (and drifting from) the real category/severity table — `consumable_shortage`/`patient_escalation`/`gps_fraud` all fell back to `MED` instead of the correct `HIGH`, and the category dropdown was also missing `inventory_mismatch` entirely (6 of 7 real categories). **Fixed**: both the option list and `severityFor()` now derive directly from the shared `INCIDENT_CATEGORIES` table instead of a separate hardcoded copy, so they can't drift again.

**AI Reminders** (the highest-stakes recheck, given the first audit's critical finding here): all 8 core domain-model claims — recipients, statuses, template families/text (word-for-word bilingual diff), placeholder syntax, IVR probability weights, scheduling/trigger math, escalation mechanism, `suggestBackup()`/`summary()` — were **CONFIRMED CORRECT**, with a clean regression grep for any leftover old-vocabulary references. This really is now a faithful, line-for-line port. However, the recheck found **2 new bugs introduced by the rebuild** that a shallow pass would have missed (both passed `tsc` cleanly):
- The Triggers tab's "Run tick" button was decorative — it only showed a success toast and never actually called the engine's `tick()`. **Fixed**: wired through `useReminderThreads()`'s real `runTick()`, now reports the actual number of newly-created threads.
- `ReminderThread.clientName` was never resolved to a real client name — it just echoed the raw `clientId`. **Fixed**: added a `clientName()` lookup against the shared `CLIENTS` master, matching the prototype's own `clientName()` helper exactly.
- (Cosmetic, fixed anyway) The template preview in Templates & Settings hardcoded a fake date/time string instead of running the real `buildContext()`/`campStartMs()` code path the prototype's own preview uses. Now builds a real sample `Camp` and calls the actual `buildContext()`, so the preview exercises the same formatting logic as real dispatch.

All fixes reverified: `npx tsc -b --noEmit --force` and `npm run build` both clean.

**Live browser verification could still not be completed** — no browser-automation tool was available in either the original build session or this recheck session. This remains the one real, disclosed verification gap for this entire round: everything has been verified via independent code-level audit (now twice) plus typecheck/build, but never via an actual running browser. If a browser tool becomes available, `/admin/reminders` should be the priority spot-check given its structural rewrite.

## Disclosed simplifications (not defects)

- HQ Mapping's Excel/CSV import (HQ Master, FO Master, Bulk City Check) is stubbed with a toast, matching this codebase's existing convention (`BulkUploadCampsModal.tsx`) rather than adding a new `xlsx` dependency unilaterally; paste-based entry works end-to-end.
- HQ Mapping's Reports tab PDF export uses `window.print()`, matching the prototype exactly (no PDF library needed).
- The flat, non-latitude-corrected 35km map-ring approximation and `saveConfig()`'s dead override mechanism are preserved as-is, per the prototype's own design (not bugs).
- Incidents' All-tickets tab has genuinely zero filters, matching the prototype exactly (verified directly against `incidents.js`, not assumed).
