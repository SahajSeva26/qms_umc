# Shallow-build audit — Diet Camps / Dedicated Ops / Camp Management / Teleconsultation Camps
_Saved 2026-07-16, updated 2026-07-16 (all 4 audits now complete). Context: after fixing the same problem across all 11 Ops Manager tabs (see PROGRESS.md Session Log), all 4 of these screens were audited against their prototype source. All 4 were confirmed to have real gaps._

**⚠️ UPDATE 2026-07-18 — UI-only shells for every finding below have now been built and live-verified.** See PROGRESS.md's 2026-07-18 Session Log entry for the full list of 11 new components. Every gap in the "Tier 1"/"Tier 2" consolidated priority view at the bottom of this file now has a corresponding shell — the wizard, bulk-upload, cancellation engine, close-out modal, reminders modal, resource-assignment modal, the 2 missing Diet Camps modals, the dietitian enrollment+detail views, the media-upload flow, and the Dedicated Ops project drawer all exist and render correctly with every field from the prototype. **What is NOT done**: none of these shells persist anything — every save/submit is a stub toast. The "Tier 3" dead-button/wrong-formula items (e.g. Diet's Tele-Dietitian book-modal having 7 of 8 fields hardcoded, KPI tiles not being clickable, the Reminders tab's Declined path) were NOT addressed in the 2026-07-18 pass — that pass built new UI for entirely-missing pieces, it did not go back and fix smaller pre-existing interaction bugs on already-existing UI. If resuming this work, the next step is wiring the 11 new shells to real `*.service.ts` persistence, THEN sweeping the remaining Tier 3 items.

**Scope note (confirmed with user):** only these 4 screens (built during the "Operations" sidebar-section session) are in scope for this rebuild pass — not a whole-app audit.

---

## 1. Dedicated Ops — AUDIT COMPLETE

**Verdict: NOT built as shallow as Ops Manager was.** Reasonably faithful port (service layer even cites prototype line numbers in comments), but not gap-free.

**Scope clarification:** `dedicated-ops.js` (489 lines) + `dedicated-data.js` (526 lines) power `pages/dedicated-ops.html` — the 4-tab Ops-Manager-facing console (Projects / Live FOs / Compliance / SOP Configuration). This is what `features/dedicatedops/` implements. `dedicated-fo.js` (662 lines) + `dedicated-fo.html` is a **separate, distinct screen** — the FO's own mobile daily workspace — out of scope, no React equivalent exists yet, flag separately if ever needed.

**Line-count:** prototype ~1015 lines vs React ~1107 lines total — comparable overall, though real comparable logic (excluding legitimately-out-of-scope FO-portal DPDP/consent code) is ~857 vs 464 — "mostly-faithful but somewhat compressed."

### Concrete gaps (most → least severe)

1. **Project drawer/detail view — entirely missing.** Prototype `window.doOpenProject` (dedicated-ops.js:145-209): clicking a project row opens a slide-in drawer with project header, "Manpower requirement" have/need panel, "Assigned FOs" roster (avatar, doctor/clinic, live check-in/out pill, inline unassign), "SOP summary" panel, "Edit SOP" deep-link button. React: table rows aren't clickable at all, no drawer component exists. Per-FO unassign only exists on the Live FOs tab, not reachable from Projects.
2. **"Nudge" button is dead.** Prototype `window.doNudgeFo` (dedicated-ops.js:374-377) fires a real toast. React `DedicatedOpsPage.tsx:261` — `<Button>Nudge</Button>` has no `onClick` at all.
3. **Live FOs tab KPI row — entirely missing.** Prototype `tabLive` (dedicated-ops.js:310-316) renders 4 tiles: Active FOs (checked in), Closed today, No check-in, Today's screenings. React's `tab === 'live'` block renders only the table.
4. **Projects-tab KPIs: 2 of 4 are wrong/substituted metrics, all sub-captions dropped.** Prototype (dedicated-ops.js:84-87): "Dedicated projects", "Assigned FOs", "Screenings to date", "Active today" (each with a `sub` caption). React (`DedicatedOpsPage.tsx:119-122`): "Dedicated projects", "FOs deployed", then "Fully compliant" and "Overdue" — those last two are Compliance-tab metrics, wrongly duplicated here; real screenings-to-date/active-today never shown. `KpiTile`'s `sub` prop exists but is never passed.
5. **Projects table "Status" column shows a duplicate metric, not real project status.** Prototype (line 74): shows `p.status` lifecycle pill (LIVE/PAUSED/other). React (`DedicatedOpsPage.tsx:154`): re-shows the fill-rate pill (already shown via progress bar 2 columns over) — real `Project.status` never rendered.
6. **Fill-rate formula wrong when `required === 0`.** Prototype (lines 66-67): 0-required-but-staffed projects show 100%/filled. React (`DedicatedOpsPage.tsx:139`): always 0% when required is 0 — incorrectly "Understaffed".
7. **"Convert project to Dedicated" — no eligible-projects guard, helper copy dropped.** Prototype (lines 103-109, 121) toasts + refuses to open modal if zero eligible; shows default-SOP helper text. React opens modal unconditionally, no helper text.
8. **Assign-FO modal "currently on X" hint condition narrower than prototype** (cosmetic). Prototype (lines 218-222) shows hint for any existing assignment; React (`AssignFoModal.tsx:59-64`) suppresses if already on the same project.
9. **SOP tab is a genuinely faithful field-for-field port** (not a gap) — all ~12 fields verified matching. React additionally adds a "Manpower required" panel not in the prototype's SOP tab (reasonable compensating addition for gap #1, but required-only, no live fill count).
10. **CSV export column sets match** (not a gap) — only difference is no post-export confirmation toast (cosmetic).

---

## 2. Diet Camps — AUDIT COMPLETE

**Verdict: shallow-built, same defect class as Ops Manager and Camp Management.** Better than Camp Management in one respect (KPI tile set, camp card grid, cancellation-charge math, close-out formula, and 2 modals really were ported with matching formulas), but **3 entire prototype subsystems were dropped wholesale** (invite-dietitians modal, assign/rate-sheet modal, media upload), the flagship full-page camp-detail view was reduced to a stub drawer missing most sections, and the Dietitians tab is fully dead/read-only.

**Line-count:** prototype = 2,896 lines (`diet-camps.js` 2,255 + `diet-invite-modal.js` 213 + `diet-rates-modal.js` 428, all loaded by `diet-camps.html` and wired into diet-camps.js's assign/invite flows). React = 1,541 lines across 18 files — 53%. Two entire prototype files (641 lines, 100% of the invite + rate-sheet modals) have **zero** React counterpart.

### Global chrome (outside the 6 tabs)
| Gap | Prototype | Ours | Severity |
|---|---|---|---|
| AI banner "Diet copilot" | `diet-camps.html:37-44` + `renderAi()` (diet-camps.js:567-585) — computes unassigned-request count, camps within 48h awaiting confirmation, dietitians not interviewed/missing resumes | Not present in `DietPage.tsx` | Missing section |
| "Auto-assign" button | `diet-camps.html:43` | Not present | Cosmetic (dead in prototype too) |
| KPI tiles clickable → filter jump | `diet-camps.js:541-565` `dcOpenStatus()` | `KpiTile.tsx` has no `onClick` prop at all | Dead tile |
| Import/Export buttons | `diet-camps.html:31-32` | Not present | Cosmetic (dead in prototype too) |

### Tab 1 — Diet Camps
- **Camp detail is a full in-place page in the prototype, not a drawer.** `pageCampDetail()` (diet-camps.js:1301-1629): hero, missing-primary-role banner, stage timeline, Camp Particulars, Client & Project section, Team (dietitian+FO+labtech+manpower+doctor for Mixed projects), Patient Count w/ turnout %, Devices (camp-allocated + dietitian-carried), full reminder/confirmation log grid inline, Cancellation section, **Close-out report section**, Media gallery with upload, full action bar. Ours: `DietCampDetail.tsx` (155-line `SideDrawer`) only has status pill, one-line client/div/city/date, cancellation banner, dietitian-only team, bare patient count, plain device-ID list, notes, Mark Live/Close/Cancel. **Missing majority of section content.**
- **"Invite dietitians" flow — entirely missing** (whole `diet-invite-modal.js`, 213 lines, zero port): ranked shortlist w/ last remuneration/rating/same-doctor-history/BCA status/doctor-preferred pin, multi-select, WhatsApp-invite simulation, accept/decline recording.
- **"Assign/Edit team" rate-sheet flow — entirely missing** (whole `diet-rates-modal.js`, 428 lines, zero port): two-step ranked picker → rate sheet (Remuneration/TA/Printing/Target cost pre-filled from history, edit-triggers-mandatory-reason, live PO-cost variance banner, rate-history trend table, BCA gate, OM-approval gate). Our `AssignTeamModal.tsx` (77 lines) only implements the **prototype's own degraded fallback path** (explicitly commented in the prototype as "used only if the shared modal script failed to load") — not its primary flow.
- **"Online assessments & diet plans" — dead button.** Prototype `dcOpenAssessments`/`dcNewAssessment` (diet-camps.js:716-805): per-patient BMI/diet-plan capture form. Ours: types/service plumbing exists (`OnlineAssessment`, `addAssessment`) but no component renders it; the card's button opens the wrong (plain) drawer; `assessmentCount` is hardcoded to `0`.
- Patient-count modal missing "Entered by"/"Note" fields — hardcoded instead of user-entered.
- `dietViewOnly()` toast-messaging on blocked actions — cosmetic gap only (buttons are hidden instead, functionally similar end-state).

### Tab 2 — Dietitians (confirms + expands the original partial finding)
- No state filter dropdown, no search box.
- **"Enrol dietitian" button — entirely missing** (`dcAddDietitian()` full enrollment form: code/name/email/phone/qualification/resume/interviewed/status/remuneration/TA/DA/printing/address/gmap/state/city/machines-assigned).
- **Card click → dietitian detail drawer — entirely missing** (`dcOpenDietitian()`: avatar, contact block, Commercials-per-camp block with **total per-camp cost**, machines-assigned chips, **camp history table** last 12 camps w/ click-through). Confirmed: cards have zero `onClick`.
- Per-camp cost tile shows raw `remuneration` only, not the correct summed formula (`remuneration+ta+da+printing`).
- Missing devices-count stat tile on card.
- No edit-existing-dietitian path (since no create path exists either).

### Tab 3 — Tele Dietitian
- No status-pill filter strip, no search box, no 4-tile KPI row (Today/Scheduled/Completed/No-shows).
- No "Start" (join room) action — separate from Complete in the prototype.
- **Book modal has only a patient-name field** — phone/condition/dietitian-choice/date/time/mode/client are all hardcoded defaults, vs. the prototype's 8-field form.
- Complete modal (notes + diet plan) is faithfully ported — OK.

### Tab 4 — Devices
- **Dietitian × device matrix table — entirely missing** (`tabDevices()` diet-camps.js:1116-1147: row per dietitian, device chips, "Manage" button → edit form, name click → drawer) — roughly half the tab's content, including the only per-dietitian device-management entry point.
- KPI tiles + usage bars are faithfully ported — OK.

### Tab 5 — Reminders
- Camp header not clickable (prototype opens full camp detail).
- Missing explanatory copy line.
- Recipient display shows only role key, not resolved assignee name (or manpower count).
- Only 2 of 3 actions exist (Send, Confirm) — **no Declined path reachable via UI at all**, though the type supports it.

### Tab 6 — Media
- **No upload capability anywhere** — `dcAddMedia()` modal (type/uploaded-by/URL/caption) has zero React equivalent; this is the prototype's *only* way to add media, entirely absent.
- Media items not clickable to open full-size.
- **Actual photo/video is never rendered** — generic icon placeholder shown instead of the real `item.url` image/video.
- Missing "camps without media" warning callout section.
- Scope logic narrower: prototype computes the eligible universe (LIVE+COMPLETED camps) then splits with/without media; ours only ever shows camps that already have media, so the "missing media" callout can't even be computed.

### Formula/business-logic fidelity (for balance — what's genuinely correct)
- `dietStage()` — exact port.
- Cancellation-charge engine (24h threshold, 50%×₹5,000) — exact port.
- Close-out formula (55/45 gender split, 40/30/20/10 risk bands) — exact port.
- `bmiOf`/`bmiBand` — ported but orphaned (nothing calls it, since assessments UI doesn't exist).
- Invite-ranking algorithm, rate-sheet PO-variance/rate-history/BCA-gate/approval-gate logic — **not ported at all**, exclusively lived in the two entirely-missing modal files.

### CSV/export
Prototype's Export button is dead in the prototype itself (no `onclick`) — not a regression, don't prioritize.

---

## 3. Camp Management — AUDIT COMPLETE

**Verdict: shallow-built, same pattern as Ops Manager.** The camp-detail/dossier view (`camp-detail.js`, 894 lines) is a genuine bright spot — ported with unusual fidelity, all 18 sections present, correct pharma/internal redaction. But the main list screen (camps.js 1235 + camps-manager.js 1110 = 2345 lines of real behavior) was reduced to a shell with cosmetic buttons and no backing logic.

**Line-count:** prototype core logic (camps.js+camps-manager.js+camps-data.js+booking-window.js, excluding the well-ported camp-detail.js) = 2,586 lines. Our entire `features/camps/` = 1,828 lines, of which the dossier alone is ~750 — meaning the list/wizard/lifecycle side is only ~1,000 lines against 2,586 equivalent prototype lines, under 40%.

### Confirmed gaps
1. **No camp wizard / booking modal at all.** Prototype `window.openCampWizard` (camps.js:726-757), full 4-step wizard `renderWizard` (camps.js:916-1153): Doctor step (+ inline "add new doctor"), Project & Type step (client/division/project/MR/ASM-auto/RSM-auto/camp-type chips/teleconsult toggle), Slot & FO step (date w/ booking-window hint, slot, city/state, FO), Devices & Confirm step (device chips, review, notes, consent path). Ours: zero occurrences of `openCampWizard`/wizard anywhere; `CampsPage.tsx:96-103`'s "New Camp" button has **no `onClick` at all** — dead button. **Largest single gap** — an entire ~240-line 4-step wizard.
2. **No bulk upload (historical camps import).** Prototype `window.openBulkUploadCamps` (camps.js:840-914), `downloadBulkTemplate()` (XLSX template gen), `processBulkRows()` (maps rows→CLOSED camps, resolves client/division/project/doctor/MR by name). Ours: zero occurrences — even though `Camp` type already carries `thirdParty`/`executedBy`/`source:'BULK_HISTORICAL'` fields nothing ever writes them.
3. **No project filter.** Prototype `renderFilterBar()` (camps.js:265-305) has 9 controls incl. `cf-prj` project dropdown (camps.js:292-293) cascading off client. Ours: `CampsFilterBar.tsx` has 7 controls, no project dropdown; `matchesFilters()` has no `projectId` predicate at all.
4. **No cancellation policy/charge-calculation engine.** Prototype `computeCancellationCharge()` (camps-manager.js:282-297): reads `project.cancellationPolicy` (freeHoursPrior/pctAllowed/pctDeducted), computes hoursUntilCamp, unitCost (project.perCampCost or ₹5000 default), chargeAmount, newStatus — wired into a full policy-preview modal (camps-manager.js:344-444) with free-window math and a computed ₹ figure before confirming. Ours: `isChargeableCancellation()` (camps.utils.ts:30-33) is a **hardcoded `hoursUntil < 24` boolean** — no policy lookup, no per-project override, no unit cost, no ₹ amount shown anywhere. Cancel reason is also a free-text `Textarea`, not the prototype's 6-code enum (`DOCTOR_UNAVAILABLE`/`WEATHER`/`LOW_TURNOUT_EXPECTED`/`CLIENT_REQUEST`/`RESCHEDULED`/`OTHER`) — the typed union already exists in `camp.types.ts` unused. **Missing entire business-logic engine**, not cosmetic.
5. **No close-out modal.** Prototype `window.closeCampLifecycle` override (camps-manager.js:449-628): patient bifurcation (done/male/female w/ sanity-check), 4-band risk bifurcation w/ running-total check, Rx count, 3 star ratings, 4-tile photo-URL grid, 3 thank-you-communication checkboxes, closing notes — plus a separate read-only close-out report viewer w/ PDF/share (`window.showCloseOutReport`, camps-manager.js:1032-1098). Ours: `CampDrawer.tsx:157-165` "Close" just calls `onSetStatus(camp.id,'CLOSED')` directly — no modal, no data entry at all; `closeOut` object is never written anywhere in the app (only displayable if hardcoded in seed data).
6. **No reminders modal.** Prototype `window.openCampReminders` (camps-manager.js:751-871): configurable per-timing (T48/T24/T2) × per-channel (WhatsApp/Email/AI Voice) matrix, custom messages, 4 target-audience checkboxes, persisted to `camp.reminders`. Ours: `RemindersSection` is **read-only and synthetic**, deriving fake text from `camp.status` with an explicit `// TODO: mock` comment — no config UI anywhere.
7. **No resource assignment modal.** Prototype `window.openResourceAssign` (camps-manager.js:633-746): FO/Dietitian/LabTech single-select + Manpower multi-select, filtered by people-master role, primary-role-required banner (`PRIMARY_ROLE_BY_TYPE`), confirm-to-override. Ours: only `assignFo()` exists, via a raw `window.prompt()` text box — no dropdown, no role filtering, no dietitian/labtech/manpower assignment at all.
8. **No AI banner** (cosmetic — prototype's own is a static string with no logic either).
9. **No Import/Export buttons** (cosmetic — dead in the prototype too, low-severity parity item).
10. **Smart Actions panel entirely missing from the drawer** — prototype's drawer override (camps-manager.js:912-1027) injects a whole overlay card: missing-primary-role warning, live cancellation-policy chip, booking-hierarchy list, 4 action tiles (Assign resources / Configure reminders / Close w/ summary / Cancel w/ policy). Ours has none of this overlay layer at all, only the bare original actions.
11. **Booking-window rules (booking-window.js, 170 lines) entirely unported** — lead-time/window-days/monthly-cutoff/privileged-role-bypass engine gating the wizard's date step; since there's no wizard, this whole admin-configurable engine has no equivalent.
12. **Cancel flow's reason taxonomy regression** — free-text instead of the 6-code enum (also listed under #4, called out separately since it's a distinct defect: the typed union in `camp.types.ts` is dead code).
13. **"Send WA" buttons are decorative no-ops in both codebases** — `CampCard.tsx:113-118` has no `onClick` at all (prototype's own WA buttons are toast-only stubs too) — low severity, but confirms dead-button pattern extends beyond Create actions.
14. Camp-report.js dashboard widget (234 lines) confirmed **out of scope** — belongs to the Dashboard page, not Camp Management.

### What was ported faithfully (for balance)
- `camp-detail.js` dossier (894 lines) → `CampDetailPage.tsx` + dossier components: all 18 sections present, correct pharma/internal perspective suppression, correct PII redaction. Ported at the depth Ops Manager should have been done at from the start.
- `campStage()` — exact line-for-line port including the REQUESTED-vs-UPCOMING-by-foId nuance and the 3-condition COMPLETED-vs-COMPLETED_PENDING check.
- `matchesFilters()` correctly ports 7 of 9 filter predicates (missing only project, per gap #3, plus role-based scoping nuance).
- KPI strip (`CampsKpiStrip.tsx`) correctly ports all 7 status-bucket tiles with click-to-filter (unlike Diet Camps' KPI tiles, which are NOT clickable — a real divergence between the two audits worth noting).

---

## 4. Teleconsultation Camps — AUDIT COMPLETE

**Verdict: the overlap-with-Camp-Management theory is CONFIRMED.** `/camps/tele` is genuinely the same `CampsPage.tsx` rendered with `lockTab="TELE"`, mirroring the prototype's `tele-camps.html` (which loads the identical script set as `camps.html` and just calls `window.setCampsTab('tele')` instead of defaulting to `'requested'`). **Fixing Camp Management's wizard/bulk-upload/project-filter/cancellation-engine/close-out/reminders/resources/Smart-Actions gaps (all of #1-#11 above) will fix those same gaps on `/camps/tele` automatically** — no separate work needed for any of them.

### Gaps inherited verbatim from Camp Management (do not re-fix separately — fixing Camp Management fixes these here too)
No wizard (dead "New camp" button), no bulk-upload, no project filter, no cancellation-charge engine, no close-out modal, no reminders modal, no resource-assignment modal, no Smart Actions drawer overlay.

### Genuinely Tele-specific findings (real additional work, separate from Camp Management)
1. **There is no dedicated Tele booking/slot logic to port at all — confirmed as a prototype limitation, not a build gap.** "Teleconsultation" in the prototype is not a 4th camp type, just an orthogonal `teleConsult: boolean` + `teleChannel: 'VIDEO'|'IVR'` flag, settable in the wizard's Step-1 panel or toggled after-the-fact via `window.toggleCampTele` (camps.js:1174-1181). `booking-window.js` has zero tele-aware branching. `camps-manager.js` has zero tele/video/ivr matches. No video-link/meeting-URL field exists anywhere in prototype or React (confirmed via grep both sides) — this is a genuine absence in the prototype's own design, not something to build.
2. **What Tele-specific surface DOES exist is faithfully ported** where the underlying UI exists: card badge (`CampCard.tsx:59-63`), drawer badge+toggle (`CampDrawer.tsx:64-78`), tab filter (`CampsPage.tsx:70`, exact match w/ code comment citing the prototype line), `toggleTele` mutation mirrors `toggleCampTele` including VIDEO-default-on-first-toggle. `camps.mock.ts` even seeds one example Tele camp (`C-9450`) — an improvement over the prototype, which has zero example Tele camps in its own seed data.
3. **Genuinely Tele-specific gap — the KPI strip (and type-breakdown chip row) is unconditionally suppressed on the locked-tab view, independent of the wizard gap.** Prototype: `tele-camps.html` still renders the KPI grid + calls `renderKpis()` unconditionally (camps.js:1220), plus `renderTele()` passes `showTypeBreakdown:true` producing a Screening/Diet/Lab count-chip row (camps.js:481-490,507) — so the Tele screen shows the same 7-stage KPI strip as Camp Management, not Tele-filtered (a prototype quirk, not something to "improve" beyond parity), plus the breakdown chips. React: `CampsPage.tsx:106` explicitly does `{!lockTab && (<CampsKpiStrip .../>)}` — **the ENTIRE KPI strip is suppressed whenever `lockTab` is set**, so `/camps/tele` shows no KPI tiles at all, and there's no type-breakdown chip row anywhere in the codebase for any tab. Since Tele is a single-tab screen with no other content to fall back on, this is a proportionally larger information loss here than on the main Camp Management tabs.
4. **Minor: wizard header/subtitle should branch by route once built.** Prototype's `tele-camps.html:76-77` relabels the wizard modal to "Book new camp" / "Tick 'Teleconsultation camp' · pick Video / IVR" — a copy-only nuance to fold into the eventual wizard implementation, not a separate feature.
5. **Project filter — identically absent, same fix as Camp Management, not a separate item.**
6. **No video-link/meeting-URL field anywhere — confirmed absent in BOTH prototype and React**, so this is NOT a gap — the prototype never modeled real meeting-link integration for Tele, only a categorization flag + channel label.

### Summary
Only ONE genuinely Tele-specific fix is needed beyond the Camp Management backlog: **restore the KPI strip (ideally + type-breakdown chips) on the locked-tab view** — currently unconditionally suppressed by `{!lockTab && ...}` in `CampsPage.tsx:106`. Everything else Tele-related is either already correctly ported, or purely blocked by (and will be fixed by) the shared Camp Management wizard/modal work.

---

## Consolidated priority view across all 4 screens

**Tier 1 — entirely-missing core workflows (biggest user-visible gaps, "Create doesn't work" class):**
- Camp Management: camp-creation wizard (also fixes the dead "New Camp" button on Teleconsultation Camps for free)
- Diet Camps: invite-dietitians modal, assign/rate-sheet modal (currently only the prototype's own degraded fallback exists), media-upload modal, dietitian-enrollment form + dietitian-detail drawer
- Dedicated Ops: project detail/drawer view

**Tier 2 — entirely-missing supporting modals/engines:**
- Camp Management: bulk-upload, close-out modal (+ report viewer), reminders-config modal, resource-assignment modal (FO assignment is currently a raw `window.prompt()`), cancellation-charge engine (currently a hardcoded 24h boolean, no ₹ calc), Smart Actions drawer overlay, booking-window rules engine
- Diet Camps: camp-detail view needs most of its sections rebuilt (timeline, particulars, client/project block, reminder grid, close-out report, media gallery, team incl. FO/labtech/manpower/doctor), online-assessments UI (types/service already exist, just unwired), dietitian × device matrix (Devices tab)

**Tier 3 — dead buttons / missing interactions on otherwise-present UI:**
- Camp Management: project filter, dead "Send WA" buttons
- Diet Camps: KPI tiles not clickable, dietitian card per-camp-cost formula wrong, Tele Dietitian book-modal has 7 of 8 fields hardcoded, Reminders tab's Declined path unreachable, Media tab items not clickable/not actually rendering real photo/video
- Dedicated Ops: dead "Nudge" button, wrong Projects-tab KPIs (2 of 4 substituted + all sub-captions dropped), wrong Status column, fill-rate formula edge case, Convert-modal missing eligibility guard
- Teleconsultation Camps: KPI strip suppressed (unique to this screen, separate fix from Camp Management)

**Tier 4 — cosmetic / already-dead-in-the-prototype-too (do not prioritize):**
- AI banners, Import/Export buttons on Camp Management and Diet Camps headers (all confirmed dead in the prototype itself, not a regression)

## Recommended rebuild order (by leverage)
1. **Camp Management's camp-creation wizard** — highest leverage single item, since it also fixes Teleconsultation Camps' dead "New Camp" button for free.
2. **Camp Management's remaining Tier 1/2 items** (bulk-upload, cancellation engine, close-out modal, reminders modal, resource-assignment modal, Smart Actions overlay, project filter) — same feature folder, natural to batch.
3. **Teleconsultation Camps' one unique gap** (KPI strip suppression) — small, isolated fix once Camp Management work is settled.
4. **Diet Camps** — largest remaining scope (3 entire missing modal files + a mostly-stub camp-detail view + a fully-dead Dietitians tab). Likely needs its own dedicated multi-step pass similar to how Ops Manager was done tab-by-tab.
5. **Dedicated Ops** — smallest remaining scope (1 missing drawer + a handful of dead buttons/formula bugs), can be done last or in parallel once the others are underway.

## Verification methodology (carried over from Ops Manager, apply identically here)
- Read full prototype source per file (not summaries) before writing each component.
- Rebuild one screen/modal at a time; after each, run `tsc -b --noEmit`, `npm run build`, then a live Playwright check against `npm run preview -- --port 4173`.
- **Auth-mock gotcha**: mock the login route at its real absolute URL (`http://localhost:3000/api/v1/auth/login`, from `ENV.Api.BaseUrl` in `frontend/src/config/env.ts`) — NOT a relative glob like `**/auth/login`, which also matches the SPA's own `/auth/login` page route during `page.goto()` and silently serves raw JSON instead of the app shell. Response shape must be flat (`{success:true, data: <AuthUser fields incl. role>}`), NOT nested under `data.user`. If `role` isn't threaded through correctly, login silently falls back to `role:'super_admin'` (`useLogin.ts:14`) — always verify the sidebar user badge shows the intended role before trusting a screenshot.
- Navigate via `page.locator('a[href="..."]').first().click()`, not `page.goto()`, since the Zustand auth store isn't persisted and a full reload wipes it.
