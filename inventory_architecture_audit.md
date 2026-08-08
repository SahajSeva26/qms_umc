# Architecture Audit — `features/inventory`

**Scope note:** the requested summary/ranking template assumes four features, but the review instructions explicitly restrict this pass to **one** folder: `frontend/src/features/inventory`. This document reviews only `inventory`. As with the equivalent `hq` audit, no cross-feature ranking is produced here — only one feature was in scope.

**Method:** every file in `features/inventory` was read in full (25 files, 12,572 lines — the largest single feature reviewed so far, over 3× the size of `hq`). Given the volume, the read-through was split across three parallel review passes (service+types layer; hooks/page/five largest tabs; the remaining sixteen tab components), and every finding below was then independently spot-verified against the actual source before being included in this report — nothing here is taken on trust from a single pass.

---

## 1. Folder Structure

```
inventory/
  inventory.types.ts        (909 lines)
  inventory.service.ts       (3,570 lines — ~108 exported functions, 15 localStorage keys)
  hooks/useInventory.ts      (776 lines, ~30 hooks)
  pages/InventoryPage.tsx    (209 lines)
  components/                (20 files, ~6,800 lines combined)
```

| Expected | Present? | Finding |
|---|---|---|
| `pages/` | ✅ | Single orchestrator page, correctly scoped. |
| `components/` | ✅ | 20 tab/modal components — flat, no sub-grouping (unlike `hq`, which nests into `hqmapping/tabs`/`hqmapping/mapping`). At 20 files this is borderline — not yet a problem, but see §8. |
| `hooks/` | ✅ | One large file, ~30 hooks, uniform pattern (see §3). |
| `services/` | ✅ (`inventory.service.ts`) | Present, but **critically oversized** — see the Critical finding below. |
| `schemas/` | ❌ **Missing entirely** | Zero Zod schemas anywhere — confirmed via `Glob` (no `schemas/` folder) and grep (zero `zod` imports in all 25 files). |
| `store.ts` | ❌ Absent | **Correctly absent** — no Zustand anywhere in this feature, and nothing here needs global state. Positive finding, not a gap. |
| `routes.tsx` | ❌ Missing | Same systemic pattern already documented for `hq`/`reminders` — `InventoryPage` is routed from `admin/admin.routes.tsx`, not its own file. Not re-flagged as inventory-specific; it's a repo-wide convention gap. |
| `utils/`/`constants/` | ❌ Not present | All formatting/threshold helpers live inline in `inventory.service.ts` rather than a dedicated `utils/`. Given the file's size, this compounds the God-file problem (see below). |

### [Critical] `inventory.service.ts` is a 3,570-line God file spanning 13+ unrelated bounded contexts.

- **Problem:** One file contains, each with its own localStorage-backed store and full CRUD/mutation API: item-master catalog, device fleet + calibration, movements ledger, dietitian roster, warehouse network, transfers/logistics, vendors + price history, procurement (PR→PO→GRN pipeline), allocations ledger, field-ops (refills/reports/local-procure), forecasting, dashboards aggregation, an "AI copilot" data builder, and an audit-event log.
- **Why it's a problem:** This is not "one feature's service layer" — it's at least 10 independent domains that each deserve their own module. A single file this size makes it structurally impossible for two people to work on different parts of Inventory without touching the same file, and makes code review of any single change disproportionately hard (the reviewer must scroll through unrelated domains to find the actual diff context).
- **Production impact:** Every future change to *any* inventory domain (adding a procurement field, tweaking calibration logic) carries incidental risk to *all* other domains sharing the file, and the practical review/testing burden for even a small change is inflated.
- **Suggested improvement:** Split into per-domain modules (e.g. `itemMaster.service.ts`, `fleet.service.ts`, `procurement.service.ts`, `fieldOps.service.ts`, `dashboards.service.ts`, `warehouse.service.ts`), or treat Inventory as a set of sub-features. Not attempted here — review only.

---

## 2. Separation of Concerns

The **hook layer is genuinely clean**: `useInventory.ts`'s ~30 hooks are uniformly `useQuery`/`useMutation` wrappers over `inventory.service.ts`, with `useMemo` used only for pure re-derivations — no business logic embedded in the hook file itself. Components correctly call hooks, not the service or raw `localStorage`, in the overwhelming majority of cases.

However, several components leak real business logic that belongs in the service layer:

### [Major] Business logic embedded directly in UI components.
- **`DashboardsTab.tsx:344-346`** — the actual depreciation formula (WDV vs straight-line) is computed inline in `DepreciationScheduleTable`: `Math.round((it.currentValue || it.purchaseCost || 0) * (it.deprPct || 0) / 100)`. A financial calculation, not a rendering concern.
- **`ProcurementTab.tsx:718-740`** — `GoodsReceiptModalBody` locally defines its own `todayPlusDaysIso()` helper and builds batch/invoice-number defaults (`B${...}-${24300+grnCount}`, `VINV-${5600+grnCount}`) inline — duplicating logic the service layer *already has* in `openGrnDefaults()` (`inventory.service.ts:2234`), which has **zero call sites anywhere** (confirmed by grep — dead code, see §10).
- **`TransfersTab.tsx:77-80`** — `Math.min(sg.need, sg.suggestion.qty)`, a real stock-allocation decision, computed inline in the component.
- **`WarehouseTab.tsx:32-36`** — reorder-threshold logic (`qtyOnHand <= reorderLevel`) reimplemented inline instead of calling the service's existing threshold logic.
- **`ForecastTab.tsx:93-96`** — camp-window filtering does raw millisecond date math (`(date - now)/86400000 <= win`) directly in the component.
- **Why it's a problem:** duplicates and risks diverging from the canonical service-layer logic; violates the project's own "business logic never lives in UI components" rule.
- **Production impact:** the `openGrnDefaults`/`GoodsReceiptModalBody` case is the clearest example — two independent implementations of "how do we generate a GRN batch/invoice number" exist today, and only one is actually wired up. A future fix to one won't propagate to the other.
- **Suggested improvement:** move each calculation into `inventory.service.ts` (or its post-split successor) and have the component call it.

---

## 3. React Architecture

- **Effects:** genuinely excellent — **zero `useEffect` calls found anywhere in all 25 files.** No dependency-array bugs, no infinite-loop risk, nothing to convert to `useMemo`, because there is simply nothing there.
- **State placement:** clean. No component holds server/persisted data in local `useState`; all such data flows through `useInventory.ts`. `useState` is confined to genuine local UI concerns (filters, modal-open state, form drafts).
- **Prop drilling:** none found beyond one hop.
- **Component size:** the 5 largest tabs (`ProcurementTab.tsx` 932, `FieldOpsTab.tsx` 823, `DashboardsTab.tsx` 632, `ItemMasterTab.tsx` 605, `TransfersTab.tsx` 539 lines) are large but not unreasonable for the amount of genuinely distinct UI each renders (multiple sub-modals, multiple table views) — the size itself isn't the smell; the embedded business logic inside them is (see §2).
- **Reusability/composition — this is the feature's weakest React-architecture area** (see §10 for full detail): status/tone pill components, sticky filter-bar shells, table-card wrappers, and empty-state rows are each reimplemented independently 5-9 times across sibling components instead of being extracted once, despite the project already having a shared `KpiTile` component in `components/ui/` that three different local KPI-tile implementations bypass entirely (`FOInventoryTab.tsx:36`, `InventoryKpiStrip.tsx:35`, `DevicesTab.tsx:129`).
- **Minor:** `useWarehouseNetwork` (`useInventory.ts:164-179`) carries an `eslint-disable-next-line react-hooks/exhaustive-deps` because it reads an implicit shared localStorage-backed module store rather than taking data as explicit arguments — a fragile pattern (the disabled lint rule is exactly the kind of thing that hides a real staleness bug later), though not causing a confirmed bug today.

---

## 4. API Layer

No backend exists for this module (mock/localStorage only, consistent with the rest of the app's still-mock features) — evaluated as a mock API layer:

- **[Clean]** No raw `axios`/`fetch` calls anywhere in the feature.
- **[Clean]** Every localStorage read/write found (grep-confirmed, ~15 key pairs) is wrapped in try/catch with a documented private-mode degrade fallback — no unguarded storage access anywhere in 3,570 lines.
- **[Major] 15 near-identical hand-rolled `load()`/`persist()` try/catch pairs** instead of one generic `loadStore<T>(key, seed)`/`persistStore<T>(key, value)` helper — e.g. `inventory.service.ts:188-202` (items), `602-617` (units), `830-845` (movements), `1067-1081` (dietitians), `1212-1226` (transfers), `1356-1370` (vendors), `1442-1456` (price history), `1782-1826` (PRs/POs/GRNs — three near-identical copies back to back), `2449-2478` (refills/reports). Pure copy-paste boilerplate; a single generic helper would remove ~150 lines of repeated risk surface (e.g. some stores guard with a `_v` version key, others don't — an inconsistency this duplication makes easy to introduce).
- **Duplicate request risk, low severity:** `InventoryPage.tsx:104` independently calls `useDeviceFleetUnits()` just to feed `units` into `LogMovementModal`, while several tabs already fetch the same data — harmless today only because the TanStack Query key (`['inventory','units', people.length]`) is identical and dedupes the request, but it's a second independent mount point relying on that key staying in sync.
- **No pagination anywhere** — acceptable at current mock-data scale (see §8 for why this won't hold at real scale).

---

## 5. Zustand

**Verdict: correctly not used.** Zero Zustand anywhere in this feature — confirmed across all 25 files. All state is either TanStack Query (server-shaped mock data) or genuinely local `useState` (filters, form drafts, modal state). This is the *correct* call per the project's own rule and matches the same positive finding from the `hq` audit.

---

## 6. Zod

### [Critical] Zero Zod validation anywhere in the entire feature, including on real, currently-shippable user-input forms.

- **Problem:** No `schemas/` folder, zero `import { z } from 'zod'` in any of the 25 files. Every form/modal validates (if at all) with ad hoc manual `if` checks:
  - `ProcurementTab.tsx` — `NewPrModal.handleSave` (~514-516), `GeneratePoModal.handleSave` (~619-629), `GoodsReceiptModalBody.handleSave` (~750-760): **no validation at all.**
  - `ItemMasterTab.tsx:304-308` — a single `if (!form.name.trim())` guard across a ~30-field form.
  - `LogMovementModal.tsx:69-72` — one manual check (`if (!form.unitId)`); `date`/`from`/`to`/`notes` are unvalidated.
  - `VendorsTab.tsx:99-102` — `if (!form.name.trim())` only; no format checks on GST/PAN/email/phone despite those fields existing on the form.
  - `WarehouseTab.tsx:41-48` (`handleCreateTransfer`) — manual `from===to`/`!qty` checks, no schema.
- **Why it's a problem:** directly contradicts the project's own explicit rule ("Validation should use Zod"). This is not a hypothetical gap — these are live, reachable forms in a feature the previous developer considered "done."
- **Production impact:** a user can submit a PR/PO/GRN, a stock movement, a new vendor, or a transfer with empty/malformed required fields (dates, quantities, contact details) and the mock persistence layer will accept it silently, corrupting the demo dataset in ways that are hard to trace back to their source.
- **Suggested improvement:** add `features/inventory/schemas/` with at minimum schemas for the PR/PO/GRN forms, the movement-log form, the vendor form, and the transfer form — mirroring the pattern already established in `contacts`, `access-management`, etc.

---

## 7. Hardcoded Values

A large number of business-rule thresholds and magic values are hardcoded directly in service/component code instead of a shared config or constants layer:

| Value | Evidence | Severity |
|---|---|---|
| Calibration due window (14 days) | `inventory.service.ts:699` | Major |
| Expiry bands (30/90/180 days) | `inventory.service.ts:434-436` | Major |
| Consumable reorder thresholds (50%/100%) | `inventory.service.ts:137-138` | Major |
| Idle-asset threshold (<40% deployed) | `inventory.service.ts:3392` | Major |
| Price-alert threshold (>8% change) | `inventory.service.ts:2855` | Minor |
| Camp-readiness scoring weights (0.20/0.25/0.25/0.15/0.15) | `inventory.service.ts:2773` | Major |
| Vendor score tone thresholds (88/78) | `inventory.service.ts:1542-1544` | Minor |
| AMC-applicable threshold (`pricePerUnit > 20000`) | `inventory.service.ts:268` | Major |
| Default GST rates (12%/18%) scattered inline | `inventory.service.ts` (multiple), `ItemMasterTab.tsx:132,210` | Major |
| Fixed depreciation assumptions (`warrantyYears: 2`, `usefulLifeYears: 5`, `deprPct: 20`) | `inventory.service.ts:286,295,297`; `ItemMasterTab.tsx:164` | Major |
| Default logistics costs (courier ₹150, freight ₹100, packaging ₹50, handling ₹40) | `TransfersTab.tsx:347-350` | Minor |
| Hardcoded default expiry window (365 days) | `ProcurementTab.tsx:721` | Minor |
| Reference-number offsets, one invented per domain (`MV-1100+`, `PO-7100/7300/7400+`, `GRN-9100/9200+`, `PR-5000/5100/6000+`) | `inventory.service.ts` (scattered) | Minor |
| Hex colors duplicated instead of shared tokens (`#059669`/`rgba(16,185,129,.15)` in 7+ files; `#e11d48`/`rgba(244,63,94,.15)` in 7+ files) | See §10 | Major |
| `KPI_TONE_COLOR` re-hardcodes the app's own `--qms-brand`/`--qms-teal` hex values | `DashboardsTab.tsx:27-33` | Major |

**Why this matters:** the root project's own rules explicitly state business rules belong in a config layer, not hardcoded in frontend code — and this codebase's own history log documents a real incident where a hardcoded-vs-token color drift had to be fixed once already app-wide. These are the same class of risk, just not yet caught.

---

## 8. Scalability

- **At current size (20 components, one 3,570-line service):** already showing real strain — this is not a "future" problem, it's a present one. The service file is 8.5× larger than the equivalent file in the `hq` feature audited earlier, which was itself already flagged as an oversized God file at 417 lines.
- **At 10 more screens:** the flat `components/` folder (already 20 files) would need sub-grouping (mirroring `hq`'s `tabs/`/`mapping/` split) to stay navigable; the service file would need to have started splitting well before this point.
- **At 30 screens:** the duplicated status-pill/filter-bar/table-card patterns (§10) would have propagated to 15-20+ reimplementations instead of today's 7-9, multiplying the cost of any visual-system change: with no shared UI primitives extracted today, every new tab will keep re-copying the same patterns rather than reusing one.
- **At 100 screens:** the current architecture would not survive without a hard split of the service layer into domain modules and extraction of the repeated UI shells into shared components — both changes are tractable today (this file/pattern set is well-organized *within* its duplication, just not deduplicated) but become progressively more expensive to retrofit the longer they're deferred.
- **The good news:** because the hook layer is already clean (thin, consistent `useQuery`/`useMutation` wrappers) and there are zero `useEffect`s to untangle, a service-layer split and a shared-component extraction pass would be mechanical, low-risk refactors — not a rewrite. The scalability risk is real but not yet structurally locked in.

---

## 9. Performance

This is the feature's **strongest area** — no confirmed re-render bugs, no effect loops, stable list keys throughout.

- **[Clean]** Zero `useEffect` anywhere — nothing to cause redundant fetches or infinite loops.
- **[Clean]** All table/list renders use stable domain keys (`.id` fields) — no missing-key risk.
- **[Minor]** Memoization is inconsistently applied but not currently harmful: `FieldOpsTab.tsx:52` memoizes `pendingRefills`, while `ProcurementTab.tsx:108-109` computes shape-identical `pendingPrCount`/`awaitingPoCount` unmemoized every render — at current (mock, small) data volumes this is invisible, but is the same category of unmemoized-derivation smell that becomes real once data volumes grow (see §8).
- **[Minor]** No large-dataset computation was found running unmemoized in a way that would visibly matter today — this is a "watch it, don't fix it yet" item, not an active bug.

---

## 10. Maintainability

This is the section with the largest concrete finding volume — cross-file duplication across the 16 smaller tab components is extensive.

### [Major] The same "status/tone pill" visual pattern is independently reimplemented in at least 9 files.
`WarehouseTab` `StatusPill` (233-242), `ForecastTab` `ImBand` (29-36), `FOInventoryTab` `BandPill` (22-32), `DeviceDetailDrawer` `StatusPill` (23-33), `ExpiryFEFOTab` `BandPill` (49-59), `ConsumablesTab` inline span (155-160), `CalibrationTab` inline span (136-141), `AuditTab` `TypePill` (56-65), `MovementsTab` `MovementTypePill` (27-38) — nine separate implementations of the same `<span className="inline-flex ... rounded-full" style={{background, color}}>` shell, several sharing the *exact same* rgba/hex values (`rgba(16,185,129,.15)`/`#059669` appears in 7 of these; `rgba(244,63,94,.15)`/`#e11d48` in 7 of these).

### [Major] The sticky filter-bar shell is duplicated in 7 files, including two independently-written copies of the same helper.
Copy-pasted markup in `WarehouseTab.tsx:98-101`, `VendorsTab.tsx:119-122`, `ConsumablesTab.tsx:71-74`, `DevicesTab.tsx:43-46`, `CalibrationTab.tsx:56-59` — and, worse, `ForecastTab.tsx:75-84` and `AuditTab.tsx:19-28` each independently wrote their *own* local `InvFilterBar` component rather than sharing one, meaning the exact same component was authored twice.

### [Major] Table-card wrapper duplicated as two competing "standards."
`rounded-2xl border overflow-auto` (`WarehouseTab.tsx:117`, `ForecastTab.tsx:153,272`, `ExpiryFEFOTab.tsx:160`, `AuditTab.tsx:96`, `FOInventoryTab.tsx:86`) vs. `rounded-[14px] border overflow-hidden` (`ConsumablesTab.tsx:111`, `CalibrationTab.tsx:94`, `MovementsTab.tsx:62`) — two different "standard" card wrappers, neither shared.

### [Major] Empty-state row duplicated in 6+ places, KPI tile reinvented 3 times bypassing the project's own shared component.
`<tr><td colSpan={n} ...>No X.</td></tr>` repeated near-verbatim across `WarehouseTab`, `ExpiryFEFOTab`, `FOInventoryTab`, `ConsumablesTab`, `CalibrationTab`, `MovementsTab` (only `ForecastTab` extracted its own local `EmptyRow`). Separately, `FOInventoryTab.tsx:36`, `InventoryKpiStrip.tsx:35`, and `DevicesTab.tsx:129` each locally reimplement a KPI tile despite `components/ui/KpiTile.tsx` already existing as the project's shared primitive for exactly this.

### [Critical] Dead code: 3 confirmed, zero-call-site exported functions.
`transferById` (`inventory.service.ts:1285`), `newTransferPreset` (`inventory.service.ts:1330`), `openGrnDefaults` (`inventory.service.ts:2234`) — grep-confirmed zero references anywhere in the feature (not even internally within `inventory.service.ts`). `TransfersTab.tsx` reimplements its own local `.find()` instead of using `transferById`, and its own local preset state instead of `newTransferPreset`; `openGrnDefaults`'s logic was independently reimplemented in `ProcurementTab.tsx` (see §2) — elevated from "minor dead code" to a real maintainability risk because the duplication it created is actively diverging.

### [Major] Duplicate type/const/predicate declarations in `inventory.types.ts` (grep-verified).
- `ItemType` (line 190, derived from `ITEM_TYPES`) and `ItemMasterType` (line 397) are the **identical 6-member string union**, hand-typed twice.
- `ASSET_TYPES` (line 208) and `ASSET_ITEM_TYPES` (line 300) are byte-identical arrays; `CONSUMABLE_TYPES` (210) and `CONSUMABLE_ITEM_TYPES` (301) likewise.
- `isAssetType`/`isAssetItemType` and `isConsumableType`/`isConsumableItemType` are logically identical predicate pairs.
- Four structurally overlapping "holdings" interfaces (`FoHoldings`/`FoConsumableHolding`, `TransferFoHoldings`/`TransferFoConsumableHolding`, `HolderHoldings`/`HolderConsumable`, `DietHoldings`/`DietConsumableHolding`) — each has an inline comment justifying why it isn't unified with the others, which is itself evidence the sprawl was noticed and deliberately left rather than accidental.
- `InventoryItem` vs `InventoryMasterItem`, and `InventoryKpiCard` vs `DashboardKpiCard` (differing only by one optional field) — same pattern.

---

## 11. AI Code Smells

- **Under-abstraction via verbatim copy-paste, not over-abstraction, is the dominant smell here** — the opposite failure mode from a typical "AI over-engineered this" report. The same `<td style={{padding:'8px 6px', borderBottom:'1px dashed var(--qms-border)', ...}}>` object is repeated dozens of times per file across ~12 of the 16 smaller components, and only two files (`ForecastTab.tsx:43-60`, `AuditTab.tsx:32-49`) bothered to extract local `Th`/`Td` helpers — as two **independent, near-identical** definitions rather than one shared component.
- **Business-logic duplication instead of reuse**: the `openGrnDefaults()`/`ProcurementTab.tsx` case (§2, §10) is a clean example of exactly the failure mode described in the brief — a helper function exists, was seemingly written correctly, and then never wired up; the component reimplements the same logic from scratch instead.
- **What is *not* a smell here, called out explicitly:** `CopilotTab.tsx`'s `InQ`/`Emph`/`CopilotLink` helpers (used 9×) are a legitimately justified, appropriately-scoped abstraction — not over-engineering. The deterministic LCG/hash-based seeding used throughout `inventory.service.ts` instead of `Math.random()` is a deliberate, well-executed choice for stable demo data, not premature optimization. No deeply-nested ternaries, no misleadingly-named wrapper functions, and no unused generics were found anywhere in the feature.

---

## 12. Production Readiness

| Dimension | Verdict |
|---|---|
| Security | No secrets/PII handling; nothing to flag. |
| Accessibility | **Fails** — clickable `<div>`/`<span>`/`<tr>` used as interactive controls with no `role`/`tabIndex`/keyboard handler, in at least 7 files (`AssignmentsTab.tsx:78-88,136-146`, `WarehouseTab.tsx:144,210`, `VendorsTab.tsx:141-146`, `DevicesTab.tsx:102-108`, `ForecastTab.tsx:170`, `ExpiryFEFOTab.tsx:189`, `FOInventoryTab.tsx:110`). |
| Error recovery | Mixed — localStorage layer is defensively guarded throughout, but form submission has no validation to recover *from* (see Zod finding) — bad input isn't rejected, it's silently accepted. |
| Loading UX | Not specifically audited as a gap — TanStack Query's `isLoading` is available via the hook layer; not confirmed whether every tab surfaces it. |
| Empty states | Handled, if duplicated (§10) — every list view does show a real empty-state message. |
| Non-functional UI | **[Major]** `InventoryPage.tsx:164-165` — Import/Export buttons render with icons but **no `onClick` handlers at all**. This isn't a stubbed-with-a-toast placeholder (the pattern used correctly elsewhere in this codebase, e.g. `hq`'s `HqMasterTab.tsx`) — it's a control that does visibly nothing when clicked, with no feedback to the user that it's unimplemented. |
| Type safety | **Strong** — zero `any`/`@ts-ignore`/`@ts-expect-error` in the service+types layer; one documented `as unknown as` cast (`inventory.service.ts:1670`) is the only unsafe cast found in 4,479 combined lines. |
| Validation | **Fails** — see §6, Critical. |
| Cross-feature boundary | **Fails** — see §1/§4, Critical (`CAMPS` import). |
| Maintainability | Fails on duplication grounds (§10) — not on correctness grounds. |

### Would I approve this feature for production?

## **NO.**

Three concrete, verified, non-stylistic defects block approval:

1. **Zero Zod validation on live, reachable forms** (PR/PO/GRN, movement log, vendor, transfer) — bad data is silently accepted today.
2. **A confirmed cross-feature import** (`inventory.service.ts:8` → `@/features/camps/camps.mock`) breaking the "delete a feature, nothing else breaks" guarantee.
3. **Non-functional Import/Export buttons** shipped with no click handler and no "not yet wired" feedback — a user-facing broken affordance, not a missing nicety.

None of these require a rewrite — all three are contained, mechanical fixes. The underlying hook/component layering is sound (clean `useQuery`/`useMutation` boundary, zero `useEffect` bugs, no Zustand misuse), which is why this is a **fixable gap list**, not a structural failure — but it is not a passable state today.

---

## Summary

| Feature | Architecture /10 | Scalability /10 | Maintainability /10 | Performance /10 | Production Ready | Overall Comments |
|---|---|---|---|---|---|---|
| `inventory` | 4 | 3 | 4 | 7 | **NO** | Clean hook/component layering and zero React-effect bugs are undermined by a 3,570-line God-file service, a confirmed cross-feature import, zero Zod on live forms, extensive cross-file UI duplication (9× reimplemented status pill, 7× filter bar), and two non-functional buttons shipped as if complete. Fixable without a rewrite, but not production-ready as-is. |

*(No feature ranking is produced — only `inventory` was authorized for this review. The equivalent `hq` audit from an earlier pass scored roughly B+/C-range after remediation; `inventory` — audited here pre-remediation, at over 3× the size — sits meaningfully below that, primarily on the strength of the Zod and cross-feature-import findings plus the sheer scale of the service-layer SRP violation.)*
