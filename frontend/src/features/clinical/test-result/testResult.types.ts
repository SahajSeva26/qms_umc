// This is the RESULT of a TestMaster performed during a Screening — distinct from
// testMaster.types.ts's TestEntity (the catalog itself). Do not cross-import.

export type TestResultInterpretation = 'NORMAL' | 'LOW' | 'HIGH' | 'CRITICAL' | 'INVALID'

interface TestResultRefPatient {
  id: string
}

interface TestResultPopulatedScreening extends TestResultRefPatient {
  status: string
  patient: string
  camp: string
}

interface TestResultPopulatedType extends TestResultRefPatient {
  code: string
  name: string
  therapy: string
}

interface TestResultPopulatedRole extends TestResultRefPatient {
  name?: string
  code?: string
}

interface TestResultPopulatedTenant extends TestResultRefPatient {
  name: string
  code: string
}

export interface TestResultValue {
  key: string
  value: string
  unit: string
  interpretation?: TestResultInterpretation
}

export interface TestResultEntity {
  id: string
  tenant: TestResultPopulatedTenant | null
  screening: TestResultPopulatedScreening | null
  type: TestResultPopulatedType | null
  performedBy: TestResultPopulatedRole | null
  result: TestResultValue
  createdAt: string
  updatedAt: string
}

export interface SearchTestResultQuery {
  screening?: string
  type?: string
  interpretation?: TestResultInterpretation
  // manage-only; a non-manage actor is always own-scoped regardless of this param
  tenant?: string
  page?: string
  limit?: string
}

// tenant/performedBy are pinned server-side, never supplied by the caller.
export interface CreateTestResultPayload {
  screening: string
  type: string
  result: TestResultValue
}

// Only result is editable — screening/type/tenant/performedBy are immutable.
export interface UpdateTestResultPayload {
  result?: TestResultValue
}
