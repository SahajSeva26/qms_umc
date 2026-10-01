# UI Revisions — Backend Progress Tracker

> Temp working file — created 2026-09-29 (branch `fixes/feedback`).
> Part 1 is the original brief exactly as received from the frontend dev.
> Part 2 tracks what has actually been implemented this session. Undone work is marked **NOT DONE**.

---

# PART 1 — Original brief (verbatim)

# UI Revisions — backend changes needed

Backend work identified while re-skinning pages to match the prototype (`S:\QMS-Camp-Portal-main`).
Each entry: what's needed, and why. This file does NOT track frontend/visual changes, verification
steps, or session narrative — only real backend gaps found along the way.

---

## Client Management (`/admin/tenants`, list + detail)

**MRs count on the list page.** The prototype's row shows a per-tenant MR count. Getting this for a
single tenant takes two calls (`GET /role-types?code=pharma-mr&tenant={id}` → `GET /roles?type=
{roleTypeId}`, since the `pharma-mr` role-type id is per-tenant, not shared) — fine for one tenant,
but N+1 across a 10-row list (up to 20 extra requests per page load). Needs `tenant.service.ts`'s
existing `getTenantStats()` (the batched `$in:tenantIds` aggregation already used for Projects/Camps)
extended with an MR `$group` stage.

**Billing (total invoiced amount), both list and detail pages.** `finance/invoice` exists with a
direct `tenant` field and a `total` amount — same one-hop `$group`-by-tenant pattern `getTenantStats()`
already uses for Projects/Camps, just `$sum: '$total'`. Decide whether to include every invoice
status or only non-cancelled/non-draft ones.

**Outstanding (unpaid amount), detail page.** Blocked on more than Billing — `INVOICE_STATUS` has
`paid` as a terminal state but no partial-payment/amount-paid field anywhere, so "outstanding" isn't
a clean `total - paid` sum without first deciding what it should mean against the real `Invoice`
model.

**Project Types breakdown (Screening/Diet/Lab/Mixed), detail page.** No `type` filter exists on
`SearchProjectQuerySchema`, and `getTenantStats()` only aggregates total/live project counts, no type
breakdown. Also: our real `Project.type` is a multi-select array, not the prototype's single enum,
so whoever builds this needs to decide how a multi-type project gets counted.

**Search by city, list page.** Tenant search only matches `name`; `address.city` is a real field on
the model but isn't matched. Low-impact (name search still works) — optional.

**Projects-per-division count, detail page (Divisions table).** No `Project` aggregation scoped to a
single division exists anywhere. Would need a `Project.aggregate([{$match:{division:{$in:
divisionIds}}}, ...])` addition, surfaced via `DivisionEntity`'s search response or a dedicated
stats fetch.

## Project Management (`/projects`, list + detail drawer)

**Multi-PO support.** The prototype tracks multiple POs per project (renewals/amendments) with a PO
count and a camps-executed/total progress bar. Our `Project.mode` has a single PO field
(`poNumber`/`poExpiry`), not an array — there's no multi-PO concept to count from. Blocks the "POs"
column (currently shown as "Upcoming") on the list and the PO-count/Total-PO-camps KPI tiles on the
detail drawer.

**Executed-camp count.** No field anywhere in the `Project` API response tracks camps executed
against a project's total — only `totalCamps` (the quota) exists. Blocks the camps progress bar on
the list and the Executed/Remaining camp KPI tiles on the detail drawer.

**Search by code / client.** `SearchProjectQuerySchema` has no `code` filter at all. `tenant`/
`division` are ObjectId filters, not free text, so "search by client" can't text-match server-side
without either a client-name-to-id resolution step or a new text-match path.

**`GET /projects` vs `GET /projects/report` own-scope inconsistency.** `search()` applies
`applyOwnScope()` (narrows to `salesRep: ctx.role._id` for a platform actor without `project:manage`),
but `report()` only applies `ctx.where()` — never own-scope. For an account in that permission shape,
the tab strip can show a nonzero count (from `report`) while the table shows zero results (from
`search`) for the same tenant, same moment. Needs a scoping decision: should `report()` match
`search()`'s own-scope, or should `search()` widen for `tenant:manage`-adjacent actors?

## CRM (`/crm`)

**KPI strip is missing 6 of the prototype's 8 tiles** (Pipeline Value, Won MTD, Win Rate 90D, Avg
Deal Size, Sales Velocity, Avg AI Score, Top Rep). `GET /leads/report`'s `$facet` aggregation only
computes `totalLeads`/`statusCounts`/`projectTypeCounts`/`newLeadsTrend` — no stage sums
`estimatedValue` anywhere. None of these are addable frontend-only: `report()` doesn't return raw
per-lead values, and summing client-side would need a second unfiltered `search()` call that breaks
once lead counts grow past one page. Per-tile:
- **Pipeline Value** = `$sum: '$estimatedValue'` over currently-open leads in the existing match scope.
- **Won MTD (₹)** = `$sum: '$estimatedValue'` over leads with `status: 'won'` **and** a `stageHistory`
  entry with `to: 'won'` in the current calendar month (needs the transition timestamp from
  `stageHistory`, not `createdAt`).
- **Win Rate 90D (%)** = the existing `converted/(converted+lost)` formula, re-scoped server-side to
  leads whose won/lost transition falls in the last 90 days (currently computed all-time, client-side).
- **Avg Deal Size (₹)** = `$avg: '$estimatedValue'` over won leads.
- **Sales Velocity (days)** = avg(`won` transition timestamp − `createdAt`) per won lead — needs
  `stageHistory` timestamp math server-side.
- **Avg AI Score** — no scoring model exists anywhere in our real `Lead` model. This is a missing
  feature requiring a genuine product decision, not a report-aggregation addition.
- **Top Rep** = `$group` by `salesPerson` over won leads this period, `$sum` their `estimatedValue`,
  sort desc, take top 1, plus a `salesPerson` populate for display name.

All six thread through `LeadReportResponse.summary` once built, the same way `open`/`converted`/
`lost` already do.

**List view "Follow-ups" column.** No relation exists from `Lead` to `Appointment`/meetings to
aggregate a per-lead follow-up count from. Needs either a new `lead` ref on `Appointment` or a
dedicated aggregation.

**Filter bar search scope.** Search currently matches `title` only (both client- and server-side).
Prototype's matches account/contact/ID/therapy/geography too — would need `lead.service.ts`'s search
filter extended to match contactPerson/tenant-name/therapy.

## Appointments (`/crm/appointments`)

**MOM 24-hr SLA auto-block + RM-release workflow.** ❌ **INVALID — will not be built.** This pointer
is built around a 5th `AppointmentStatus` value (`blocked`) and a `planned→blocked` auto-transition.
But the `blocked` status was **entirely removed from the Appointment status enum by an earlier explicit
requirement** (2026-08-11 — "Removed the `blocked` status per user request"). Reintroducing it would
reverse that decision, so this whole auto-block/release workflow is void as written. (Original brief
text, kept for reference: needed `blockedAt`/`blockReason`/`releasedBy`/`releasedAt`/`releaseReason`
fields, scheduled-job logic to flip `planned→blocked` 24 working hours past the meeting end with no
MOM, and a `blocked→released` RM/admin-gated transition. `AppointmentMom.submissionDeadline` + the
overdue-badge UI exist, but the state machine this depended on is intentionally absent.)

**Peer overlay ("BUSY, agenda hidden" for teammates' meetings).** Needs the search endpoint to
return a redacted shape (owner + time range only, no agenda/contact/company) for appointments the
viewer isn't invited to, instead of the current all-or-nothing own-scope filter. A real API-shape
change.

**Leads calendar view.** Needs a dedicated aggregation joining leads to their appointment/MOM/
follow-up/payment-touch counts — conceptually similar to CRM's Follow-ups gap above, but broader (a
whole view, not one column).

**Weekly planning panel** (`#apptWeekly` — "Weekly plans to approve" + "Weekly summaries received"
cards: KAM plan submission → Sales Head approval → completion summary, with its own KPI tiles). No
equivalent concept exists anywhere in the backend (confirmed via grep — zero hits for
`weeklyPlan`/`WeeklyPlan`). Needs its own data model (a "week plan" entity with per-rep target counts
+ an approval state) before any UI can be built. The most substantial gap found across this whole
pass.

**`InternalMembersPicker` live-availability badges** ("Free"/"⚠ Busy · time–time" per teammate).
Would need real overlap-computation logic against teammates' calendars server-side; currently a
plain search-and-add picker with no busy/free signal.

**Free-text location field for offline/call appointments.** The prototype records a free-text
"Location" (e.g. "HQ Andheri", "Café") independent of online/offline mode. Our real backend
`Appointment` model has `mode` + `destinationLink` only — no `location` field at all (confirmed
directly in `appointment.model.ts`); the frontend's `AppointmentEntity.location?: string` type is
stale and doesn't correspond to anything real on the backend. Needs a real `location` field added to
the model before the New Appointment form or drawer can show/collect it.

## Camp Management (`/camps`)

**9-way stage taxonomy vs. our real 6-value status enum.** The prototype's KPI tiles/tabs
(Requested/Upcoming/Live/Completed/Completed·Pending/Cancelled/Cancelled·Charged, plus Tele/All)
are a *derived* taxonomy, not a raw backend enum — `campStage()` further splits `closed` into
Completed vs. Completed·Pending based on whether photos/patient-count data exist, and splits
"no status yet" into Requested vs. Upcoming based on whether an FO is assigned. Our real `CampStatus`
is a flat 6-value enum (`requested/confirmed/live/closed/cancelled/cancelled_charged`) with no
completion-tracking fields (no patient-count/photo fields on the Camp model) to derive
Completed-vs-Pending from, and no "FO assigned but not yet confirmed" distinction to derive
Upcoming from. Building the full taxonomy needs either new Camp fields (a patient-data/photo
completion marker) or a decision that Upcoming/Completed·Pending aren't meaningful concepts for us.

**Multi-role staffing + "Missing `<Role>`" warnings.** The prototype tracks a `camp.resources`
object (`{FO, DIETITIAN, LABTECH, MANPOWER[]}`) and shows a red "Missing `<Role>`" tag per camp type's
required role. Our real `Camp` model has a single `fo` field only — no dietitian/lab-tech staffing
concept at all. Needs new fields (or a separate staffing-assignment model) before this can be
anything but FO-only.

**Bulk upload (historical).** Real prototype feature — client-side `.xlsx` parsing that creates
`CLOSED`-status camps in bulk for past/3rd-party-executed camps. No equivalent bulk-import endpoint
exists on our backend. Needs a dedicated import endpoint, not just a frontend file-picker.

**`GET /camps` vs `GET /camps/report` own-scope inconsistency.** Same bug pattern already logged
under Project Management. `search()` applies `applyOwnScope()` (narrows to camps where the actor
occupies a field-force assignment slot, for anyone without `camp:manage`), but `report()` only
applies `ctx.where()` — never own-scope. Live-verified: for the `admin` test account, the KPI strip
shows "38 total" (from `report`) while the table shows 0 rows / "No camps found" (from `search`) —
same tenant, same moment. Needs the same scoping decision as the Projects entry: should `report()`
match `search()`'s own-scope, or should `search()` widen for `camp:manage`-adjacent actors?

**BCA scale flag + device-fault "ON HOLD" pill.** Both depend on external prototype modules
(`window.QMS_OM.campBcaStatus`, `machine-replacement.js`'s device-fault tracking) representing
device-calibration/fault-tracking concepts not present in our backend today.

**Filter bar search scope.** Prototype's search matches camp ID/doctor/city/client name all at once.
`SearchCampQuerySchema` only has a `city` filter — no free-text match across ID/doctor/client. Kept
the honest narrower placeholder ("Search by city...") rather than copy the broader prototype claim;
broadening this is a `camp.service.ts` search-filter change, not a copy fix.

**Tele Consultation tab.** Prototype filters on `camp.teleConsult === true` regardless of status. Our
real `CampType` enum is `screening | diet | lab` only — no teleconsultation type or flag exists
anywhere on the Camp model (confirmed in `campReal.types.ts`). Matches the `TeleconsultationCampsStubPage`
already flagged as a stub in this codebase — this is a real missing feature, not a filter to add.

**Per-tab type-breakdown counts need a status-scoped report.** The prototype's chip row ("Screening:
2 · Diet: 0 · Lab: 1 · 3 total") is scoped to the current tab's full camp set. `CampReportQuerySchema`
accepts zero filters (`z.object({})`, confirmed in `camp.validators.ts`) — `report()`'s `byType` is
always tenant-wide, with no way to scope it to "camps with this status" the way the tab strip needs.
Our list is also server-paginated (10/page), so there's no in-memory full-tab dataset to compute this
from client-side either (unlike the prototype, which holds everything in one unpaginated array).
**Interim treatment (2026-09-28):** computed from the current page's 10 rows only — an honest
undercounting once a tab has more than one page, not the tab's real total. Needs either a `status`
param added to `CampReportQuerySchema`/`report()`'s `$match`, or a dedicated
`byType`-scoped-to-status aggregation, before this can show the tab's true total.

**Camp drawer's 4-tile KPI row.** The prototype's detail drawer shows Patients (done/expected + %
done), Rx count, Feedback (★ patient rating), and FO rating (★ from pharma) as KPI tiles. None of
the 4 have any backing field on our real `CampEntity` — confirmed in `campReal.types.ts`: no
`patientsDone`, no `rxCount`, no `feedback`, no `foRating` anywhere. `patientExpectation` (the target)
is the only half of "Patients" that's real — there's no executed/done count to pair it with, same
root gap as the list page's card "Done %" stat already logged above. Shown as "Coming soon"
placeholder tiles in the drawer (2026-09-28) rather than fabricated numbers or a silently dropped
row — needs 4 new Camp fields (or a separate outcomes/results sub-model) before any of these can be
real.

---

## CRM Invoicing (`/billing`)

**PO-quantity matching + VOID overflow.** The prototype's entire Generate Invoice flow is built
around a project's PO (purchase order) camp-quantity ceiling — a "PO position" bar (billed/target
camp slots), and any camp billed past that ceiling auto-flags VOID (stays open, bills first once a
new PO is recorded via a dedicated "Record additional PO" action). None of this exists on our real
`Project` or `Invoice` model — no PO number, no PO camp-quantity target, no billed-vs-remaining
tracking, no VOID concept at the invoice-line level. Needs a real PO sub-model (number, target camp
qty, value) on `Project`, plus a way to track cumulative camps billed against it.

**FOC (free-of-charge) camps.** The prototype lets a camp be marked FOC with a reason at invoice-
generation time — bills at zero, excluded from the invoice total, tracked separately per invoice. Our
real `InvoiceLineItem.amount` always snapshots the project's `campCost` with no zero-override or
reason field. Needs an optional `foc: boolean` + `focReason: string` on `InvoiceLineItem` (or the
create payload), with `amount` computed to 0 when set.

**Additional-patient billing.** The prototype's Generate Invoice KPI strip tracks patients billed
beyond a camp's `patientsExpected` target as a separate line item, charged at its own
`addlPatientRate` (distinct from the flat per-camp rate). Our real `Camp` has `patientExpectation`
but no executed/actual-patient-count field at all (same root gap already logged for the Camp drawer's
KPI row above), and `InvoiceLineItem`/`Project` have no additional-patient rate concept whatsoever —
`amount` is always exactly one flat `campCost` snapshot per camp. Needs both a real patient-count
field on `Camp` and an `addlPatientRate` on `Project`, plus a second line-item kind (or a computed
surcharge) before this can be real.

**Chargeability-approval workflow.** The prototype's "pre-bill preview" queue lets any camp be
flagged "not chargeable" by ops with a note, sitting in a pending-approval state until an Ops Manager
approves/rejects it (approval removes it from billing; rejection bills it normally). This is a
genuinely separate mini-workflow with its own state machine — nothing on `Camp`, `Invoice`, or
`InvoiceLineItem` supports a chargeability flag, a markedBy/note, or an approval gate. Would need a
new field set on `Camp` (or a dedicated sub-collection) plus a permission-gated approve/reject
action, not a quick addition.

**Tally invoice number capture.** Our `Invoice.syncToTally` is a plain boolean; the prototype's
Approve action requires typing in a real Tally invoice number as a condition of approving, and
persists/displays it afterward (`invoice.tallyInvoiceNo`). Needs a `tallyInvoiceNo: string` field on
`Invoice`, populated at the `approved` transition.

**GRN (Goods Receipt Note) signed-copy capture.** The prototype's GRN step records a done/pending
flag plus a signed-copy file reference, shown afterward in the invoice detail. Our `grn_signed`
status exists as a pipeline stage name only — no field anywhere stores whether a signed copy was
actually uploaded, or a reference to it. Needs a `grnSignedCopy` (file/URL) field, likely alongside
the existing S3-presigned-upload pattern used elsewhere in the app.

**Per-camp remarks thread.** The prototype lets any team member attach a free-text remark to a
queued camp before billing (visible to the whole billing team, shown inline in the pre-bill preview).
No equivalent exists on `Camp` or `Invoice`/`InvoiceLineItem` — would need a small embedded
remarks array (text, author, timestamp) on `Camp`.

**Excel (CSV) export + camp photo-collage PDF export**, per invoice. Both are pure client-side
generation in the prototype (no server call) — buildable without any backend change once the
line-item data is in hand, but skipped in this pass since neither was asked for and both are
independent, sizeable pieces of work (the collage in particular needs each camp's photo assets,
which aren't currently fetched anywhere in the Invoice feature).

**Pipeline KPI strip is computed from the current page only (2026-09-29).** Same interim-and-
undercounting pattern as the Camp Management tab-breakdown chips logged above — `InvoicePipelineKpiStrip`
sums `total`/counts across only the current page's invoices, not the tenant's true totals, because
`useInvoices` is server-paginated with no unscoped "totals" endpoint. Needs either an `/invoices/report`
endpoint (mirroring `camp.report()`) or a dedicated aggregation before these tiles show real totals.

**Invoice card's richer subtitle (client/division) and stats line (camp count/void/FOC).** The
prototype's pipeline card shows `Client · Division · PO —` as a subtitle and a full stats line
(`N camps · N addl patients · N void · N FOC · Tally ...`) under it. `InvoiceEntity.project` only
populates `{name, code, status}` (`invoice.service.ts`'s populate list) — no tenant/division — and
no camp count exists anywhere on the invoice response (would need a per-invoice
`invoice-line-item` count, which is a real N+1 across a 10-row paginated list). Skipped rather than
fetched per-card (2026-09-29) — needs either `invoice.service.ts`'s populate extended to
`project.tenant`/`project.division`, plus a batched line-item-count aggregation surfaced on
`InvoiceEntity` (e.g. a `lineItemCount` field maintained the same way `subtotal`/`total` already are),
before this can be shown cheaply on a list.

---

## Inventory Management (`/admin/inventory-masters`, `/admin/inventory-items`, `/admin/vendor-masters`)

**Vendor scorecard (delivery/quality/cost scores, complaint rate, price history).** The prototype's
Vendors tab is a scorecard dashboard — each vendor card shows an overall score (avg of 3 sub-scores)
plus individual delivery/quality/cost bars, a complaint-rate %, and a drill-down drawer with a
price-history-by-item table (latest rate, landed cost, trend % vs. first recorded price). None of
this exists on our real `VendorMaster` model — it's a pure identity/contact registry (name, code,
contacts[], address, status). Adopted the card-grid layout per user's explicit call, but showing only
real fields (name, code, primary contact, city, status) — no score bars, no price history. Needs:
a scoring model (what feeds delivery/quality/cost — manual entry? computed from PO/GRN data we don't
have either?), a complaint-tracking mechanism, and a price-history ledger tied to purchase records —
none of which have any real backend today, and the "computed from PO/GRN" option is itself blocked on
the deleted mock procurement module having no real replacement.

**Device calibration workflow ("mark calibrated" action).** The prototype's Calibration tab lets an
operator mark a physical unit as calibrated inline, which updates `lastCalibrationDate`/
`nextCalibrationDate` and logs a movement-ledger entry. Our real Devices panel shows
`nextCalibrationDate` as a read-only column with no action to update it — the only way to change it
today is the full Edit Device modal (all fields), not a dedicated one-click calibration action. Needs
either a dedicated `PATCH /inventory-devices/:id/calibrate` endpoint (setting both calibration dates
+ writing a ledger entry) or, at minimum, confirmation that editing just the calibration dates via the
existing update endpoint is an acceptable stand-in — not built either way this pass.

---

# ⏸️ RESUME HERE (paused 2026-09-29, continue 2026-09-30)

**Update 2026-10-01 — latest frontend brief reconciled + first bug fixed.** A newer frontend brief
arrived with two whole new modules (**Pharma Portals** — MR portal only, and **Doctor Management**) and
a much-expanded **Inventory** list, plus TWO bugs found on work we'd marked "done": (1) the Project
Types breakdown ObjectId-cast bug — **✅ FIXED today** (see Client Management #4 below; `project.service.ts`
`tenant`/`division`/`lead`/`salesRep` filters now `toObjectId()`-wrapped, `tsc` clean, UNCOMMITTED), and
(2) a CRM follow-ups own-scope gap (`getLeadActivityStats()` has NO appointment-level permission scoping —
any `lead:search` caller gets full appointment counts) — **WON'T FIX for now (user decision 2026-10-01):**
they're aggregate counts, not real appointment data; accepted (revisit only if the tiles become
click-through to the appointments). Also done today: the Project `report()`-vs-`search()` own-scope
inconsistency (narrow-the-report). The full new-module gap list lives in memory `ui-revisions-tracker.md`;
this progress doc's "done" pointers were left intact per the user. **Also done 2026-10-01 (all committed
except where noted):** Pharma non-live-booking block (`POST /camps/book` rejects a non-`live` project with
409 — committed `b4cdf1e`); Project ObjectId cast fix (committed `6d17659`) + Project `report()` own-scope
(committed `808fcdf`); **CRM Invoicing `/invoices/report`** (global-by-default pipeline totals + per-status
breakdown) **and Invoice-card subtitle/`lineItemCount`** (partial — Client·Division·PO + N-camps done; addl
patients/void/FOC blocked on missing fields) — these two invoice items are the current UNCOMMITTED set.
Pharma Portals + Doctor Management + expanded Inventory are new modules from the latest brief and live only
in memory `ui-revisions-tracker.md` (this on-disk doc predates them). Next buildable invoice-direct item:
FOC camps (`foc`/`focReason` on InvoiceLineItem).


**Done this session (backend, branch `fixes/feedback`, ALL UNCOMMITTED, `tsc` clean):**
- **Client Management** — module complete (already committed earlier: MR count, invoice tenant filter,
  project type breakdown, tenant city/state, division stats).
- **Project Management** — `code` search committed; **client-name search built then REVERTED** (frontend
  will do the workaround); **Multi-PO DEFERRED** (big, needs design); **own-scope report bug → LATER REFACTOR**.
- **CRM — all 3 backend pointers done (uncommitted):** (1) lead search `code` + `focusTherapy` filters,
  (2) follow-ups `report=true` per-row `stats.followUps`, (3) `/leads/report` **KPI strip** (5 tiles:
  pipelineValue/avgDealSize/wonValue/winRate/salesVelocityDays/topRep; Avg AI Score omitted).

**Uncommitted files:** `crm/lead/{validators,service,mapper}.ts` + docs (`CLAUDE.md`, `backend/CLAUDE.md`,
this file). Nothing committed today — **commit before or at start of next session.**

**Next up (tomorrow):**
1. (optional) e2e-verify the uncommitted CRM lead changes on live rs0, then commit.
2. **Frontend wiring** owed for the KPI strip (re-add tiles + `kpis` on `LeadReportResponse`) — frontend team's task.
3. **Appointments module — DONE for this pass (2026-09-30):** 2 built, 1 invalid, 3 deferred.
   - ✅ free-text `location` field
   - ✅ Leads calendar view (as per-lead activity counts via `report=true` on lead search)
   - ❌ MOM SLA auto-block (INVALID — depends on the removed `blocked` status)
   - ⏸️ Peer overlay + availability badges — DEFERRED (same busy/free engine, save for later)
   - ⏸️ Weekly-planning panel — DEFERRED / LATER TODO (largest; new `weekPlan` entity — design pass first)
4. **Camp Management — PARTIAL, parked (2026-09-30):** ✅ filter-bar search (added `code` regex filter;
   doctor/client-name → id resolved frontend-side, same as project). ⏸️ per-tab status-scoped report +
   historical bulk upload = TODO. ⏸️ report()-vs-search() own-scope = later refactor. 🗣️ 9-way taxonomy,
   multi-role staffing, camp drawer 4-tile KPI, tele-consult tab, BCA/device-fault = NEED DISCUSSION
   (blocked on new Camp outcome/staffing fields — resolve in a future session; most unblock together
   once actual-patient-count + completion/Rx/rating/staffing fields are added).
5. **NEXT MODULE: CRM Invoicing** (see PART 2). Then Inventory.

---

# PART 2 — Progress / status (this session)

Legend: ✅ DONE · 🟡 PARTIAL · ⬜ NOT DONE

## Related work done first (not from the pointer list)

- **Mapper `toSearchResponse` decoupling refactor** — ✅ across all 31 mappers that have a search
  mapper (verified: `8b3c7dc` touched 31 `*.mapper.ts` files; 31 mappers define `toSearchResponse`). Each `toSearchResponse` now builds its own independent, fully-duplicated field block
  (incl. the same permission-gated blocks) instead of delegating to `toResponse`, so search rows can
  be trimmed per-module later without affecting `GET /:id`. Identical output today. `tsc` clean;
  adversarially verified as exact property-for-property parity. (Skipped: `auth` — no search mapper.)
- **Pointer verification pass** — ✅ all ~40 pointer claims checked against real code. 4 corrections
  found (see below); the rest verified accurate.

### Verification corrections (claims in Part 1 that were wrong / need nuance)

1. **CRM → "List view Follow-ups column: no relation from Lead to Appointment"** — INCORRECT.
   `appointment.model.ts` already has a `lead` ref field (its `required` is commented out). No new
   ref needed — only the aggregation (per-lead follow-up count).
2. **CRM Invoicing → "PO-quantity matching: no PO on Project or Invoice"** — PARTLY INCORRECT.
   `Project.executionMode` already has single PO fields (`poNumber`/`poDate`/`poExpiry`). Genuinely
   absent: multi-PO array, PO camp-qty ceiling, billed-vs-remaining, VOID at line level.
   (Invoice/InvoiceLineItem have zero PO fields — confirmed.)
3. **Camp Management → "SearchCampQuerySchema only has a city filter"** — PARTIAL. It actually has
   `tenant/project/division/doctor/fo/status/type/billingType/city/state/dateFrom/dateTo`. Real gap
   is narrower: no free-text cross-field search (ID/doctor/client in one box).
4. **Inventory → "Device calibration logs a movement-ledger entry"** — PARTIAL. The `inventory-ledger`
   module exists and is wired (stock movements). It's just not connected to calibration — a
   calibrate action can reuse the existing ledger.

---

## Client Management — ✅ MODULE COMPLETE (6/6 addressed)

1. **MRs count on the list page** — ✅ DONE. `getTenantStats()` extended with a per-tenant MR
   `$lookup`+`$group` (roles whose role-type is the tenant's `pharma-mr`). Surfaced as `stats.mrs`
   on tenant search when `report=true`. Counts all MR roles (any status).
   Files: `tenant.service.ts`, `tenant.mapper.ts`.
2. **Billing (total invoiced)** — ✅ DONE. `getTenantStats()` extended with `$sum: '$total'` per
   tenant, **excluding `draft` + `cancelled`**. Surfaced as `stats.billed`.
   Files: `tenant.service.ts`, `tenant.mapper.ts`.
3. **Outstanding (unpaid amount)** — 🟡 PARTIAL (by design). NOT added to tenant stats — the detail
   page calls the invoice API scoped to the client. Enabling change done: **added a `tenant` filter
   to invoice search** (no permission gate; still guarded by `!where.tenant` so a customer actor
   can't override their own scope). ⬜ NOT DONE: an accurate billed/outstanding *total number*
   (needs an `/invoices/report` aggregation — see the CRM Invoicing pointer).
   Files: `invoice.validators.ts`, `invoice.service.ts`.
4. **Project Types breakdown** — ✅ DONE, **+ bug fixed 2026-10-01**. Added a `report=true` flag to
   **project search** → top-level `report.byType` (count per `PROJECT_TYPES` value, over the whole
   scoped/filtered set; multi-type project counted once per type it carries). Frontend maps the 5
   values onto its Screening/Diet/Lab/Mixed tiles.
   **BUG (found by frontend, confirmed + fixed 2026-10-01, UNCOMMITTED, `tsc` clean):** `search()`
   assigned ObjectId-field filters as RAW STRINGS. `Project.find()` auto-casts (so the list query was
   fine), but `report.byType`'s `Project.aggregate([{ $match: where }])` does NOT auto-cast → the
   `$match` compared a string against ObjectId fields and matched nothing → `byType` silently returned
   all-zero counts for any `tenant`-scoped `report=true` call (live repro: a tenant showed "Projects: 2"
   in the KPI strip but "No projects yet" in the Project Types tile — the KPI number comes from the
   correctly-cast `getTenantStats()`, the tile from this uncast search-report path). Fixed by wrapping
   the ObjectId-field filters in the file's existing `toObjectId()` helper — `tenant` (line ~181),
   `division` (~196), `lead` (~199), `salesRep` (~202); `status`/`therapy` left as-is (string fields,
   no cast needed). `stats.executedCamps` was never affected (it keys off already-fetched project ids).
   Frontend's tile (reverted to "Coming soon" until this landed) re-wires once confirmed.
   Files: `project.validators.ts`, `project.service.ts`, `project.mapper.ts`.
5. **Search by city** — ✅ DONE (+ state). Added separate `city` and `state` regex filters to tenant
   search (`address.city` / `address.state`, case-insensitive).
   Files: `tenant.validators.ts`, `tenant.service.ts`.
6. **Projects-per-division count** — ✅ DONE. Added a `report=true` flag to **division search** →
   each division row carries `stats: { totalProjects, liveProjects }` via a batched
   `$in:divisionIds` aggregation over projects.
   Files: `division.validators.ts`, `division.service.ts`, `division.mapper.ts`.

## Project Management — actionable items closed for now (2/4 done; Multi-PO + own-scope DEFERRED, client-name → frontend)

1. **Multi-PO support** — ⬜ DEFERRED (**LATER — BIG**, user's call 2026-09-29). Heavy data-model
   change: single embedded PO (`Project.executionMode.poNumber/poDate/poExpiry`) → a PO array/
   sub-collection, each with number/date/expiry/**camp-qty ceiling**/value + billed-vs-remaining
   tracking. Also underpins CRM Invoicing PO-matching + VOID (#23). Needs a design pass first
   (embedded array vs sub-collection; how "camps billed per PO" is derived; migration of existing
   single-PO projects) before any code.
2. **Executed-camp count** — ✅ DONE. Project search `report=true` now also returns per-project
   `stats.executedCamps` = count of that project's camps in **`closed` + `cancelled_charged`**
   (batched `$in:projectIds` aggregation, in parallel with the byType report). Pair with existing
   `totalCamps` for the progress bar / Executed·Remaining tiles.
   Files: `project.service.ts`, `project.mapper.ts`.
3. **Search by code / client** — 🟡 PARTIAL. ✅ `code` regex filter done. ⬜ server-side client-*name*
   search — **DEFERRED (2026-09-29, user's call): the frontend will handle it via its existing
   workaround** (resolve client name → tenant id client-side, then use the `tenant` id filter).

   **Proposed backend solution if picked up later (built then reverted this session, code clean):**
   relax the `tenant` filter validator from `objectId('Tenant')` → `z.string()` so it accepts an id
   OR a company name; in `search()`, inside the existing manage-gated / not-tenant-pinned block,
   branch on `isValidObjectID(filters.tenant)` — id → filter directly; otherwise resolve the name via
   `TenantService.search({ name }, ctx)` → `where.tenant = { $in: matchedIds }` (no match → `$in:[]`
   → no projects). Own-scope still applies last; `report=true` aggregations inherit the scoped `where`;
   no circular-import risk (tenant.service imports only the Project *model*).
   ⚠️ **Caveat that led to the deferral:** the name resolution calls `TenantService.search` with **no
   pagination**, relying on Mongoose treating `.limit(undefined)` as no-limit to return ALL matching
   tenants. It's correct today but implicit — if the tenant service ever gains a default page size,
   a company name matching more tenants than that cap would silently drop those projects. Make the
   no-limit explicit (or fetch ids with a lean scoped query) before shipping this.
   Files (if built): `project.validators.ts`, `project.service.ts`.
4. **`report()` vs `search()` own-scope inconsistency** — ✅ DONE (2026-10-01, UNCOMMITTED, `tsc` clean).
   Standalone `report()` (`project.service.ts:354`) matched only `ctx.where()`; `search()` also applies
   `applyOwnScope()`, so a scoped user's KPI tiles counted projects wider than the list they could see
   (customer actor narrowed to own division / non-manager platform rep narrowed to own salesRep — but
   only the list narrowed, not the report). Reachable by `project:manage` OR `tenant:manage` (route
   guard is OR); a plain `project:manage` actor is a no-op for `applyOwnScope` so was never affected —
   the real cases are a **customer `tenant:manage`** actor and a **platform `tenant:manage`-without-
   `project:manage`** actor. Fixed by building the `where` the same way `search()` does
   (`{ ...ctx.where() }` + `applyOwnScope(where, ctx)`) and `$match`-ing on it — reuses the list's exact
   own-scoping (no new logic; can only make report MORE consistent, never diverge) and is ObjectId-safe
   (`applyOwnScope` already `toObjectId()`-casts). Chose narrow-the-report over widen-the-search: the
   security-safe direction (never exposes more rows to a scoped user). **Same bug still open in Camp
   Management** (`camp.report()`) — left for the Camp module pass. File: `project.service.ts`.

## CRM — ⬜ NOT STARTED

- KPI strip — ✅ DONE backend (2026-09-29), ⬜ frontend wiring pending. Extended `GET /leads/report`'s
  single `$facet` with 5 KPI tiles surfaced under `summary`-sibling `kpis`: **pipelineValue**
  (Σ estimatedValue, open leads), **avgDealSize** (avg estimatedValue, won, all-time), **wonValue**
  +**wonCount** (won within the from/to range), **winRate** (% won/(won+lost) within range),
  **salesVelocityDays** (avg days created→won, all-time), **topRep** ({salesPerson,name,wonValue,
  wonCount} via a `roles` $lookup, all-time). **Windowed tiles use the endpoint's existing `from`/`to`
  INPUT** (per user — no internal MTD/90d hardcoding); velocity + topRep all-time. **Avg AI Score
  intentionally omitted** (no scoring model — product decision). Scope = existing `report()` `ctx.where()`
  (own-scope on report still the deferred refactor). `tsc` clean.
  ⬜ **Frontend still needs to wire it:** `crm.kpis.ts` currently omits these tiles + `LeadReportResponse`
  type has no `kpis` field — the frontend must re-add the tiles and extend the type to consume
  `report.kpis`. Files (backend): `lead.service.ts`, `lead.mapper.ts`.
- List view "Follow-ups" column — ✅ DONE (2026-09-29). Per-lead count of **every appointment linked
  to the lead** (all statuses), **on-demand via `report=true`** on lead SEARCH → each row carries
  `stats.followUps` (batched `$in: leadIds` aggregate over `AppointmentModel`, one query for the page).
  Own-scoped via the same `where` as the list. No model change (`Appointment.lead` ref already exists).
  Note: this is on the **search** endpoint, distinct from the existing `GET /leads/report` summary
  facet. `tsc` clean. Files: `lead.validators.ts`, `lead.service.ts`, `lead.mapper.ts`.
  **Follow-ups own-scope (appointment-level permission) — WON'T FIX for now (user decision 2026-10-01).**
  The newer frontend brief flagged that `getLeadActivityStats()` applies NO appointment-level permission
  scoping — any `lead:search` caller gets full appointment/MoM/follow-up counts regardless of
  appointment-read authority (an `appointment:search`-only rep would normally see only appointments they
  own/attend). **User's call: leave it** — these are aggregate COUNTS (a number), not actual appointment
  data (no agenda/contact/notes exposed), and the counts only ever appear on leads the caller can already
  see (leads stay own-scoped). It's a count-level exposure only, accepted. ⚠️ REVISIT IF the count tiles
  ever become click-through/drill-downs to the real appointments — that would expose real data and the
  3-way scope check (manager → full / `appointment:search`-only → own+attended / no-appointment-read →
  omit) becomes necessary. No code change.
- Filter bar search scope — ✅ DONE (2026-09-29). Added **separate** `code` (regex) + `focusTherapy`
  (regex, matches any therapy in the lead's list) search filters to lead search (`title` already
  existed). **NO combined `q`/`$or` box** — frontend combines the fields client-side. Ref-name matching
  (contact person / company name) **deferred to frontend** (same name→id resolution issue as the
  project client-name pointer). Note: param is `focusTherapy` (matches the model field), not `therapy`.
  `tsc` clean. Files: `lead.validators.ts`, `lead.service.ts`.

## Appointments — 🟡 IN PROGRESS (2/6 done, 1 invalid, 3 remaining)

- Free-text `location` field on Appointment — ✅ DONE (2026-09-30). Added a free-text `location` string
  to the model (default `''`), independent of `mode`/`destinationLink` — an online meeting can still
  carry a location. Accepted on create + update (optional), applied in `set()` (`!== undefined` guard,
  so it can be set or cleared), surfaced in both `toResponse` + `toSearchResponse`. Controller/routes
  untouched (schema-driven; Swagger auto-derives). Aligns the frontend's previously-stale
  `AppointmentEntity.location?` type with a real backend field. `tsc` clean.
  Files: `appointment.{model,validators,service,mapper}.ts`.
- Leads calendar view — ✅ DONE (2026-09-30, as per-lead activity counts). Built by broadening the
  existing `report=true` per-row stats helper on **lead SEARCH** (same mechanism as tenant's
  `getTenantStats` + the earlier follow-ups work — NOT the standalone `GET /leads/report` facet).
  Renamed `getLeadFollowUpStats` → `getLeadActivityStats`; the single batched `$in:leadIds` aggregate
  over `AppointmentModel` now returns per row `stats: { appointments, moms, followUps }` —
  `appointments` = all linked appointments; `moms` = those with `mom.submittedAt` set;
  **`followUps` = only `type:'follow-up'` appointments** (user's call — was previously all linked).
  **`payment-touches` DROPPED** (no payment→lead relation exists — unbacked, same class of gap as
  Avg AI Score). No N+1, own-scoped via the list's `where`. ⚠️ NOTE: this delivers per-lead activity
  **counts**, not a true date-gridded calendar — if the frontend needs meetings placed on specific
  days, that's a separate date-bucketed query. `tsc` clean.
  Files: `lead.service.ts`, `lead.mapper.ts`.
- MOM 24-hr SLA auto-block + RM-release workflow — ❌ INVALID (will not be built). Depends on a 5th
  `blocked` status that was entirely removed by an earlier requirement (2026-08-11). Reintroducing it
  would reverse that decision. Void as written.
- Peer overlay ("BUSY, agenda hidden") — ⬜ NOT DONE (deferred — save for later, user's call 2026-09-30).
- InternalMembersPicker live-availability badges — ⬜ NOT DONE (deferred — save for later, user's call
  2026-09-30; same busy/free engine as Peer overlay).
- Weekly planning panel — ⏸️ DEFERRED / LATER TODO (user's call 2026-09-30). Largest gap — a brand-new
  `weekPlan` entity (per-rep weekly targets + submit→approve→completed state machine, Sales-Head-gated
  approval). Needs a data-model design pass before any code; parked for a dedicated future session.

## Camp Management — 🟡 PARTIAL (1 done · 2 deferred-TODO · 1 later-refactor · 4 need-discussion)
<!-- Standing here for now (2026-09-30). Done: filter-bar search (code filter). Deferred/TODO: per-tab
     status-scoped report, historical bulk upload. Later refactor: report()-vs-search() own-scope.
     NEEDS DISCUSSION (blocked on new Camp fields / missing features, resolve in a future session):
     9-way taxonomy, multi-role staffing, camp drawer 4-tile KPI row, tele-consult tab, BCA/device-fault.
     Most of these unblock together once outcome fields (actual patient count + completion marker,
     Rx, ratings, staffing roles) are added to the Camp model — a field-addition design decision. -->


- 9-way stage taxonomy (needs completion-tracking fields) — 🗣️ NEEDS DISCUSSION → resolve later
  (user's call 2026-09-30). Blocked on new Camp fields: a completion marker (was patient-count/photo
  data captured?) to split `closed` → Completed vs Completed·Pending, and an FO-assigned distinction
  to split Requested vs Upcoming. Requires a field-addition decision before any code.
- Multi-role staffing + "Missing `<Role>`" warnings — 🗣️ NEEDS DISCUSSION → resolve later
  (user's call 2026-09-30). Camp has only a single `fo` field; needs new staffing fields (dietitian /
  lab-tech / manpower) or a separate staffing-assignment model. Field/model decision owed.
- Bulk upload (historical CLOSED camps) — ⏸️ DEFERRED / TODO (user's call 2026-09-30). NOT a simple
  clone of the doctor/MR bulk upload: camp create requires 5 ObjectId refs (tenant/division/doctor/
  **required mr**/optional project) + full `location` with **coordinates**, and has side effects we
  must NOT run for history (FO geo auto-allocation, slot-overlap checks) and starts at `requested`
  not `closed`. Needs a dedicated historical-import path (human-readable code/name → id resolution,
  skip allocation + overlap, land directly as `closed`) + 3 decisions first: (1) refs by code or
  name? (2) is `mr` required for historical camps? (3) are coordinates required? Design pass owed.
- `report()` vs `search()` own-scope inconsistency — ⬜ DEFERRED (**LATER REFACTOR**, same as Projects #4).
- BCA scale flag + device-fault "ON HOLD" pill — 🗣️ NEEDS DISCUSSION → resolve later (user's call
  2026-09-30). Depends on device-calibration/fault-tracking concepts not present in the backend.
- Filter bar search scope (free-text cross-field) — ✅ DONE (2026-09-30, via separate filters — no
  combined `q` box, same pattern as the lead/project pointers). Added a **`code` regex filter**
  (case-insensitive) to `SearchCampQuerySchema` + `search()`. Camp search now offers `code` + the
  already-existing `tenant`(client)/`project`/`division`/`doctor`/`fo`/`status`/`type`/`billingType`/
  `city`/`state`/`dateFrom`/`dateTo` — the frontend drives its single search box by matching `code`
  + `city` directly and resolving **doctor-name / client-name → id client-side** then using the
  existing `doctor`/`tenant` id filters (same name→id resolution choice as the project client-name
  pointer; doctor/client names aren't stored on the camp, only their ids). Also tidied `search()`'s
  filter block to braces-on-every-`if` (style only, no behavior change). `tsc` clean.
  Files: `camp.validators.ts`, `camp.service.ts`.
- Tele Consultation tab (no teleconsult type/flag) — 🗣️ NEEDS DISCUSSION → resolve later (user's call
  2026-09-30). No teleconsultation type or flag exists on the Camp model (`CampType` = screening/diet/
  lab only). A real missing feature, not a filter to add. Field/type decision owed.
- Per-tab type-breakdown status-scoped report — ⏸️ DEFERRED / TODO (user's call 2026-09-30). Solution
  is known + small: add an optional `status` param to `CampReportQuerySchema` + `report()`'s `$match`
  so the byType chips scope to the current tab (frontend then calls report twice — once unscoped for
  the tab strip, once with `?status=<tab>` for the chip row). Parked, not built.
- Camp drawer 4-tile KPI row (patients/rx/feedback/FO rating fields) — 🗣️ NEEDS DISCUSSION → resolve
  later (user's call 2026-09-30). Needs 4 new Camp fields (patients done / Rx count / patient feedback
  rating / FO rating); only `patientExpectation` (the target) exists today. Shares the patient-count
  root with the 9-way taxonomy + the CRM Invoicing additional-patient-billing pointer. Field decision owed.

## CRM Invoicing — 🟡 IN PROGRESS (2 done 2026-10-01; rest blocked/deferred)

- Pipeline KPI strip totals (`/invoices/report`) — ✅ DONE (2026-10-01, UNCOMMITTED, `tsc` clean).
  New `GET /invoices/report` mirroring `project.report()`/`camp.report()` — one `$facet` aggregation
  returning `{ totalInvoices, totalInvoiced, statusCounts:[{status,count,total}] }`. **Global by default
  for a platform actor** (`ctx.where()` returns `{}` for PLATFORM tenant type) / own-tenant for a customer;
  **optional** `tenant`/`project`/`dateFrom`/`dateTo` filters narrow it for detail views (Option A, user's
  call) — `tenant` honoured only if not already pinned, `tenant`/`project` `toObjectId()`-cast for the
  `$match`. Route registered BEFORE `/:id`, guard `[invoice:search, invoice:manage, tenant:manage]` +
  `reportRateLimiter`. Shape verified against `InvoicePipelineKpiStrip.tsx` — its 4 tiles (Total invoiced /
  Pending approval / Payment outstanding / Payment cleared) all derive from `statusCounts` + `totalInvoiced`.
  ⬜ Frontend still wires it (switch the strip from page-array sums to the report). Files:
  `invoice.{validators,service,controller,routes}.ts`.
- Invoice card richer subtitle + stats line — 🟡 PARTIAL (2026-10-01, UNCOMMITTED, `tsc` clean).
  **Done (backable):** extended the invoice `project` populate to `name code status division executionMode`
  + nested-populate `division {name,code}` → feeds the card's **Client · Division · PO** subtitle (Client =
  already-populated `tenant`, Division = `project.division`, PO = `project.executionMode.poNumber`); added a
  batched per-invoice **`lineItemCount`** (one `InvoiceLineItemModel` aggregate grouped by invoice, no N+1) →
  the card's **N camps** stat. Tally = existing `syncToTally`. **Blocked (card omits these — no backing
  field):** N addl patients (needs Camp actual-patient-count), N void (needs Multi-PO/VOID), N FOC (needs the
  FOC field — pointer below). ⬜ Frontend extends `InvoicePopulatedProject` type (division/executionMode) +
  reads `lineItemCount`. Files: `invoice.service.ts`, `invoice.mapper.ts`.
- Tally invoice number capture (`tallyInvoiceNo`) — ⏸️ DEFERRED (user's call 2026-10-01: Tally is "for
  later" — both the `syncToTally` push and the number capture stay pending).
- PO-quantity matching + VOID overflow — ⬜ NOT DONE (depends on Multi-PO model).
- FOC camps — ⬜ NOT DONE (next buildable invoice-direct item: `foc`/`focReason` on InvoiceLineItem).
- Additional-patient billing — ⬜ NOT DONE (needs Camp patient-count + Project rate).
- Chargeability-approval workflow — ⬜ NOT DONE (new state machine on Camp).
- GRN signed-copy capture — ⬜ NOT DONE (finance-flow adjacent; maybe deferred with Tally).
- Per-camp remarks thread — ⬜ NOT DONE (on Camp model).
- Excel / photo-collage export (client-side; no backend) — ⬜ NOT DONE.

## Inventory Management — ⬜ NOT STARTED

- Vendor scorecard (scores/complaint/price-history) — ⬜ NOT DONE (no backing model).
- Device calibration action (`PATCH .../calibrate` + ledger entry) — ⬜ NOT DONE. (Ledger module
  exists and can be reused.)

---

## Notes

- ~~Everything above is **uncommitted**~~ → **now COMMITTED** on branch `fixes/feedback` (2026-09-29):
  Client Management 6/6 across `8525fdd` (MR count) / `d9d60b1` (invoice tenant filter) / `a8c3e80`
  (project type breakdown) / `8da03eb` (tenant city/state) / `a0b5b22` (division stats); Project
  `3a7a002` (executed-camp count) / `6f5e006` (code search); mapper decoupling `8b3c7dc`.
  `tsc --noEmit` clean after each change. This file itself remains untracked.
- New pattern established this session: a `report=true` flag on a **search** endpoint returns extra
  aggregations (top-level summary and/or per-row `stats`) scoped to the exact same filters + own-scope
  as the list — used by tenant, project, and division searches. Prefer this over separate report
  endpoints for list/detail KPI needs.
