// Matches backend/operations/testMaster exactly. TestMaster is a global,
// admin-managed catalog of screening tests — no tenant scoping, no delete
// (status only).

import type { ProjectTherapy } from '@/types/project.types'
import type { CampType } from '@/types/campReal.types'

export type TestStatus = 'active' | 'inactive'

export const TEST_STATUSES: TestStatus[] = ['active', 'inactive']

export const TEST_STATUS_LABEL: Record<TestStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
}

// Matches mapConsumptionLine exactly — it never returns itemName/itemCode
// even when populated server-side, so don't add optional name fields here.
export interface TestConsumptionLine {
  item: string
  rate: number
}

export type TestMasterConfigInputType = 'number' | 'string' | 'boolean' | 'select'

export interface TestMasterConfigInputOption {
  label: string
  value: string
}

// `options` only applies when type is 'select'.
export interface TestMasterConfigInput {
  label: string
  type: TestMasterConfigInputType
  unit?: string
  options?: TestMasterConfigInputOption[]
}

export interface TestMasterConfig {
  inputs: TestMasterConfigInput[]
}

export interface TestEntity {
  id: string
  // Server-generated via the global counter sequence (tst-000001) — never
  // editable, not just immutable post-create.
  code: string
  name: string
  description?: string
  // Optional because some legacy records predate/lack this field entirely —
  // the frontend keeps it immutable after create and never sends it on
  // update, so this must stay honestly optional rather than asserting every
  // record has a real value.
  therapy?: ProjectTherapy
  // Optional because 12 pre-existing records predate this field and have it
  // absent entirely; immutable after create with no backfill path (the
  // update payload schema omits it), so this must stay honestly optional.
  campType?: CampType
  duration: number
  price: number
  // Absent entirely (not null) unless the caller holds test-master:manage —
  // the mapper only sets this field conditionally.
  status?: TestStatus
  // A device and a consumable both live in this one array — distinguished
  // only server-side, never in this response shape.
  consumption: TestConsumptionLine[]
  // Optional/absent on older records — means "no result fields authored
  // yet," not an error.
  config?: TestMasterConfig
}

export interface SearchTestQuery {
  code?: string
  name?: string
  therapy?: ProjectTherapy
  campType?: CampType
  status?: TestStatus
  page?: string
  limit?: string
}

interface TestConsumptionLinePayload {
  item: string
  // Omitted for a device line so normalizeConsumption() applies its rate: 0
  // default; always sent as 1 for a consumable line.
  rate?: number
}

// code is intentionally absent — server-generated, known only after response.
export interface CreateTestPayload {
  name: string
  description?: string
  therapy: ProjectTherapy
  campType: CampType
  duration: number
  price: number
  status?: TestStatus
  config?: TestMasterConfig
  consumption?: TestConsumptionLinePayload[]
}

// code/campType absent — both immutable after create per backend schema.
// therapy also treated as immutable here (frontend decision): changing it
// post-creation could desync Projects already linked to this test's id.
// consumption absent — editing an existing test's resource lines isn't
// supported yet. config IS included — backend allows editing it post-create,
// and existing results are immutable snapshots so this can't corrupt them.
export interface UpdateTestPayload {
  name?: string
  description?: string
  duration?: number
  price?: number
  status?: TestStatus
  config?: TestMasterConfig
}
