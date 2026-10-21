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

  it('resolves a lead entity to /crm?lead=<id>', () => {
    const resolution = resolveNotificationEntity({ id: 'lead-1', type: 'lead', event: 'lead.create' })
    expect(resolution).not.toBeNull()
    expect(resolution?.href('lead-1')).toBe('/crm?lead=lead-1')
    expect(resolution?.label).toBe('Lead')
  })

  it('resolves a project entity to /projects?project=<id>', () => {
    const resolution = resolveNotificationEntity({ id: 'proj-1', type: 'project', event: 'project.create' })
    expect(resolution).not.toBeNull()
    expect(resolution?.href('proj-1')).toBe('/projects?project=proj-1')
    expect(resolution?.label).toBe('Project')
  })

  // /projects is gated to project:search/project:manage/tenant:manage — a camp
  // coordinator holds none of those, so clicking a project.update notification
  // about their own assignment would otherwise deep-link into /unauthorized.
  // Gated on the real permission contract (hasAnyPermission), not a role-type
  // blocklist, so this stays correct as roles/permissions change.
  it('returns null for a project entity when the viewer holds none of the required permissions (e.g. a camp coordinator)', () => {
    const hasAnyPermission = () => false
    expect(
      resolveNotificationEntity({ id: 'proj-1', type: 'project', event: 'project.create' }, 'camp-coordinator-diet', hasAnyPermission),
    ).toBeNull()
  })

  it('still resolves camp for a viewer lacking project permissions (only /projects is unreachable for them, not /camps)', () => {
    const hasAnyPermission = () => false
    const resolution = resolveNotificationEntity({ id: 'camp-1', type: 'camp', event: 'camp.create' }, 'camp-coordinator-diet', hasAnyPermission)
    expect(resolution).not.toBeNull()
    expect(resolution?.href('camp-1')).toBe('/camps?camp=camp-1')
  })

  it('still resolves project for a viewer holding project:search (e.g. a sales rep)', () => {
    const hasAnyPermission = (codes: string[]) => codes.includes('project:search')
    const resolution = resolveNotificationEntity({ id: 'proj-1', type: 'project', event: 'project.create' }, 'sales-rep', hasAnyPermission)
    expect(resolution).not.toBeNull()
    expect(resolution?.href('proj-1')).toBe('/projects?project=proj-1')
  })

  it('still resolves project when no hasAnyPermission callback is passed (e.g. callers that have not been updated)', () => {
    expect(resolveNotificationEntity({ id: 'proj-1', type: 'project', event: 'project.create' })).not.toBeNull()
  })
})
