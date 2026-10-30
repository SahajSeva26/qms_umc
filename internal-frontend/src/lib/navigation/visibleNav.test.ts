import { describe, it, expect } from 'vitest'
import { getVisibleNavItems, getFirstVisibleNavPath, isNavItemVisible, isPharmaExtraNavItem, type VisibleNavSession } from './visibleNav'

function sessionFixture(overrides: Partial<VisibleNavSession> = {}): VisibleNavSession {
  return {
    isSettled: true,
    permissions: [],
    roleTypeCode: undefined,
    tenantType: undefined,
    ...overrides,
  }
}

describe('isPharmaExtraNavItem — pharma field-force (MR/ASM/RSM) Camp Management + Diet Camps + Doctor Management exceptions', () => {
  it.each(['camps', 'campsdiet', 'doctors'])('is true for the %s item for each of pharma-mr/pharma-asm/pharma-rsm', (id) => {
    for (const roleTypeCode of ['pharma-mr', 'pharma-asm', 'pharma-rsm']) {
      expect(isPharmaExtraNavItem({ id, label: id, icon: 'Sun', path: `/${id}` }, sessionFixture({ roleTypeCode }))).toBe(true)
    }
  })

  it.each(['camps', 'campsdiet', 'doctors'])('is false for the %s item for pharma-division-head (not field-force)', (id) => {
    expect(isPharmaExtraNavItem({ id, label: id, icon: 'Sun', path: `/${id}` }, sessionFixture({ roleTypeCode: 'pharma-division-head' }))).toBe(false)
  })

  it('is false for a non-extra item even for pharma-mr', () => {
    expect(isPharmaExtraNavItem({ id: 'crm', label: 'CRM', icon: 'Users', path: '/crm' }, sessionFixture({ roleTypeCode: 'pharma-mr' }))).toBe(false)
  })
})

describe('getVisibleNavItems — pharma field-force (MR/ASM/RSM) sees Pharma Portal + Camp Management + Diet Camps + Doctor Management; division-head gets no extra item', () => {
  it.each(['pharma-mr', 'pharma-asm', 'pharma-rsm'])('includes "pharma", "camps", "campsdiet" and "doctors" for %s with camp:book', (roleTypeCode) => {
    const ids = getVisibleNavItems(sessionFixture({ roleTypeCode, permissions: ['camp:book'] })).map((i) => i.id)
    expect(ids).toContain('pharma')
    expect(ids).toContain('camps')
    expect(ids).toContain('campsdiet')
    expect(ids).toContain('doctors')
  })

  it('includes only "pharma" for pharma-division-head, even with camp:book', () => {
    const ids = getVisibleNavItems(sessionFixture({ roleTypeCode: 'pharma-division-head', permissions: ['camp:book'] })).map((i) => i.id)
    expect(ids).toEqual(['pharma'])
  })

  it.each(['pharma-mr', 'pharma-asm', 'pharma-rsm'])('excludes "camps" and "campsdiet" (permission-gated) but still includes "doctors" (no gate) for %s without camp:book', (roleTypeCode) => {
    const ids = getVisibleNavItems(sessionFixture({ roleTypeCode, permissions: [] })).map((i) => i.id)
    expect(ids).not.toContain('camps')
    expect(ids).not.toContain('campsdiet')
    expect(ids).toContain('doctors')
  })
})

describe('isNavItemVisible — Dashboard + the 4 analytics items are system:manage-only, for now', () => {
  const DASHBOARD_AND_ANALYTICS_IDS = ['dashboard', 'analytics', 'foanalytics', 'docanalytics', 'finanalytics']

  it.each(DASHBOARD_AND_ANALYTICS_IDS)('hides %s from a session holding only tenant:manage (not system:manage)', (id) => {
    const session = sessionFixture({ isSettled: true, permissions: ['tenant:manage'] })
    expect(isNavItemVisible({ id, label: id, icon: 'Grid', path: `/${id}` }, session)).toBe(false)
  })

  it.each(DASHBOARD_AND_ANALYTICS_IDS)('shows %s for a session holding system:manage', (id) => {
    const session = sessionFixture({ isSettled: true, permissions: ['system:manage'] })
    expect(isNavItemVisible({ id, label: id, icon: 'Grid', path: `/${id}` }, session)).toBe(true)
  })

  it.each(DASHBOARD_AND_ANALYTICS_IDS)('hides %s from an unsettled session even with system:manage in the list', (id) => {
    const session = sessionFixture({ isSettled: false, permissions: ['system:manage'] })
    expect(isNavItemVisible({ id, label: id, icon: 'Grid', path: `/${id}` }, session)).toBe(false)
  })
})

describe('CRM Invoicing navigation', () => {
  const item = { id: 'crminvoicing', label: 'CRM Invoicing', icon: 'FileText', path: '/billing/crm' }

  it('shows the page to a finance manager with invoice manage permission', () => {
    expect(isNavItemVisible(item, sessionFixture({ permissions: ['invoice:manage', 'invoice-line-item:manage'] }))).toBe(true)
  })

  it('does not show the page for a session without invoice read permission', () => {
    expect(isNavItemVisible(item, sessionFixture({ permissions: ['invoice-line-item:manage'] }))).toBe(false)
  })
})

describe('isNavItemVisible — "geoprofiles" (Field Staff Coverage) is open to any authenticated session, matching GET /geo-profiles\' genuinely open backend reads', () => {
  it('is visible even for a session with zero permissions', () => {
    const session = sessionFixture({ isSettled: true, permissions: [] })
    expect(isNavItemVisible({ id: 'geoprofiles', label: 'Field Staff Coverage', icon: 'MapPin', path: '/geo-profiles' }, session)).toBe(true)
  })

  it('is visible for a field-officer session (previously wrongly gated behind unrelated tenant:*/role:* codes)', () => {
    const session = sessionFixture({ isSettled: true, permissions: ['camp:search'], roleTypeCode: 'field-officer' })
    expect(isNavItemVisible({ id: 'geoprofiles', label: 'Field Staff Coverage', icon: 'MapPin', path: '/geo-profiles' }, session)).toBe(true)
  })

  // Matches 'doctors'' own ungated behavior exactly — items with no REAL_GATED_NAV_ITEMS entry are
  // visible unconditionally (nothing to gate against an open backend read), isSettled included.
  it('is visible even for an unsettled session, same as every other fully-open nav item', () => {
    const session = sessionFixture({ isSettled: false, permissions: [] })
    expect(isNavItemVisible({ id: 'geoprofiles', label: 'Field Staff Coverage', icon: 'MapPin', path: '/geo-profiles' }, session)).toBe(true)
  })
})

describe('isNavItemVisible — "salesdashboard" is visible to exactly sales-head/sales-rep, never system:manage or tenant:manage', () => {
  it('is visible for a sales-head session with no permissions at all', () => {
    const session = sessionFixture({ isSettled: true, permissions: [], roleTypeCode: 'sales-head' })
    expect(isNavItemVisible({ id: 'salesdashboard', label: 'Sales Dashboard', icon: 'TrendingUp', path: '/crm/sales-dashboard' }, session)).toBe(true)
  })

  it('is visible for a sales-rep session with no permissions at all', () => {
    const session = sessionFixture({ isSettled: true, permissions: [], roleTypeCode: 'sales-rep' })
    expect(isNavItemVisible({ id: 'salesdashboard', label: 'Sales Dashboard', icon: 'TrendingUp', path: '/crm/sales-dashboard' }, session)).toBe(true)
  })

  it('is hidden for a system:manage session (no system:manage bypass for this item, per explicit request)', () => {
    const session = sessionFixture({ isSettled: true, permissions: ['system:manage'], roleTypeCode: 'system-admin' })
    expect(isNavItemVisible({ id: 'salesdashboard', label: 'Sales Dashboard', icon: 'TrendingUp', path: '/crm/sales-dashboard' }, session)).toBe(false)
  })

  it('is hidden for a tenant:manage admin role, even with lead:manage too', () => {
    const session = sessionFixture({ isSettled: true, permissions: ['tenant:manage', 'lead:manage'], roleTypeCode: 'admin' })
    expect(isNavItemVisible({ id: 'salesdashboard', label: 'Sales Dashboard', icon: 'TrendingUp', path: '/crm/sales-dashboard' }, session)).toBe(false)
  })

  it('is hidden for an unsettled sales-head session', () => {
    const session = sessionFixture({ isSettled: false, permissions: [], roleTypeCode: 'sales-head' })
    expect(isNavItemVisible({ id: 'salesdashboard', label: 'Sales Dashboard', icon: 'TrendingUp', path: '/crm/sales-dashboard' }, session)).toBe(false)
  })
})

describe('getVisibleNavItems — "salesdashboard" is the first item for sales-head/sales-rep', () => {
  it('is the first visible item for a sales-head session', () => {
    const ids = getVisibleNavItems(sessionFixture({ roleTypeCode: 'sales-head', permissions: ['lead:manage'] })).map((i) => i.id)
    expect(ids[0]).toBe('salesdashboard')
  })

  it('is the first visible item for a sales-rep session', () => {
    const ids = getVisibleNavItems(sessionFixture({ roleTypeCode: 'sales-rep', permissions: ['lead:search'] })).map((i) => i.id)
    expect(ids[0]).toBe('salesdashboard')
  })
})

describe('getFirstVisibleNavPath — a pharma session always lands on its own portal, never an extra item', () => {
  it.each(['pharma-mr', 'pharma-asm', 'pharma-rsm'])('%s lands on /pharma, not /camps or /doctors', (roleTypeCode) => {
    // /pharma is the role-agnostic item's own path — AppLayout.tsx separately redirects to the specific portal (e.g. /pharma/mr).
    expect(getFirstVisibleNavPath(sessionFixture({ roleTypeCode, permissions: ['camp:book'] }))).toBe('/pharma')
  })

  it.each(['pharma-mr', 'pharma-asm', 'pharma-rsm'])('a %s session without camp:book (portal link disabled) falls through to the one remaining real page, /doctors (no gate) — not null', (roleTypeCode) => {
    expect(getFirstVisibleNavPath(sessionFixture({ roleTypeCode, permissions: [] }))).toBe('/doctors')
  })

  it('a non-pharma session is unaffected by the pharma-first rule', () => {
    const path = getFirstVisibleNavPath(sessionFixture({ roleTypeCode: 'field-officer', permissions: ['camp:search'] }))
    expect(path).not.toBeNull()
  })
})
