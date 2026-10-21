import { describe, it, expect } from 'vitest'
import { getVisibleNavItems, getFirstVisibleNavPath, isPharmaExtraNavItem, type VisibleNavSession } from './visibleNav'

function sessionFixture(overrides: Partial<VisibleNavSession> = {}): VisibleNavSession {
  return {
    isSettled: true,
    permissions: [],
    roleTypeCode: undefined,
    tenantType: undefined,
    ...overrides,
  }
}

describe('isPharmaExtraNavItem — pharma-mr\'s Camp Management exception', () => {
  it('is true for the camps item when the session is pharma-mr', () => {
    expect(isPharmaExtraNavItem({ id: 'camps', label: 'Camp Management', icon: 'Sun', path: '/camps' }, sessionFixture({ roleTypeCode: 'pharma-mr' }))).toBe(true)
  })

  it('is false for the camps item for every other pharma role', () => {
    for (const roleTypeCode of ['pharma-rsm', 'pharma-asm', 'pharma-division-head']) {
      expect(isPharmaExtraNavItem({ id: 'camps', label: 'Camp Management', icon: 'Sun', path: '/camps' }, sessionFixture({ roleTypeCode }))).toBe(false)
    }
  })

  it('is false for a non-camps item even for pharma-mr', () => {
    expect(isPharmaExtraNavItem({ id: 'crm', label: 'CRM', icon: 'Users', path: '/crm' }, sessionFixture({ roleTypeCode: 'pharma-mr' }))).toBe(false)
  })
})

describe('getVisibleNavItems — pharma-mr sees Pharma Portal + Camp Management, no other pharma role gets any extra item', () => {
  it('includes both "pharma" and "camps" for pharma-mr with camp:book', () => {
    const ids = getVisibleNavItems(sessionFixture({ roleTypeCode: 'pharma-mr', permissions: ['camp:book'] })).map((i) => i.id)
    expect(ids).toContain('pharma')
    expect(ids).toContain('camps')
  })

  it('includes only "pharma" for every other pharma role, even with camp:book', () => {
    for (const roleTypeCode of ['pharma-rsm', 'pharma-asm', 'pharma-division-head']) {
      const ids = getVisibleNavItems(sessionFixture({ roleTypeCode, permissions: ['camp:book'] })).map((i) => i.id)
      expect(ids).toEqual(['pharma'])
    }
  })

  it('excludes "camps" for pharma-mr without camp:book (permission gate still applies on top of the carve-out)', () => {
    const ids = getVisibleNavItems(sessionFixture({ roleTypeCode: 'pharma-mr', permissions: [] })).map((i) => i.id)
    expect(ids).not.toContain('camps')
  })
})

describe('getFirstVisibleNavPath — a pharma session always lands on its own portal, never an extra item', () => {
  it('pharma-mr lands on /pharma, not /camps', () => {
    // /pharma is the role-agnostic item's own path — AppLayout.tsx separately redirects to the specific portal (e.g. /pharma/mr).
    expect(getFirstVisibleNavPath(sessionFixture({ roleTypeCode: 'pharma-mr', permissions: ['camp:book'] }))).toBe('/pharma')
  })

  it('a pharma-mr session without camp:book (misconfigured — no portal access, no Camp Management either) resolves to null', () => {
    expect(getFirstVisibleNavPath(sessionFixture({ roleTypeCode: 'pharma-mr', permissions: [] }))).toBeNull()
  })

  it('a non-pharma session is unaffected by the pharma-first rule', () => {
    const path = getFirstVisibleNavPath(sessionFixture({ roleTypeCode: 'field-officer', permissions: ['camp:search'] }))
    expect(path).not.toBeNull()
  })
})
