import { describe, it, expect } from 'vitest'
import { isFieldOfficerRole } from './geoProfile.utils'
import type { RoleEntity } from '@/types/accessManagement.types'

function roleFixture(overrides: Partial<RoleEntity> = {}): RoleEntity {
  return {
    id: 'role-1', code: 'fo-001', name: 'FO One', permissions: [], status: 'active',
    type: { name: 'Field Officer', code: 'field-officer' },
    user: 'user-1', tenant: 'tenant-1',
    createdAt: '', updatedAt: '', ...overrides,
  } as RoleEntity
}

describe('isFieldOfficerRole', () => {
  it('true for a populated field-officer-typed role', () => {
    expect(isFieldOfficerRole(roleFixture())).toBe(true)
  })

  it('false for a populated non-field-officer-typed role', () => {
    expect(isFieldOfficerRole(roleFixture({ type: { name: 'Sales Rep', code: 'sales-rep' } }))).toBe(false)
  })

  it('false (not a crash) for an unpopulated role.type (raw id string)', () => {
    expect(isFieldOfficerRole(roleFixture({ type: 'role-type-id-string' }))).toBe(false)
  })
})
