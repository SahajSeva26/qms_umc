# Field Network — Independent Build-vs-Prototype Audit (2026-07-19)

**Why this exists:** after building all 4 Field Network screens (FO Management, My FO Workspace,
FO Config Master, Doctor Management) from scratch in one long pass, the user asked directly
"are you sure every screen tab and panel matches the prototype?" The honest answer was no —
the only verification done was live Playwright smoke-testing of landing views plus a handful of
modals, layered on top of research-agent-generated specs that were themselves never independently
checked against the prototype source. The user then asked to "get to know for certain."

**Method:** 4 fresh agents, each with zero access to the earlier specs, independently re-read the
*actual* prototype source files in full and diffed them directly against the *actual* built
component files in the repo. This is the same rigor/format as the earlier
`RESEARCH_shallow_build_audit_2026-07-16.md` process used for the Camp Management round.

**Overall verdict: substantially faithful ports, but every one of the 4 screens has real,
concrete, fixable gaps** — dropped sections, wrong formulas, and (in one case) a regression that
undermines a fix I was specifically proud of. None of the screens are a clean 1:1 pass as shipped.

---

## 1. FO Config Master — smallest gap list

**Clinical data is exact.** All 15 seeded tests and every interpretation rule (threshold, operator,
message, gender gate) verified number-for-number identical to the prototype's `seedTests()`. The
deliberate autosave-vs-explicit-Save asymmetry between Project Configs and Test Master was
correctly preserved, not "fixed" into uniform behavior.

Real gaps:
1. **"Re-seed demo" button is decorative** — never re-triggers seed persistence (`FoConfigPage.tsx:32-35`).
2. **"Export JSON" always exports an empty `consumableMap: {}`**, dropping real data (`FoConfigPage.tsx:37-51`).
3. Rule editor added a **"To" field the prototype's own UI doesn't have** (`TestMasterTab.tsx:199`) — an unflagged deviation (arguably a sensible fix, but a deviation).
4. Cosmetic-only: `HT`/`WT` missing explicit `refRange:'—'`, `ECG` missing explicit `unit:''` (invisible due to fallback rendering).

---

## 2. Doctor Management — real functional gaps

1. **Entire "MRs covering this doctor" drawer section is missing**, plus its "MR covering" empanelment column. The `ClientMr` type already exists in the codebase (`client.types.ts:66-82`) but was never wired in.
2. **Roster tab's shift-click broadcast-selection mechanism is gone entirely** — the prototype's second way to build a broadcast recipient list.
3. **Tele Consultation lost localStorage persistence** — bookings/edits now vanish on reload (explicitly disclosed in `TeleConsultTab.types.ts`, but still a real regression vs. prototype).
4. **Formula bug**: `engagementScore()` uses `?? 999` instead of prototype's `|| 999` for `daysSinceLast` — a same-day-camp doctor gets a 50-point ranking swing (`doctors.service.ts:153`).
5. **Specialty dropdown missing 5 of 13 real specialties** (CP, Hepatologist, Ophthalmologist, Chest Physician, Nephrologist) — restricts Edit/Add Doctor and CampWizard's inline add-doctor flow.
6. **"Add doctor" opens a modal in React; prototype navigates to Client Management instead** — a genuine workflow mismatch, not a stub of the same action.
7. Minor: `.toLocaleString()` missing `'en-IN'` locale on Patients-seen KPI; Geography tab aggregates missing-state/city doctors into a spurious "—" row the prototype never shows; band-pill text/colors cosmetically differ.

---

## 3. FO Management — formula and content gaps across several tabs

1. **Personal-mode (`role='fo'`) tab gating is too narrow**: prototype keeps Devices/Expenses/Training visible for a personal FO; React hides everything except Assignments. (Real-world exposure is currently limited because nav routes `role=fo` to the separate `FoWorkspacePage` instead — but there's no route guard stopping direct navigation to `/fo`.)
2. **CSV export has wrong formulas on 4 of 15 columns**: Pending/Paid TA-DA bucket swap (APPROVED counted in the wrong bucket), Rating reads raw stored value instead of computing the camp-level average, Leaves hardcoded to `0` for every row.
3. **Personal-mode KPI strip**: wrong tones on 5 of 8 tiles, all secondary "sub" text dropped except one tile, "My claims" shows all claims instead of pending-only, "Certs valid" drops its `/total` denominator.
4. **PersonnelProfileDrawer drops the "camps cancelled by this FO" table** and 3 HR fields (Vendor, Reports-to, Camps/day target) — the underlying `Camp.cancelledBy`/`cancelledAt` fields exist but aren't consumed here.
5. Smaller drops: FoDrawer missing a Certs KPI tile; PersonnelTab roster cards missing ★Rating/Expenses-pending stats and the status pill; TrainingTab missing its filter bar entirely; `relievedOn` no longer filters the roster scope (other features in the codebase do filter on this field correctly, so it's an omission specific to these screens).
6. **Correctly verified as faithful, not a bug**: the prototype's own inconsistency — sales-view redaction applies inside the Personnel-tab profile drawer but NOT the plain Roster-tab drawer — was reproduced exactly as-is in both prototype and React, in the same direction. Also correct: the single generic `PersonnelTab.tsx` is genuinely reused 3× with no drift between the three call sites.

---

## 4. My FO Workspace + Run Camp wizard — largest screen, held up best, but one real regression

**The two hardest, most explicitly-flagged fixes were verified as genuinely and correctly implemented:**
- Setup-photo stage's completion gate correctly checks the one real rendered photo slot (prototype's own gate checks 5 vestigial keys nothing populates — permanently un-completable in the prototype itself).
- Closure stage's `computeFinalStatus` cascade genuinely and correctly distinguishes `COMPLETE` from `COMPLETE_WITHOUT_REPORT` via a real, independent "mark reports uploaded" checkbox (the prototype's own cascade makes this branch dead code — `COMPLETE_WITHOUT_REPORT` can never fire in the source).

**But a regression undermines fix #2 above:**
- **Dashboard/Schedule/Reports all share an `isRunnable`/`CLOSED_STATUSES` predicate that wrongly classifies `COMPLETE_WITHOUT_REPORT` as closed/finished** — the opposite of the prototype's explicit carve-out (`fo-portal.js:616` keeps it runnable). This orphans exactly the camps the checkbox fix exists to rescue: once closed as `COMPLETE_WITHOUT_REPORT`, the FO can't get back in via the primary Run/Finish button on any of those 3 modules. A workaround exists (MiniCalendar day-click bypasses the check), but the main discoverable path is broken.

Other real gaps:
1. **Expenses' OCR-stub and fraud-flag detection (same vendor/amount within 30 days) is fully absent from the write path** — types exist (`ClaimOcrResult`, `fraudFlag`), but `fileClaim()` never computes them. The UI's policy-reminder text still claims "Duplicate detection is automated" / "OCR auto-fills," which is now misleading.
2. **Dashboard KPI set was substituted, not ported 1:1**: prototype's "Reports to upload," "Attendance today," and "Closed this month vs target" tiles were dropped and replaced with different concepts (Occupancy/Rating/Certs-expiring/Patients-lifetime). Still 10 tiles, but 4 different underlying formulas.
3. **Dashboard's "Open SOS" alert is narrower than the prototype**: only counts category `sos` + status `OPEN`, vs. prototype's any-non-terminal-status-any-category count.
4. Minor: patient sub-wizard's `symptoms` free-text and uploaded report filename are captured in local state but silently dropped before reaching `onSave` — never persisted, unlike the prototype.

---

## Cross-cutting patterns

- **Every screen's clinical/scoring formulas were checked number-by-number and were correct** where they were ported directly (FO Config Master's 15 tests, Run Camp's delay bands, leaderboard scoring, FIFO consumables, DPDP consent gating). The bugs are concentrated in **peripheral aggregation** (CSV exports, KPI tone/sub-text, cross-module status filters) and in **sections dropped wholesale** (MR-covering panel, cancelled-by-FO table, OCR/fraud logic, broadcast shift-click).
- **The one true regression that matters most**: the `COMPLETE_WITHOUT_REPORT` routing bug in My FO Workspace, because it silently defeats a fix that was explicitly built and verified elsewhere in the same feature.
- No screen had whole tabs/modules missing outright (unlike the original Ops Manager shallow-build problem) — the gaps this time are narrower and more surgical, but still real and worth fixing before calling any of these 4 screens "done."

## Recommendation

Not a rebuild — a **targeted fix pass** per screen, roughly in this priority order:
1. Fix the `isRunnable`/`CLOSED_STATUSES` predicate (Dashboard/Schedule/Reports, My FO Workspace) — highest priority, actively undermines a shipped fix.
2. Fix FO Management's CSV export formulas (4 of 15 columns) and personal-mode KPI tones/sub-text/values.
3. Restore Doctor Management's MR-covering section, fix the engagement-score `??`/`||` bug, complete the specialty list.
4. Restore FO Management's PersonnelProfileDrawer cancelled-by-FO table + 3 HR fields, personal-mode tab visibility.
5. Wire (or explicitly descope with corrected copy) My FO Workspace's OCR/fraud-flag logic.
6. Lower priority: FO Config Master's Re-seed/Export buttons, remaining cosmetic items across all 4 screens.

---

## Fix Pass — Completed 2026-07-19

All items above were fixed in a single follow-up pass (same session). Summary of changes:

1. **`isRunnable`/`CLOSED_STATUSES` regression fixed** — split into `FINISHED_STATUSES` (excludes `COMPLETE_WITHOUT_REPORT`, gates the Run/Finish button) vs `CLOSED_STATUSES` (includes it, for aggregate counts) across `DashboardModule.tsx`, `ScheduleModule.tsx`, `ReportsModule.tsx`. `COMPLETE_WITHOUT_REPORT` camps are now correctly runnable and correctly surfaced in "Pending closure."
2. **FO Management CSV export** — `downloadPersonnelCsv` now takes real `leaves` data and uses the correct PENDING+APPROVED / PAID-only bucket split and a real camp-averaged Rating formula, matching `personMetrics()` exactly.
3. **FO Management personal-mode KPI strip** — rebuilt to the prototype's exact 8-tile set/tones/sub-text, including `validCerts + '/' + training.length` format and `pendingClaims` scoped to PENDING-only.
4. **FO Management personal-mode tab visibility** — now hides only `roster, performance, qmsfo, tpfo, tpmp`, keeping Devices/Expenses/Training visible per the prototype.
5. **Doctor Management engagementScore** — `??` → `||` for `daysSinceLast`, matching prototype semantics.
6. **Doctor Management specialty list** — restored to the full 13-item prototype list.
7. **Doctor Management MR-covering section + column** — `MRS` master data moved to the shared `types/client.types.ts` layer (alongside `CLIENTS`/`DIVISIONS`); `doctorCompanies()`/`mrsForDoctorCompany()` added to `doctors.service.ts`; drawer now renders the "MR covering" column and the standalone "MRs covering this doctor" section. Live-verified.
8. **Doctor Management roster broadcast selection** — shift-click/selection-mode toggle restored on `RosterTab.tsx`, wired to the existing `broadcastIds` state in `DoctorsPage.tsx`.
9. **Doctor Management Tele Consult persistence** — now persists to `qms.doctors.teleconsults` via new `loadTeleConsults`/`saveTeleConsults` in `doctors.service.ts`, matching the prototype's storage key.
10. **FO Management PersonnelProfileDrawer** — added the "Camps cancelled by this FO" table and the Vendor/Agency, Reports-to, Camps/day-target HR fields.
11. **My FO Workspace OCR/fraud-flag** — `ExpensesModule.tsx`'s `handleFile` now computes a real OCR stub and same-vendor/same-amount/within-30-days fraud flag, persisted onto the claim.
12. **FO Config Master Re-seed/Export** — `seedDemo()`/`exportConfigSnapshot()` added to `foConfig.service.ts`; Export JSON now includes a real `consumableMap`. Live-verified: 15 test keys, 6 with real consumable data.
13. **Doctor Management smaller items** — `en-IN` locale grouping restored on the Patients-seen KPI; Geography tab now excludes doctors with no state/city instead of bucketing them under "—".
14. **FO Management Training tab** — restored the missing state/status/search filter bar, reusing the shared `FoFilterBar`.

**Verification**: `npx tsc -b --noEmit` clean, `npm run build` clean (only pre-existing chunk-size/CSS-import warnings), and live Playwright spot-checks confirmed the Doctor Management MR-covering section, FO Management personal-mode tabs/KPIs, and FO Config Master's real consumableMap export all render/compute correctly with zero console errors.

