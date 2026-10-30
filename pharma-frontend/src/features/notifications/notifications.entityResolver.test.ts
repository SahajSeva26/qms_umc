import { describe, it, expect } from 'vitest'
import { resolveNotificationEntity } from './notifications.entityResolver'

describe('resolveNotificationEntity (pharma-frontend)', () => {
  it('resolves a whitelisted camp entity to /pharma/camps/:id when the viewer holds camp:book', () => {
    const hasAnyPermission = (codes: string[]) => codes.includes('camp:book')
    const resolution = resolveNotificationEntity({ id: 'camp-1', type: 'camp', event: 'camp.create' }, 'pharma-mr', hasAnyPermission)

    expect(resolution).not.toBeNull()
    expect(resolution?.href('camp-1')).toBe('/pharma/camps/camp-1')
    expect(resolution?.label).toBe('Camp')
  })

  it('returns null for a camp entity when the viewer lacks camp:book', () => {
    const hasAnyPermission = () => false
    expect(
      resolveNotificationEntity({ id: 'camp-1', type: 'camp', event: 'camp.create' }, 'pharma-mr', hasAnyPermission),
    ).toBeNull()
  })

  // FAIL CLOSED: must not resolve to a clickable destination when hasAnyPermission is omitted.
  it('FAILS CLOSED for a camp entity when hasAnyPermission is omitted entirely', () => {
    expect(resolveNotificationEntity({ id: 'camp-1', type: 'camp', event: 'camp.create' }, 'pharma-mr')).toBeNull()
  })

  // Only camp is whitelisted here — pharma-frontend has no lead/project screens to link to.
  it('returns null for an entity type with no configured resolver (e.g. lead)', () => {
    const hasAnyPermission = () => true
    expect(
      resolveNotificationEntity({ id: 'lead-1', type: 'lead', event: 'lead.create' }, 'pharma-mr', hasAnyPermission),
    ).toBeNull()
  })

  it('returns null for an unrecognized entity type — never builds a URL from an arbitrary backend string', () => {
    const hasAnyPermission = () => true
    expect(
      resolveNotificationEntity({ id: 'x-1', type: 'some-future-type', event: 'x.create' }, 'pharma-mr', hasAnyPermission),
    ).toBeNull()
  })

  it('returns null for a null entity', () => {
    expect(resolveNotificationEntity(null)).toBeNull()
  })
})
