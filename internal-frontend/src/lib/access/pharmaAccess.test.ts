import { describe, it, expect } from 'vitest'
import { isPharmaRoleType, PHARMA_ROLE_TYPE_CODES, PHARMA_FIELD_ROLE_TYPE_CODES } from './pharmaAccess'

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

describe('PHARMA_FIELD_ROLE_TYPE_CODES', () => {
  it('is exactly mr/asm/rsm — a strict subset of PHARMA_ROLE_TYPE_CODES excluding division-head', () => {
    expect(PHARMA_FIELD_ROLE_TYPE_CODES).toEqual(['pharma-mr', 'pharma-asm', 'pharma-rsm'])
    for (const code of PHARMA_FIELD_ROLE_TYPE_CODES) {
      expect((PHARMA_ROLE_TYPE_CODES as readonly string[])).toContain(code)
    }
    expect(PHARMA_FIELD_ROLE_TYPE_CODES).not.toContain('pharma-division-head')
  })
})
