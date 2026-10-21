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

describe('isPharmaExtraNavItem — pharma-mr\'s Camp Management + Doctor Management exceptions', () => {
  it.each(['camps', 'doctors'])('is true for the %s item when the session is pharma-mr', (id) => {
    expect(isPharmaExtraNavItem({ id, label: id, icon: 'Sun', path: `/${id}` }, sessionFixture({ roleTypeCode: 'pharma-mr' }))).toBe(true)
  })

  it.each(['camps', 'doctors'])('is false for the %s item for every other pharma role', (id) => {
    for (const roleTypeCode of ['pharma-rsm', 'pharma-asm', 'pharma-division-head']) {
      expect(isPharmaExtraNavItem({ id, label: id, icon: 'Sun', path: `/${id}` }, sessionFixture({ roleTypeCode }))).toBe(false)
    }
  })

  it('is false for a non-extra item even for pharma-mr', () => {
    expect(isPharmaExtraNavItem({ id: 'crm', label: 'CRM', icon: 'Users', path: '/crm' }, sessionFixture({ roleTypeCode: 'pharma-mr' }))).toBe(false)
  })
})

describe('getVisibleNavItems — pharma-mr sees Pharma Portal + Camp Management + Doctor Management, no other pharma role gets any extra item', () => {
  it('includes "pharma", "camps" and "doctors" for pharma-mr with camp:book', () => {
    const ids = getVisibleNavItems(sessionFixture({ roleTypeCode: 'pharma-mr', permissions: ['camp:book'] })).map((i) => i.id)
    expect(ids).toContain('pharma')
    expect(ids).toContain('camps')
    expect(ids).toContain('doctors')
  })

  it('includes only "pharma" for every other pharma role, even with camp:book', () => {
    for (const roleTypeCode of ['pharma-rsm', 'pharma-asm', 'pharma-division-head']) {
      const ids = getVisibleNavItems(sessionFixture({ roleTypeCode, permissions: ['camp:book'] })).map((i) => i.id)
      expect(ids).toEqual(['pharma'])
    }
  })

  it('excludes "camps" (permission-gated) but still includes "doctors" (no gate) for pharma-mr without camp:book', () => {
    const ids = getVisibleNavItems(sessionFixture({ roleTypeCode: 'pharma-mr', permissions: [] })).map((i) => i.id)
    expect(ids).not.toContain('camps')
    expect(ids).toContain('doctors')
  })
})

describe('getFirstVisibleNavPath — a pharma session always lands on its own portal, never an extra item', () => {
  it('pharma-mr lands on /pharma, not /camps or /doctors', () => {
    // /pharma is the role-agnostic item's own path — AppLayout.tsx separately redirects to the specific portal (e.g. /pharma/mr).
    expect(getFirstVisibleNavPath(sessionFixture({ roleTypeCode: 'pharma-mr', permissions: ['camp:book'] }))).toBe('/pharma')
  })

  it('a pharma-mr session without camp:book (portal link disabled) falls through to the one remaining real page, /doctors (no gate) — not null', () => {
    expect(getFirstVisibleNavPath(sessionFixture({ roleTypeCode: 'pharma-mr', permissions: [] }))).toBe('/doctors')
  })

  it('a non-pharma session is unaffected by the pharma-first rule', () => {
    const path = getFirstVisibleNavPath(sessionFixture({ roleTypeCode: 'field-officer', permissions: ['camp:search'] }))
    expect(path).not.toBeNull()
  })
})
