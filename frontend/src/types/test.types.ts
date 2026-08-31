// Matches backend/operations/testMaster exactly. TestMaster is a global,
// admin-managed catalog of screening tests — no tenant scoping, no delete
// (status only).

import type { ProjectTherapy } from '@/types/project.types'

export type TestStatus = 'active' | 'inactive'

export const TEST_STATUSES: TestStatus[] = ['active', 'inactive']

export const TEST_STATUS_LABEL: Record<TestStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
}

// Matches testMaster.mapper.ts's mapConsumptionLine exactly — it never returns
// itemName/itemCode/itemType even when the underlying InventoryMaster is
// populated server-side, so this type only ever carries a bare id + rate.
// Do not add optional name/code fields here — they would always be undefined
// and would misrepresent what the backend actually returns.
export interface TestConsumptionLine {
  item: string
  rate: number
}

export interface TestEntity {
  id: string
  // Server-generated via the global counter sequence (tst-000001 format) —
  // never supplied or editable by the caller at all, not just immutable
  // post-create. See CreateTestPayload.
  code: string
  name: string
  description?: string
  therapy: ProjectTherapy
  duration: number
  price: number
  // Key is ABSENT (not null/undefined-but-present) unless the caller holds
  // `test-master:manage` — testMaster.mapper.ts only sets this field
  // conditionally.
  status?: TestStatus
  // A device and a consumable both live in this one array — the backend
  // distinguishes them only server-side (via each item's resolved
  // InventoryMaster type), never in this response shape. See TestForm.
  consumption: TestConsumptionLine[]
}

export interface SearchTestQuery {
  code?: string
  name?: string
  therapy?: ProjectTherapy
  status?: TestStatus
  page?: string
  limit?: string
}

interface TestConsumptionLinePayload {
  item: string
  // Optional — omitted entirely for a device line so the backend's own
  // normalizeConsumption() applies its rate: 0 default; always sent as 1
  // for a consumable line (no user-facing quantity control). See TestForm.
  rate?: number
}

// code is intentionally absent — the backend generates it via the global
// counter sequence (tst-000001 format); there is nothing for the caller to
// populate it with, and the value is only known once the server responds.
export interface CreateTestPayload {
  name: string
  description?: string
  therapy: ProjectTherapy
  duration: number
  price: number
  status?: TestStatus
  consumption?: TestConsumptionLinePayload[]
}

// code is intentionally absent — server-generated, never editable at all.
// therapy is also treated as immutable here (frontend decision, not a
// backend restriction): existing Projects can already reference this
// Test's id, and the backend never validates a Project's selected tests
// against its own therapy, so changing a Test's therapy post-creation could
// silently make an already-linked Project's test selection nonsensical.
// Revisit once the backend can validate/migrate affected Project
// relationships. consumption is also absent: this module doesn't support
// editing an existing test's resource lines yet (see TestForm) — the update
// payload only ever carries the fields this phase's UI actually lets you
// change.
export interface UpdateTestPayload {
  name?: string
  description?: string
  duration?: number
  price?: number
  status?: TestStatus
}
