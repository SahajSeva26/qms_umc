import { describe, it, expect } from 'vitest'
import { isPharmaRoleType, PHARMA_ROLE_TYPE_CODES } from './pharmaAccess'

describe('isPharmaRoleType', () => {
  it.each(PHARMA_ROLE_TYPE_CODES)('returns true for %s', (code) => {
    expect(isPharmaRoleType(code)).toBe(true)
  })

  it('returns false for a non-pharma role type code', () => {
    expect(isPharmaRoleType('camp-coord')).toBe(false)
  })

  it('returns false for undefined/null/empty', () => {
    expect(isPharmaRoleType(undefined)).toBe(false)
    expect(isPharmaRoleType(null)).toBe(false)
    expect(isPharmaRoleType('')).toBe(false)
  })
})
