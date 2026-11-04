import { describe, it, expect, vi } from 'vitest'
import { FiBox } from 'react-icons/fi'
import type { NotificationEntity } from '@qms/core'
import { createNotificationEntityResolver } from './notifications.entityResolver'

function campEntity(): NotificationEntity {
  return { id: 'camp-1', type: 'camp', event: 'camp.create' }
}

describe('createNotificationEntityResolver — permission gating (fail-closed)', () => {
  const resolver = createNotificationEntityResolver({
    resolvers: { camp: { icon: FiBox, label: 'Camp', href: (id) => `/camps/${id}` } },
    requiredPermissions: { camp: (hasAnyPermission) => hasAnyPermission(['camp:book']) },
  })

  it('resolves when hasAnyPermission is supplied and grants the permission', () => {
    const result = resolver(campEntity(), null, () => true)
    expect(result).not.toBeNull()
    expect(result?.href('camp-1')).toBe('/camps/camp-1')
  })

  it('resolves to null when hasAnyPermission is supplied and DENIES the permission', () => {
    const result = resolver(campEntity(), null, () => false)
    expect(result).toBeNull()
  })

  it('FAILS CLOSED (resolves to null, not a clickable destination) when hasAnyPermission is OMITTED entirely — the regression this test exists to catch', () => {
    const result = resolver(campEntity(), null, undefined)
    expect(result).toBeNull()
  })

  it('never calls hasAnyPermission for an entity type with no configured permission check', () => {
    const noPermResolver = createNotificationEntityResolver({
      resolvers: { camp: { icon: FiBox, label: 'Camp', href: (id) => `/camps/${id}` } },
      // no requiredPermissions entry for 'camp' at all
    })
    const spy = vi.fn().mockReturnValue(false)
    const result = noPermResolver(campEntity(), null, spy)
    expect(result).not.toBeNull()
    expect(spy).not.toHaveBeenCalled()
  })
})

describe('createNotificationEntityResolver — whitelist and basic resolution', () => {
  const resolver = createNotificationEntityResolver({
    resolvers: { camp: { icon: FiBox, label: 'Camp', href: (id) => `/camps/${id}` } },
  })

  it('resolves a whitelisted entity type', () => {
    const result = resolver(campEntity())
    expect(result?.label).toBe('Camp')
  })

  it('resolves an unknown entity type to null, never guessing a path from entity.type', () => {
    const result = resolver({ id: 'x', type: 'some-future-type', event: 'x' })
    expect(result).toBeNull()
  })

  it('resolves a null entity to null', () => {
    expect(resolver(null)).toBeNull()
  })

  it('resolves an entity with an empty type string to null', () => {
    expect(resolver({ id: 'x', type: '', event: 'x' })).toBeNull()
  })
})

describe('createNotificationEntityResolver — extraGate', () => {
  it('blocks resolution when extraGate returns false, before any permission check runs', () => {
    const permSpy = vi.fn().mockReturnValue(true)
    const resolver = createNotificationEntityResolver({
      resolvers: { camp: { icon: FiBox, label: 'Camp', href: (id) => `/camps/${id}` } },
      requiredPermissions: { camp: permSpy },
      extraGate: (_entity, roleTypeCode) => roleTypeCode !== 'blocked-role',
    })

    const result = resolver(campEntity(), 'blocked-role', () => true)
    expect(result).toBeNull()
    expect(permSpy).not.toHaveBeenCalled()
  })

  it('allows resolution through when extraGate returns true', () => {
    const resolver = createNotificationEntityResolver({
      resolvers: { camp: { icon: FiBox, label: 'Camp', href: (id) => `/camps/${id}` } },
      extraGate: (_entity, roleTypeCode) => roleTypeCode !== 'blocked-role',
    })

    const result = resolver(campEntity(), 'allowed-role')
    expect(result).not.toBeNull()
  })
})
