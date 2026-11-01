import { describe, it, expect } from 'vitest'
import { canManageEmployees, canReadEmployees, canOnboardNewPerson, canLinkExistingAccount } from './employeeAccess'

describe('employeeAccess — canManageEmployees / canReadEmployees mirror backend RoleGuard exactly', () => {
  it.each(['admin', 'operation-manager-screening', 'operation-manager-diet'])('grants manage to %s', (code) => {
    expect(canManageEmployees(code, [])).toBe(true)
    expect(canReadEmployees(code, [])).toBe(true)
  })

  it('grants read-only (not manage) to field-officer', () => {
    expect(canManageEmployees('field-officer', [])).toBe(false)
    expect(canReadEmployees('field-officer', [])).toBe(true)
  })

  it('denies both to an unrelated role type', () => {
    expect(canManageEmployees('sales-rep', [])).toBe(false)
    expect(canReadEmployees('sales-rep', [])).toBe(false)
  })

  it('denies both when roleTypeCode is undefined', () => {
    expect(canManageEmployees(undefined, [])).toBe(false)
    expect(canReadEmployees(undefined, [])).toBe(false)
  })

  it('system:manage bypasses both regardless of role-type code', () => {
    expect(canManageEmployees('sales-rep', ['system:manage'])).toBe(true)
    expect(canReadEmployees('sales-rep', ['system:manage'])).toBe(true)
    expect(canManageEmployees(undefined, ['system:manage'])).toBe(true)
  })
})

describe('employeeAccess — canOnboardNewPerson / canLinkExistingAccount mirror POST/GET /roles guards', () => {
  it('admin holding tenant:admin can do both', () => {
    expect(canOnboardNewPerson('admin', ['tenant:admin'])).toBe(true)
    expect(canLinkExistingAccount('admin', ['tenant:admin'])).toBe(true)
  })

  it('an Ops Manager holding neither tenant:admin/tenant:manage nor role:search can do neither — the real, current gap', () => {
    expect(canOnboardNewPerson('operation-manager-screening', ['tenant:search', 'tenant:get'])).toBe(false)
    expect(canLinkExistingAccount('operation-manager-screening', ['tenant:search', 'tenant:get'])).toBe(false)
  })

  it('a manage-eligible role type holding only role:search can do neither — role:search alone was never actually sufficient, since it only covers the Roles-search prerequisite, not the separate RoleTypes-search prerequisite needed to resolve foTypeId', () => {
    expect(canOnboardNewPerson('operation-manager-screening', ['role:search'])).toBe(false)
    expect(canLinkExistingAccount('operation-manager-screening', ['role:search'])).toBe(false)
  })

  it('a manage-eligible role type holding tenant:manage (not tenant:admin) can link existing, matching canOnboardNewPerson\'s same prerequisite', () => {
    expect(canOnboardNewPerson('operation-manager-screening', ['tenant:manage'])).toBe(true)
    expect(canLinkExistingAccount('operation-manager-screening', ['tenant:manage'])).toBe(true)
  })

  it('a role type outside EMPLOYEE_MANAGE_ROLETYPE_CODES can do neither even with tenant:admin', () => {
    expect(canOnboardNewPerson('field-officer', ['tenant:admin'])).toBe(false)
    expect(canLinkExistingAccount('field-officer', ['tenant:admin'])).toBe(false)
  })

  it('system:manage bypasses both regardless of role-type code', () => {
    expect(canOnboardNewPerson('sales-rep', ['system:manage'])).toBe(true)
    expect(canLinkExistingAccount(undefined, ['system:manage'])).toBe(true)
  })
})
