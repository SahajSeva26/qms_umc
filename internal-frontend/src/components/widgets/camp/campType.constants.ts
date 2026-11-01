import type { CampType } from '@/types/campReal.types'

// Same 3 type colors already used app-wide for camp type pills/cards (CampCardReal.tsx, CampDrawer.tsx).
export const CAMP_TYPE_COLOR: Record<CampType, string> = {
  screening: '#3b6dff',
  diet: '#10b981',
  lab: '#8b5cf6',
}
