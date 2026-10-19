import { describe, it, expect } from 'vitest'
import { resolveNotificationEntity } from './notifications.entityResolver'

describe('resolveNotificationEntity', () => {
  it('resolves a whitelisted entity type (camp) to an icon/label/href', () => {
    const resolution = resolveNotificationEntity({ id: 'camp-1', type: 'camp', event: 'camp.create' })

    expect(resolution).not.toBeNull()
    expect(resolution?.href('camp-1')).toBe('/camps?camp=camp-1')
    expect(resolution?.label).toBe('Camp')
  })

  it('returns null for an unrecognized entity type — never builds a URL from an arbitrary backend string', () => {
    expect(resolveNotificationEntity({ id: 'x-1', type: 'some-future-type', event: 'x.create' })).toBeNull()
  })

  it('returns null for a null entity', () => {
    expect(resolveNotificationEntity(null)).toBeNull()
  })

  it('returns null for an entity with an empty type', () => {
    expect(resolveNotificationEntity({ id: 'x-1', type: '', event: 'x.create' })).toBeNull()
  })

  // /camps?camp=<id> is unreachable for pharma roles (AppLayout force-redirects them).
  it.each(['pharma-mr', 'pharma-asm', 'pharma-rsm', 'pharma-division-head'])(
    'returns null for a whitelisted entity type when the viewer is %s (pharma roles cannot reach /camps)',
    (roleTypeCode) => {
      expect(resolveNotificationEntity({ id: 'camp-1', type: 'camp', event: 'camp.create' }, roleTypeCode)).toBeNull()
    },
  )

  it('still resolves camp for a non-pharma role (e.g. a camp coordinator)', () => {
    const resolution = resolveNotificationEntity({ id: 'camp-1', type: 'camp', event: 'camp.create' }, 'camp-coord')
    expect(resolution).not.toBeNull()
    expect(resolution?.href('camp-1')).toBe('/camps?camp=camp-1')
  })

  it('still resolves camp when no roleTypeCode is passed (e.g. callers that have not been updated)', () => {
    expect(resolveNotificationEntity({ id: 'camp-1', type: 'camp', event: 'camp.create' })).not.toBeNull()
  })
})
