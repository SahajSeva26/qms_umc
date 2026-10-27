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

  // /camps?camp=<id> is unreachable for pharma roles (AppLayout force-redirects them) — except
  // the pharma field-force (MR/ASM/RSM), which has its own exception onto the combined Camp
  // Management page; pharma-division-head is not field-force and stays excluded.
  it('returns null for a whitelisted entity type when the viewer is pharma-division-head (pharma roles cannot reach /camps)', () => {
    expect(resolveNotificationEntity({ id: 'camp-1', type: 'camp', event: 'camp.create' }, 'pharma-division-head')).toBeNull()
  })

  it.each(['pharma-mr', 'pharma-asm', 'pharma-rsm'])(
    'resolves camp for %s (AppLayout.tsx permits pathname === "/camps" for pharma field-force)',
    (roleTypeCode) => {
      const resolution = resolveNotificationEntity({ id: 'camp-1', type: 'camp', event: 'camp.create' }, roleTypeCode)
      expect(resolution).not.toBeNull()
      expect(resolution?.href('camp-1')).toBe('/camps?camp=camp-1')
      expect(resolution?.label).toBe('Camp')
    },
  )

  it.each(['pharma-mr', 'pharma-asm', 'pharma-rsm'])(
    'resolves camp for %s when it actually holds camp:book (the real permission check, not just role type)',
    (roleTypeCode) => {
      const hasAnyPermission = (codes: string[]) => codes.includes('camp:book')
      const resolution = resolveNotificationEntity({ id: 'camp-1', type: 'camp', event: 'camp.create' }, roleTypeCode, hasAnyPermission)
      expect(resolution).not.toBeNull()
      expect(resolution?.href('camp-1')).toBe('/camps?camp=camp-1')
    },
  )

  // A field-force session without camp:book is real and supported (its sidebar link correctly
  // disables — see Sidebar.test.tsx) — /camps still 403s for it, so the card must stay inert
  // rather than deep-linking into /unauthorized.
  it.each(['pharma-mr', 'pharma-asm', 'pharma-rsm'])(
    'returns null for %s when it lacks camp:book (and every other camp-read permission) — the real guard, not just role type',
    (roleTypeCode) => {
      const hasAnyPermission = () => false
      expect(
        resolveNotificationEntity({ id: 'camp-1', type: 'camp', event: 'camp.create' }, roleTypeCode, hasAnyPermission),
      ).toBeNull()
    },
  )

  it('still returns null for pharma-mr on a non-camp entity type (e.g. lead) — the exception is camp-only', () => {
    expect(resolveNotificationEntity({ id: 'lead-1', type: 'lead', event: 'lead.create' }, 'pharma-mr')).toBeNull()
  })

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

  it('resolves camp for a non-pharma viewer who holds a camp-read permission but no project permission (the two gates are independent)', () => {
    const hasAnyPermission = (codes: string[]) => codes.includes('camp:search')
    const resolution = resolveNotificationEntity({ id: 'camp-1', type: 'camp', event: 'camp.create' }, 'camp-coordinator-diet', hasAnyPermission)
    expect(resolution).not.toBeNull()
    expect(resolution?.href('camp-1')).toBe('/camps?camp=camp-1')
  })

  // /camps is gated to CAMP_VIEW_PERMISSIONS — this applies to EVERY recipient, not only the
  // pharma field-force exception, so a non-pharma role with no camp-read permission at all must
  // not get a clickable camp notification that 403s straight into /unauthorized.
  it('returns null for a camp entity when a non-pharma viewer holds none of the required camp-read permissions', () => {
    const hasAnyPermission = () => false
    expect(
      resolveNotificationEntity({ id: 'camp-1', type: 'camp', event: 'camp.create' }, 'camp-coordinator-diet', hasAnyPermission),
    ).toBeNull()
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
