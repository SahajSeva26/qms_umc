# Dietitians Section — Independent Build-vs-Prototype Audit (2026-07-20)

**Why this exists:** after building all 3 previously-stubbed "Dietitians" nav-section screens
(Diet Coord Workspace, Dietitian Payment, Dietitian Profiles) in one long pass, the same discipline
established for the earlier Field Network round was applied here without waiting to be asked:
an independent audit before calling the round "done." 3 fresh agents, with zero access to the
earlier build specs, independently re-read the *actual* prototype source and diffed it directly
against the *actual* built component files.

**Method:** same as `RESEARCH_field_network_audit_2026-07-19.md` — each audit agent read the full
prototype JS (diet-approvals.js 1099 lines + diet-rates-modal.js 429 + diet-invite-modal.js 214;
dietitian-payment.js 1058 lines; dietitian-profile.js 506 lines) plus the shared om-data.js
functions each screen calls, then read every built file for that screen in full, then reported
concrete file:line discrepancies.

**Overall verdict: all 3 screens are faithful, high-fidelity ports.** No missing tabs, no missing
modals, no missing hard-gate business rules (approval gates, 24h reopen-window reset, deny-reason
requirement, bank validation regexes, CSV column orders, reconciliation grouping/idempotency math,
BCA warnings) — every one of those checked out exactly. The real gaps found were narrower and more
surgical than the Field Network round: mostly concentrated in the shared `dietitians.service.ts`
data layer rather than the UI components, which were almost universally correct renderers of
whatever the service handed them. **All findings below have been fixed in this same session.**

---

## 1. Diet Coord Workspace — cleanest of the three

Every tab (Dashboard, Assign dietitian, My diet projects, Reopen requests, Dietitians & bank) and
every modal (2-step Assign/Rates, Invite, Add Dietitian, Bank details) matched formula-for-formula,
including two things that would have been easy to get wrong: the dashboard's dead/always-true
"rolling" ternary quirk was deliberately preserved (not silently "fixed"), and the prototype's
genuinely-unreachable dead code (`tabPending`/`tabHistory`/`proposalCard`/`daApprove`/`daReject`)
was correctly and deliberately excluded rather than accidentally ported.

**Real gap found and fixed:** `doctorPreferredDietitians()`/`dietitianDoctorHistory()` in the shared
service layer incorrectly added a `status === 'CLOSED'` filter that doesn't exist in the prototype
(`om-data.js:1251-1268` counts/dates over *all* matching Diet camps regardless of status). This
affected the "★ DOCTOR'S PICK" badge and same-doctor camp-count display in both the Assign/Rates
picker and the Invite modal. **Fixed**: removed the status filter from both functions.

**Documented gap, not fixed (architectural):** `poCampCost()` only implements 2 of the prototype's
4 priority-chain branches (missing the per-camp `poId` → `proj.pos[]` lookup), since the React
`Camp`/`ClientProject` types don't carry a `poId`/`pos[]` array at all. Currently harmless — every
seeded Diet project populates `campCost` directly — but flagged for whoever eventually builds a
real PO-management data model.

**Minor, not fixed (low-impact UX divergence):** the Invite modal's default pre-checked rows use
"first 3 not-yet-invited" instead of the prototype's literal "first 3 by ranked-array index, no
backfill." Cosmetic pre-check convenience only — user can still tick/untick any row.

---

## 2. Dietitian Payment — most gaps, one genuinely consequential

**Real gap found and fixed (highest priority):** `isAdminLike()` — shared with Diet Coord
Workspace — used that screen's role set (`admin/super_admin/om_diet/om_screening`) for *this*
screen too, silently dropping `accounts` (which `dietitian-payment.js`'s own header comment
explicitly promises "everyone (read-only finance view)" access) and adding `om_screening`, a role
never mentioned in this prototype file at all. This changed who could see the full portal, record
payments, and run finance reconciliation on a payments screen — the kind of scoping bug that
matters most on exactly this kind of screen. **Fixed**: split into two functions —
`isAdminLike()` (Diet Coord Workspace's set, unchanged) and a new `isPaymentAdminLike()`
(`admin/super_admin/om_diet/accounts`, matching `dietitian-payment.js:53` exactly) — and repointed
`DietitianPaymentPage.tsx` at the correct one.

**Real gap found and fixed:** `isReportComplete()` (the actual PENDING→READY→PAID eligibility gate,
shared by all 3 screens) and `ViewCampsModal`'s report-completeness pills only checked
`camp.photos`, dropping the prototype's `camp.submissionData.photos` fallback entirely — because
the `Camp` type had no `submissionData` field to check in the first place. **Fixed**: added
`submissionData?: { photos?: string[] }` to the shared `Camp` type and restored the fallback check
in both `isReportComplete()` and `ViewCampsModal.tsx`.

**Real gap found and fixed:** the payment-ready CSV export picked `bankAccountsFor(id)[0]` (literal
array index 0) instead of the prototype's `dietBank()`, which finds the first account that actually
has an `accountNumber` set. Narrow edge case (multiple accounts, first one incomplete) but a real
value-correctness gap in exported bank data. **Fixed**: now finds the first account with a truthy
`accountNumber`, falling back to index 0 only if none qualifies.

**Real gap found and fixed:** the finance-reconciliation importer treated a matched-camp-with-no-
dietitianId as `notFound` (camp not found), when the prototype (`dietitian-payment.js:945`) falls
back to the CSV row's own `Dietitian_ID` column in that case — the camp *was* found, it just had no
dietitian assigned yet. **Fixed**: added a `Dietitian_ID`/`dietitianId` column lookup and used it as
the fallback before giving up.

**Real gap found and fixed:** `AddPaymentModal`'s two required file inputs (Excel sheet, photos)
were validated for presence but the files were never attached to the resulting payment ledger
entry — the `documents` field the `DietPayment` type already supports was left empty. This went a
step beyond the disclosed "existence-check only" simplification. **Fixed**: the filenames are now
persisted onto the ledger entry's `documents` field.

**Cosmetic, not fixed:** 4 of the 6 KPI tiles use the shared `KpiTile` component's neutral value-text
color instead of the prototype's literal per-tone text coloring (an app-wide design-system
convention affecting 43 files elsewhere, not a screen-specific regression — left as-is).

---

## 3. Dietitian Profiles — 3 real data-layer bugs, UI layer clean

All 18 component files were confirmed to be correct renderers of `dietitianProfileBundle()`'s
output — the bugs found live entirely in that bundle function and its dependencies, not in how the
UI displays what it's given.

**Real gap found and fixed:** the `upcoming` camp count inside `dietitianProfileBundle()` added an
undisclosed `date >= today` gate that doesn't exist in the prototype (`om-data.js:1349` defines
"upcoming" as simply "not CLOSED and not cancelled," no date comparison at all). This directly
affected the visible "Total camps" KPI sub-label. **Fixed**: removed the date gate, matching the
prototype's status-only definition exactly.

**Real gap found and fixed:** `dietitianOnboardingComplete()` was missing the prototype's
`if (d.real === true) return true` short-circuit (`om-data.js:288-295`). Currently masked only
because `OnboardingSection.tsx` happens to branch around real dietitians before ever calling this
function — but the shared service function itself silently diverged from the source, a latent bug
for any future caller. **Fixed**: added the short-circuit.

**Real gap found and fixed:** the prototype's contact-info fallback chain (`det.email || d.email`,
`det.phone || d.phone` — a per-dietitian `details` overlay that can override the roster record's
own contact info) had no equivalent field on the React `DietitianDetails` type at all, so
`HeroHeader` and `PersonalHrCard` could never reflect an overridden contact detail. **Fixed**: added
optional `email`/`phone` fields to `DietitianDetails` and restored the fallback chain in both
components.

**Cosmetic, not fixed:** minor label-spacing differences ("Rate/camp default" vs "Rate / camp
(default)"), a missing `₹` prefix on the Rate Trend table's Total column (header already says
"Total ₹"), and Payment Ledger's empty-state text saying "payments" instead of "payouts." A few
disclosed *improvements* over the prototype were also confirmed accurate: the payment ledger's
sort-by-`paidAt`-desc (prototype has no sort at all), and Camp History's "+N more" indicator
(prototype silently truncates with no such affordance).

---

## Fix Pass — Completed 2026-07-20

All 8 real (non-cosmetic) findings above were fixed in this same session:

1. `isAdminLike()` split into `isAdminLike()` (Diet Coord Workspace) + new `isPaymentAdminLike()`
   (Dietitian Payment, restoring `accounts`, removing `om_screening`) — `dietitians.service.ts`,
   `DietitianPaymentPage.tsx`.
2. `doctorPreferredDietitians()`/`dietitianDoctorHistory()` — removed the incorrect
   `status === 'CLOSED'` filter — `dietitians.service.ts`.
3. `dietitianOnboardingComplete()` — added the missing `d.real` short-circuit —
   `dietitians.service.ts`.
4. `dietitianProfileBundle()`'s `upcoming` filter — removed the undisclosed `date >= today` gate —
   `dietitians.service.ts`.
5. `isReportComplete()` + `ViewCampsModal` — restored the `submissionData.photos` fallback; added
   `submissionData?: { photos?: string[] }` to the shared `Camp` type — `dietitians.service.ts`,
   `camp.types.ts`, `ViewCampsModal.tsx`.
6. Payment-ready CSV export — bank account selection now prefers the first account with a truthy
   `accountNumber` instead of array index 0 — `DietitianPaymentPage.tsx`.
7. Finance-reconciliation importer — added a `Dietitian_ID` CSV-column fallback for camps missing
   their own `dietitianId` — `DietitianPaymentPage.tsx`.
8. `AddPaymentModal` — attached filenames are now persisted onto the payment ledger's `documents`
   field instead of being discarded after validation — `AddPaymentModal.tsx`.
9. Email/phone details-overlay fallback restored — added `email`/`phone` to `DietitianDetails`,
   updated `HeroHeader.tsx` and `PersonalHrCard.tsx` — `dietitians.types.ts` + both components.

**Verification**: `npx tsc -b --noEmit --force` clean, `npm run build` clean (only pre-existing
chunk-size/CSS-import warnings). Not re-verified live via Playwright after this fix pass — the
fixes are narrow, type-checked, and mostly affect display formulas/edge cases rather than page
structure, so a full re-screenshot pass wasn't run; recommend a spot-check next session before
considering this fully closed out the way the Field Network round's fix pass was.
