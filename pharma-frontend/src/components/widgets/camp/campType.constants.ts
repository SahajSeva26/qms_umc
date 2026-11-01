import type { CampType } from '@/types/campReal.types'

// Same 3 type colors used app-wide for camp type pills/cards. Mirrors
// internal-frontend's campType.constants.ts.
export const CAMP_TYPE_COLOR: Record<CampType, string> = {
  screening: '#3b6dff',
  diet: '#10b981',
  lab: '#8b5cf6',
}
