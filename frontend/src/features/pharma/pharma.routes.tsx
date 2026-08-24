import type { RouteObject } from 'react-router-dom'
import { lazyRoute } from '@/lib/router/lazyRoute'

export const PHARMA_ROUTES = {
  PHARMA:              '/pharma',
  PHARMA_HO:            '/pharma/ho',
  PHARMA_RSM:           '/pharma/rsm',
  PHARMA_ASM:           '/pharma/asm',
  PHARMA_MR:            '/pharma/mr',
  PHARMA_PROJECT_CAMPS: '/pharma/projects/:id/camps',
}

// All 4 pharma role types share one permission (camp:book) — this gate only
// answers "any business under /pharma/* at all"; role-type gates handle the rest.
const PHARMA_VIEW_PERMISSIONS = ['camp:book']

export const pharmaRoutes: RouteObject[] = [
  { path: PHARMA_ROUTES.PHARMA, lazy: lazyRoute(() => import('./pages/PharmaRedirectPage'), PHARMA_VIEW_PERMISSIONS) },
  { path: PHARMA_ROUTES.PHARMA_HO, lazy: lazyRoute(() => import('./pages/HoPortalPage'), PHARMA_VIEW_PERMISSIONS) },
  { path: PHARMA_ROUTES.PHARMA_RSM, lazy: lazyRoute(() => import('./pages/RsmPortalPage'), PHARMA_VIEW_PERMISSIONS) },
  { path: PHARMA_ROUTES.PHARMA_ASM, lazy: lazyRoute(() => import('./pages/AsmPortalPage'), PHARMA_VIEW_PERMISSIONS) },
  { path: PHARMA_ROUTES.PHARMA_MR, lazy: lazyRoute(() => import('./pages/MrPortalPage'), PHARMA_VIEW_PERMISSIONS) },
  { path: PHARMA_ROUTES.PHARMA_PROJECT_CAMPS, lazy: lazyRoute(() => import('./pages/PharmaProjectCampsPage'), PHARMA_VIEW_PERMISSIONS) },
]
