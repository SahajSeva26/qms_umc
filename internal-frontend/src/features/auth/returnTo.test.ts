import { describe, it, expect } from 'vitest'
import { canUseReturnTo, isPharmaBuildPath, type ReturnToPolicySession } from './returnTo'

function session(overrides: Partial<ReturnToPolicySession> = {}): ReturnToPolicySession {
  return {
    isSettled: true,
    permissions: [],
    roleTypeCode: 'camp-coordinator-screening',
    tenantType: 'platform',
    ...overrides,
  }
}

describe('canUseReturnTo — syntax rejection (never an absolute or protocol-relative URL)', () => {
  it.each([
    'http://evil.com/pharma/mr',
    'https://evil.com',
    '//evil.com/pharma/mr',
    '/\\evil.com',
    'javascript:alert(1)',
    'not-even-a-path',
    '',
  ])('rejects %s outright, before any session check', (candidate) => {
    expect(canUseReturnTo(session({ permissions: ['camp:search'] }), candidate)).toBe(false)
  })
})

describe('canUseReturnTo — internal paths: exact top-level nav-item match', () => {
  it('accepts the bare /camps path for a session holding a camp-view permission', () => {
    expect(canUseReturnTo(session({ permissions: ['camp:search'] }), '/camps')).toBe(true)
  })

  it('rejects /camps for a session with none of the required permissions', () => {
    expect(canUseReturnTo(session({ permissions: [] }), '/camps')).toBe(false)
  })
})

describe('canUseReturnTo — internal paths: feature-owned route-family match (the real deep-link shapes an exact nav match can never recognize)', () => {
  it('accepts the camp drawer deep link /camps?camp=<id>, not just the bare /camps path', () => {
    expect(canUseReturnTo(session({ permissions: ['camp:search'] }), '/camps?camp=cmp-1')).toBe(true)
  })

  it('rejects /camps?camp=<id> for a session with no camp-view permission', () => {
    expect(canUseReturnTo(session({ permissions: [] }), '/camps?camp=cmp-1')).toBe(false)
  })

  it('does not treat a /camps query param OTHER than "camp" as the drawer shape', () => {
    expect(canUseReturnTo(session({ permissions: ['camp:search'] }), '/camps?tab=closed')).toBe(false)
  })

  it('accepts /camps/new for a session holding camp-write permissions', () => {
    expect(canUseReturnTo(session({ permissions: ['camp:create'] }), '/camps/new')).toBe(true)
  })

  it('rejects /camps/new for a session that can only search/view camps, not create them', () => {
    expect(canUseReturnTo(session({ permissions: ['camp:search'] }), '/camps/new')).toBe(false)
  })

  it('accepts a camp detail path /camps/:id for a session holding detail-read permissions', () => {
    expect(canUseReturnTo(session({ permissions: ['camp:get'] }), '/camps/cmp-1')).toBe(true)
  })

  it('rejects /camps/:id for a session holding only camp:search (list access is not detail access)', () => {
    expect(canUseReturnTo(session({ permissions: ['camp:search'] }), '/camps/cmp-1')).toBe(false)
  })

  it('accepts a camp edit path /camps/:id/edit for a session holding camp:update', () => {
    expect(canUseReturnTo(session({ permissions: ['camp:update'] }), '/camps/cmp-1/edit')).toBe(true)
  })

  it('rejects /camps/:id/edit for a session holding only camp:get (view, not edit)', () => {
    expect(canUseReturnTo(session({ permissions: ['camp:get'] }), '/camps/cmp-1/edit')).toBe(false)
  })

  it('accepts a camp screening path /camps/:id/screening for a session holding screening permissions', () => {
    expect(canUseReturnTo(session({ permissions: ['screening:create'] }), '/camps/cmp-1/screening')).toBe(true)
  })

  it('falls back to false (not an error) for a path matching no known nav item or route family', () => {
    expect(canUseReturnTo(session({ permissions: ['system:manage'] }), '/this/path/does/not/exist')).toBe(false)
  })

  it('a system-admin session (system:manage, no camp:* grants) still returns to a camp drawer deep link — the real backend bypass-all', () => {
    expect(canUseReturnTo(session({ permissions: ['system:manage'] }), '/camps?camp=cmp-1')).toBe(true)
  })

  it('a system-admin session still returns to a camp detail path', () => {
    expect(canUseReturnTo(session({ permissions: ['system:manage'] }), '/camps/cmp-1')).toBe(true)
  })

  it('a system-admin session still returns to a camp edit path', () => {
    expect(canUseReturnTo(session({ permissions: ['system:manage'] }), '/camps/cmp-1/edit')).toBe(true)
  })
})

describe('canUseReturnTo — pharma paths', () => {
  it("accepts a pharma session's own exact portal path", () => {
    expect(canUseReturnTo(session({ roleTypeCode: 'pharma-mr', tenantType: 'customer' }), '/pharma/mr')).toBe(true)
  })

  it("rejects a pharma session's attempt to use a DIFFERENT role's portal path", () => {
    expect(canUseReturnTo(session({ roleTypeCode: 'pharma-mr', tenantType: 'customer' }), '/pharma/ho')).toBe(false)
  })

  it('accepts the camp dossier deep link for any pharma session', () => {
    expect(canUseReturnTo(session({ roleTypeCode: 'pharma-mr', tenantType: 'customer' }), '/pharma/camps/cmp-1')).toBe(true)
  })

  it('rejects an unrecognized pharma sub-path — no blanket "/pharma/mr/*" grant', () => {
    expect(canUseReturnTo(session({ roleTypeCode: 'pharma-mr', tenantType: 'customer' }), '/pharma/mr/something-else')).toBe(false)
  })

  it('rejects any /pharma/* path for a non-pharma session', () => {
    expect(canUseReturnTo(session({ roleTypeCode: 'system-admin' }), '/pharma/mr')).toBe(false)
  })

  it("rejects a pharma session's attempt to use an internal path", () => {
    expect(canUseReturnTo(session({ roleTypeCode: 'pharma-mr', tenantType: 'customer', permissions: ['camp:search'] }), '/camps')).toBe(false)
  })
})

describe('isPharmaBuildPath', () => {
  it('identifies /pharma and any /pharma/* path as belonging to the pharma build', () => {
    expect(isPharmaBuildPath('/pharma')).toBe(true)
    expect(isPharmaBuildPath('/pharma/mr')).toBe(true)
    expect(isPharmaBuildPath('/pharma/camps/cmp-1')).toBe(true)
  })

  it('does not misidentify an unrelated path as a pharma path', () => {
    expect(isPharmaBuildPath('/pharmaceutical-x')).toBe(false)
    expect(isPharmaBuildPath('/camps')).toBe(false)
  })
})
