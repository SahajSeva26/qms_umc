# Shallow-build audit — Diet Camps / Dedicated Ops / Camp Management / Teleconsultation Camps
_Saved 2026-07-16. Context: after fixing the same problem across all 11 Ops Manager tabs (see PROGRESS.md Session Log), 4 parallel research agents were dispatched to audit whether these 4 already-built screens have the same "read prototype but condensed/summarized instead of porting exactly" defect. 3 of the 4 agents hit a session API limit mid-run and terminated early — their partial findings (captured in their last progress message before termination) are included below. Only the Dedicated Ops agent completed its full run. **Nothing below has been acted on yet — no rebuild work has started on these 4 screens.** This file exists so the research isn't lost; resume by re-running the incomplete agents (their prompts are preserved below) or continuing manually from the partial findings._

---

## 1. Dedicated Ops — AUDIT COMPLETE (agent finished normally)

**Verdict: NOT built as shallow as Ops Manager was.** Reasonably faithful port (service layer even cites prototype line numbers in comments), but not gap-free. Much shallower gap profile than Ops Manager (no missing tabs, no missing business-logic files) but several real issues.

**Scope clarification confirmed by agent:** `dedicated-ops.js` (489 lines) + `dedicated-data.js` (526 lines) power `pages/dedicated-ops.html` — the 4-tab Ops-Manager-facing console (Projects / Live FOs / Compliance / SOP Configuration). This is what `features/dedicatedops/` implements. `dedicated-fo.js` (662 lines) + `dedicated-fo.html` is a **separate, distinct screen** — the FO's own mobile daily workspace (check-in/photo/screenings/check-out) — out of scope for "Dedicated Ops", **no React equivalent exists yet**, worth flagging separately if expected to exist elsewhere.

**Line-count sanity check:** prototype ~1015 lines (dedicated-ops.js + dedicated-data.js) vs React ~1107 lines total (service+types+hook+mock+page+modals+components) — comparable, but a chunk of the prototype total is FO-portal-only DPDP/consent/photo-upload machinery (~158 lines) that's legitimately out of scope here. Excluding that, real comparable logic is ~857 vs 464 — "mostly-faithful but somewhat compressed," not a systemic gutting.

### Concrete gaps (most → least severe)

1. **Project drawer/detail view — entirely missing** (missing entire section). Prototype `window.doOpenProject` (dedicated-ops.js:145-209): clicking a project row opens a slide-in drawer with project header, "Manpower requirement" have/need panel, "Assigned FOs" roster (avatar, doctor/clinic, live check-in/out pill, inline unassign), "SOP summary" panel, "Edit SOP" deep-link button. React: table rows aren't clickable at all, no drawer component exists anywhere in the feature folder. Per-FO unassign only exists on the Live FOs tab, not reachable from Projects.

2. **"Nudge" button is dead** (functional bug). Prototype `window.doNudgeFo` (dedicated-ops.js:374-377) fires a real toast. React `DedicatedOpsPage.tsx:261` — `<Button>Nudge</Button>` has no `onClick` at all.

3. **Live FOs tab KPI row — entirely missing** (missing entire section). Prototype `tabLive` (dedicated-ops.js:310-316) renders 4 tiles: Active FOs (checked in), Closed today, No check-in, Today's screenings. React's `tab === 'live'` block renders only the table, no KPI grid.

4. **Projects-tab KPIs: 2 of 4 are wrong/substituted metrics, all sub-captions dropped** (missing fields). Prototype (dedicated-ops.js:84-87): "Dedicated projects", "Assigned FOs", **"Screenings to date"**, **"Active today"** — each with a `sub` caption. React (`DedicatedOpsPage.tsx:119-122`): "Dedicated projects", "FOs deployed", then **"Fully compliant"** and **"Overdue"** (these are Compliance-tab metrics, wrongly duplicated here) — actual screenings-to-date/active-today numbers never shown on Projects tab at all. `KpiTile`'s `sub` prop exists and is supported but never passed anywhere on this page.

5. **Projects table "Status" column shows a duplicate metric, not real project status** (wrong field). Prototype (line 74): shows `p.status` lifecycle pill (LIVE/PAUSED/other). React (`DedicatedOpsPage.tsx:154`): re-shows the fill-rate pill (already shown via progress bar 2 columns over) — real `Project.status` ('ACTIVE'|'COMPLETED') never rendered here at all.

6. **Fill-rate formula wrong when `required === 0`** (logic edge-case bug). Prototype (lines 66-67): `pct = required ? round(100*fos/required) : (fos.length ? 100 : 0)`, i.e. 0-required-but-staffed projects show 100%/filled. React (`DedicatedOpsPage.tsx:139`): always 0% when required is 0, regardless of actual staff — incorrectly shows "Understaffed" at 0%.

7. **"Convert project to Dedicated" — no eligible-projects guard, helper copy dropped** (minor UX). Prototype (lines 103-109) toasts and refuses to open modal if zero eligible projects; also shows helper text under the form about default-SOP behavior (line 121). React opens the modal unconditionally with an empty Select; helper text missing.

8. **Assign-FO modal "currently on X" hint condition narrower than prototype** (cosmetic). Prototype (lines 218-222) shows the hint for any existing assignment including the same project; React (`AssignFoModal.tsx:59-64`) suppresses it if already on the same project.

9. **SOP tab is a genuinely faithful field-for-field port** (not a gap) — all ~12 fields verified present and matching. React additionally adds a "Manpower required" panel not in the prototype's SOP tab (reasonable compensating addition for gap #1, but shows required-only, no live fill count).

10. **CSV export column sets match** (not a gap) — verified prototype's and React's attendance/screening export columns are equivalent; only difference is React's export has no post-export confirmation toast (cosmetic).

**Agent's recommendation:** prioritize #1 (drawer) since it's the only entirely-missing user-facing surface, then #2 (dead button) and #3 (missing KPI row) as the most visible "shallow port" symptoms; rest are quick/low-risk.

---

## 2. Diet Camps — AUDIT INCOMPLETE (agent hit session limit mid-run)

Partial finding captured before termination:

> Confirmed: `DietitiansTab` has **zero interactivity** — no click handlers, no drawer, no filter/search UI, no "Enrol dietitian" button. It's a pure read-only grid of cards.
>
> [Agent's stated next steps, not yet done]: verify the AI banner ("Diet copilot") and "Auto-assign" button, check page-level chips/header parity, verify KPI tiles are clickable (prototype KPIs jump to filtered status pill on click).

**Scope for this screen:** prototype source is `assets/js/diet-camps.js` (2255 lines — the largest of the 4 by far). Our build is `features/diet/` (~1114 lines across pages/components/tabs/hooks/service — confirmed pre-audit). That's roughly 2x under-building by raw line count alone, consistent with the Ops Manager pattern, though line count alone isn't conclusive (see Dedicated Ops caveat above about legitimately-out-of-scope code).

**Status: needs a fresh full audit run** — only the Dietitians tab's interactivity gap was confirmed before the agent died. The other tabs (Diet Camps list, Tele Dietitian, Devices, Reminders, Media — per PROGRESS.md's "6 tabs" note) were not yet compared function-by-function against `diet-camps.js`.

**To resume:** re-run this exact research prompt (agent type: Explore, read-only):

> We are rebuilding a QMS healthcare-ops React app (at s:\qms_umc\frontend\src) by porting a vanilla-JS prototype (at s:\QMS-Camp-Portal-feature-qms-sales-ops-suite). We just discovered our earlier "Ops Manager" rebuild was systemically shallow — we read the prototype source but condensed/summarized it instead of porting every literal panel, KPI tile, formula, and button action, so large chunks of real functionality were silently dropped. We fixed all 11 Ops Manager tabs by re-reading the prototype in FULL (not skimmed) and porting every element exactly. Now we need to know if the same shallowness problem exists in the "Diet Camps" screen, which we built earlier in this project.
>
> Your job: do a thorough comparison and report concrete gaps. Do NOT write any code — this is a research/audit task only.
>
> 1. Read the FULL prototype source for the Diet Camps screen. Primary file: s:\QMS-Camp-Portal-feature-qms-sales-ops-suite\assets\js\diet-camps.js (2255 lines — read it in full via multiple Read calls with offset/limit, not just a sample). Also check s:\QMS-Camp-Portal-feature-qms-sales-ops-suite\pages\ for the corresponding HTML page (look for a diet-camps.html or similar) to see what other JS files it loads and what the page structure/layout looks like.
> 2. Read our current React implementation in full: everything under s:\qms_umc\frontend\src\features\diet\ (pages, components/tabs, hooks, diet.service.ts, diet.types.ts if it exists).
> 3. Compare systematically: for every function, panel, KPI tile, table column, modal, button action, filter, and business-logic formula in the prototype's diet-camps.js, check whether our React build has a faithful equivalent. Look specifically for: missing KPI tiles/summary panels; missing table columns or missing rows/sections entirely; missing modals or missing fields within existing modals; dead buttons (no onClick) vs. the prototype's real action; approximated/simplified business-logic formulas (status calculations, date logic, filtering/sorting logic); missing CSV/export functionality; any entirely-missing tabs/sub-sections.
> 4. Report: summary verdict (shallow vs reasonably complete); specific concrete gap list (prototype line ref + our build file:line ref or "entirely missing" + severity); rough line-count comparison.

---

## 3. Camp Management — AUDIT INCOMPLETE (agent hit session limit mid-run)

Partial finding captured before termination:

> Confirmed a critical gap: **no camp wizard (booking modal), no bulk upload, no project filter, no cancellation policy/charge calculation logic, no close-out modal, no reminders modal, no resource assignment modal, no AI banner, no Import/Export buttons.**
>
> [Agent's stated next steps, not yet done]: check the remaining dossier sections and utils files.

This is a large, high-severity partial finding — effectively says most of the interactive/write-side functionality of Camp Management may be missing entirely (as opposed to Dedicated Ops's "mostly there, some panels missing" profile). This lines up with PROGRESS.md's own existing Known Issues note: *"Real gaps found (close-out modal, cancellation policy engine) — see Known Issues"* — meaning some of this was already known before this audit round, but the agent's partial finding suggests the list of missing pieces is longer than previously documented (bulk upload, project filter, reminders modal, resource assignment modal, AI banner, Import/Export buttons are new items not previously called out).

**Status: needs a fresh full audit run, and likely the largest rebuild of the 4 screens.** The camp detail/dossier drill-down view (`camp-detail.js`, 894 lines) was flagged in the original prompt as needing full comparison but the agent's progress note only mentions "remaining dossier sections" as not-yet-checked — meaning dossier-view completeness is still unknown.

**To resume:** re-run this exact research prompt (agent type: Explore, read-only):

> We are rebuilding a QMS healthcare-ops React app (at s:\qms_umc\frontend\src) by porting a vanilla-JS prototype (at s:\QMS-Camp-Portal-feature-qms-sales-ops-suite). We just discovered our earlier "Ops Manager" rebuild was systemically shallow — we read the prototype source but condensed/summarized it instead of porting every literal panel, KPI tile, formula, and button action, so large chunks of real functionality were silently dropped. We fixed all 11 Ops Manager tabs by re-reading the prototype in FULL (not skimmed) and porting every element exactly. Now we need to know if the same shallowness problem exists in the "Camp Management" screen, which we built earlier in this project.
>
> Your job: do a thorough comparison and report concrete gaps. Do NOT write any code — this is a research/audit task only.
>
> 1. Read the FULL prototype source for the Camp Management screen. Primary files likely include: s:\QMS-Camp-Portal-feature-qms-sales-ops-suite\assets\js\camps.js, camps-manager.js, camps-data.js, and camp-detail.js (894 lines) — check file sizes first, then read ALL of them in full via multiple Read calls with offset/limit. Also check s:\QMS-Camp-Portal-feature-qms-sales-ops-suite\pages\ for the corresponding HTML page to see what other JS files it loads and what the page structure/tabs/layout looks like.
> 2. Read our current React implementation in full: everything under s:\qms_umc\frontend\src\features\camps\ (pages, components, hooks, service files, camps.service.ts, camps.refs.ts, camps.mock.ts).
> 3. Compare systematically, specifically confirming or expanding on this partial prior finding: "no camp wizard (booking modal), no bulk upload, no project filter, no cancellation policy/charge calculation logic, no close-out modal, no reminders modal, no resource assignment modal, no AI banner, no Import/Export buttons" — verify each claim with exact file:line evidence, and check the camp detail/dossier drill-down view specifically (camp-detail.js's full 894 lines vs whatever our build shows when drilling into a single camp) since that was not fully checked last time.
> 4. Report: summary verdict; specific concrete gap list (prototype line ref + our build file:line ref or "entirely missing" + severity); rough line-count comparison.

---

## 4. Teleconsultation Camps — AUDIT INCOMPLETE (agent hit session limit mid-run)

Partial finding captured before termination:

> Confirmed: **no "New Camp" wizard exists in this React feature at all** — the "New Camp" button in `CampsPage.tsx` (line 97-102) has no `onClick` handler (dead button).
>
> [Agent's stated next steps, not yet done]: confirm that and check `BookCampDialog.tsx` in CRM (a different booking flow) to see if it has tele fields, plus double check the `division` filter (project filter is missing from React filter bar vs prototype which has client/division/**project**/doctor/fo).

**Important overlap note:** per PROGRESS.md, Teleconsultation Camps is documented as *"a locked-tab wrapper over Camp Management (`/camps/tele`), not a separate feature"* — meaning this screen and Camp Management (audit #3 above) likely share the exact same underlying `CampsPage.tsx`/dead "New Camp" button bug. **Fixing Camp Management's missing camp wizard will very likely fix this same gap for Teleconsultation Camps simultaneously** — these two audits should probably be reconciled/merged before any rebuild work starts, rather than treated as two independent fixes.

**Status: needs a fresh full audit run**, but likely largely redundant with #3 above given the shared-component architecture — worth explicitly re-confirming the overlap before spending agent time on a fully separate audit.

**To resume:** re-run this exact research prompt (agent type: Explore, read-only) — but consider first just re-reading #3's findings once complete, since it may already cover this:

> We are rebuilding a QMS healthcare-ops React app (at s:\qms_umc\frontend\src) by porting a vanilla-JS prototype (at s:\QMS-Camp-Portal-feature-qms-sales-ops-suite). We just discovered our earlier "Ops Manager" rebuild was systemically shallow — we read the prototype source but condensed/summarized it instead of porting every literal panel, KPI tile, formula, and button action, so large chunks of real functionality were silently dropped. We fixed all 11 Ops Manager tabs by re-reading the prototype in FULL (not skimmed) and porting every element exactly. Now we need to know if the same shallowness problem exists in the "Teleconsultation Camps" screen, which we built earlier in this project.
>
> Note: per project docs, Teleconsultation Camps is a locked-tab wrapper over the SAME Camp Management feature (`/camps/tele`), not a separate feature — it likely shares `CampsPage.tsx` and other components with Camp Management. Check whether the Camp Management audit already covers this screen's gaps before doing a fully separate pass.
>
> 1. First read s:\QMS-Camp-Portal-feature-qms-sales-ops-suite\pages\tele-camps.html in full to see exactly which JS files it loads (note: shared generic modules — camps.js/camps-manager.js/camps-data.js/booking-window.js — rather than a dedicated tele-specific file; figure out how "Teleconsultation" camps are filtered/handled within those shared files, e.g. by camp `type` field).
> 2. Search assets/js/camps.js, camps-manager.js, camps-data.js, booking-window.js for "Tele"/"tele"/"teleconsultation" (case-insensitive), read the surrounding functions in full for context.
> 3. Read our current React implementation: features/camps/ (or wherever "tele" is handled — search component names first if unsure of exact path).
> 4. Compare systematically: missing KPI tiles/panels; missing table columns/filters/sections; missing modals or fields (booking-window logic for tele slots, video-link fields, doctor assignment); dead buttons vs. real prototype actions (already confirmed one: "New Camp" button in CampsPage.tsx:97-102 has no onClick); approximated business logic; missing CSV/export; missing tabs/sub-sections. Also verify the partial finding about a missing "project" filter (prototype filter bar reportedly has client/division/project/doctor/fo, ours reportedly missing "project").
> 5. Report: summary verdict; specific concrete gap list; rough line-count comparison if meaningful.

---

## Suggested next steps when resuming this work

1. Re-run the 3 incomplete audits (Diet Camps, Camp Management, Teleconsultation Camps) using the preserved prompts above — ideally after checking whether the session limit has reset, and possibly running them sequentially rather than 4-way parallel this time to reduce concurrent token pressure if that contributed to hitting the limit.
2. Given the overlap flagged in #4, consider merging the Camp Management and Teleconsultation Camps audits into one pass, or running Teleconsultation second and having it explicitly build on Camp Management's findings rather than re-deriving them.
3. Once all 4 audits are complete, apply the same methodology used for Ops Manager: read full prototype source (not summaries), rebuild every missing panel/tile/modal/formula exactly, verify via `tsc -b`, `npm run build`, and live Playwright screenshots against `npm run preview -- --port 4173` for every affected role/mode combination — not just a single happy-path render.
4. **Playwright/auth-mock note carried over from the Ops Manager work:** when writing verification scripts, mock the auth route at its real absolute URL (`http://localhost:3000/api/v1/auth/login`, from `ENV.Api.BaseUrl` in `frontend/src/config/env.ts`) — NOT a relative glob like `**/auth/login`, which will incorrectly also match the SPA's own `/auth/login` page route during `page.goto()` navigation and serve raw JSON instead of the app shell. Also mock response shape must be `{ success: true, data: <AuthUser flat fields incl. role> }` — NOT nested under `data.user` — since `useLogin.ts` calls `setAuth(data.data)` directlyand `AuthUser`'s fields are flat. If `role` isn't correctly threaded through, the login silently falls back to `role: 'super_admin'` (see `useLogin.ts:14`), which will make every screen render in an unintended admin/all-access mode without a visible error — always double check the sidebar user badge shows the intended role, not "Super Admin", before trusting any live-verification screenshot.
