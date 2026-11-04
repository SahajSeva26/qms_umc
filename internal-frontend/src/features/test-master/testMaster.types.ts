// TestMaster is a global, admin-managed catalog of screening tests — no
// tenant scoping, no delete (status only).

import type { ProjectTherapy } from '@/types/project.types'
import type { CampType } from '@/types/campReal.types'

export type TestStatus = 'active' | 'inactive'

export const TEST_STATUSES: TestStatus[] = ['active', 'inactive']

export const TEST_STATUS_LABEL: Record<TestStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
}

// Matches mapConsumptionLine exactly. GET /:id populates item -> {id,code,name,type};
// search/create/update leave it unpopulated -> {id} only. Always check for the
// populated shape rather than assuming either one.
export type TestConsumptionLineItem = { id: string; code?: string; name?: string; type?: string }

export interface TestConsumptionLine {
  item: TestConsumptionLineItem
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
  // Optional — some legacy records predate this field and lack it entirely;
  // immutable after create with no backfill path (update payload omits it).
  therapy?: ProjectTherapy
  // Same reasoning as therapy above.
  campType?: CampType
  duration: number
  price: number
  // Absent entirely (not null) unless the caller holds test-master:manage —
  // the mapper only sets this field conditionally.
  status?: TestStatus
  // A device and a consumable both live in this one array — distinguished via
  // each line's populated item.type (device/consumable), see TestConsumptionLineItem.
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

// therapy is frontend-immutable by choice (not a backend rule) — changing it
// post-creation could desync Projects already linked to this test's id.
export interface UpdateTestPayload {
  name?: string
  description?: string
  duration?: number
  price?: number
  status?: TestStatus
  config?: TestMasterConfig
}
