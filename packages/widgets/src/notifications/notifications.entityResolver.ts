import type { IconType } from 'react-icons'
import type { NotificationEntity } from '@qms/core'

export interface EntityResolution {
  icon: IconType
  label: string
  href: (id: string) => string
}

export interface EntityResolverConfig {
  /** Whitelist only — an entity.type not in this map resolves to null (inert card), never built
   * from entity.type directly (it's a free-text backend string, not a route-safe value). */
  resolvers: Record<string, EntityResolution>
  /** Per-type permission gate — return false to treat that type as unresolved for this viewer,
   * even though it's in `resolvers`. Omit a type here to leave it permission-ungated. */
  requiredPermissions?: Record<string, (hasAnyPermission: (codes: string[]) => boolean) => boolean>
  /** App-specific extra gate evaluated BEFORE the per-type permission check — e.g.
   * internal-frontend's "a non-field-force pharma role sees nothing except camp" rule, which
   * depends on the viewer's role type, not the entity or a permission code. Return false to treat
   * the entity as unresolved. Omit if the app has no such extra rule. */
  extraGate?: (entity: NotificationEntity, roleTypeCode?: string | null, hasAnyPermission?: (codes: string[]) => boolean) => boolean
}

// Factory, not a fixed module-level map — each app supplies its own entity→route/icon/label
// whitelist and permission gates (internal-frontend's crm/projects/camps paths and permission
// codes don't exist the same way in pharma-frontend, and vice versa). Unknown or unsupported
// entity types always resolve to null — the caller (NotificationCard) renders an inert,
// non-clickable row for those, never guesses a path from entity.type itself.
//
// Lives in @qms/widgets, not @qms/core: EntityResolution carries a react-icons IconType, a
// presentation concern — @qms/core stays limited to transport/query contracts (types, services,
// hooks), with no UI-shaped exports.
export function createNotificationEntityResolver(config: EntityResolverConfig) {
  return function resolveNotificationEntity(
    entity: NotificationEntity | null,
    roleTypeCode?: string | null,
    hasAnyPermission?: (codes: string[]) => boolean,
  ): EntityResolution | null {
    if (!entity?.type) return null
    if (config.extraGate && !config.extraGate(entity, roleTypeCode, hasAnyPermission)) return null

    // Fail CLOSED: a type with a configured permission check must have hasAnyPermission actually
    // supplied to pass. A caller that configures requiredPermissions but forgets to pass
    // hasAnyPermission must never fall through to a resolvable (clickable) destination — that
    // would silently skip the gate entirely instead of refusing it.
    const requiredPermissionCheck = config.requiredPermissions?.[entity.type]
    if (requiredPermissionCheck && (!hasAnyPermission || !requiredPermissionCheck(hasAnyPermission))) return null

    return config.resolvers[entity.type] ?? null
  }
}
