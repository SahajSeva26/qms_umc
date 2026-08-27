// Matches backend/operations/test exactly. Test is a global, admin-managed
// catalog of screening tests — no tenant scoping, no delete (status only).

import type { ProjectTherapy } from '@/types/project.types'

export type TestStatus = 'active' | 'inactive'

export const TEST_STATUSES: TestStatus[] = ['active', 'inactive']

export const TEST_STATUS_LABEL: Record<TestStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
}

// Matches test.mapper.ts's mapConsumptionLine exactly — it never returns
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
  code: string
  name: string
  description?: string
  therapy: ProjectTherapy
  // Key is ABSENT (not null/undefined-but-present) unless the caller holds
  // `test:manage` — test.mapper.ts only sets this field conditionally.
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

export interface CreateTestPayload {
  code: string
  name: string
  description?: string
  therapy: ProjectTherapy
  status?: TestStatus
  consumption?: TestConsumptionLinePayload[]
}

// code is intentionally absent — immutable post-create, same as the backend
// enforces. therapy is also treated as immutable here (frontend decision,
// not a backend restriction): existing Projects can already reference this
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
  status?: TestStatus
}
