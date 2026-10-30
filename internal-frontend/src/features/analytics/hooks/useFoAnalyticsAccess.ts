import { usePermission } from '@/hooks/usePermission'

// Each section gates on its own real permission, never bundled. camp:manage only, not tenant:manage
// — camp.service.ts's applyOwnScope only lifts own-camp scoping for camp:manage specifically.
export const useFoAnalyticsAccess = () => {
  const { hasAnyPermission } = usePermission()
  return {
    canViewFoRoster: hasAnyPermission(['inventory-assignment:manage']),
    canViewFoLeaderboard: hasAnyPermission(['camp:manage']),
  }
}
