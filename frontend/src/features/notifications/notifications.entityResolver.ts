import { FiBox } from 'react-icons/fi'
import type { IconType } from 'react-icons'
import { isPharmaRoleType } from '@/lib/access/pharmaAccess'
import type { NotificationEntity } from '@/features/notifications/notifications.types'

interface EntityResolution {
  icon: IconType
  label: string
  href: (id: string) => string
}

// Whitelist only — never build a nav path from entity.type (free-text backend string).
const ENTITY_RESOLVERS: Record<string, EntityResolution> = {
  camp: {
    icon: FiBox,
    label: 'Camp',
    href: (id) => `/camps?camp=${id}`,
  },
}

export function resolveNotificationEntity(entity: NotificationEntity | null, roleTypeCode?: string | null): EntityResolution | null {
  if (!entity?.type) return null
  if (isPharmaRoleType(roleTypeCode)) return null
  return ENTITY_RESOLVERS[entity.type] ?? null
}
