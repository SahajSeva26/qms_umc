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

// All 4 pharma role types share exactly one permission (camp:book) — no
// permission array can distinguish HO/RSM/ASM/MR from each other, only
// session.roleType.code can (PharmaRoleGate on the 4 role-landing pages,
// AnyPharmaRoleGate on the deep-linkable camps route). This lazyRoute gate
// answers a different question — "does this session have any business
// under /pharma/* at all" — which the role-type gates can't answer on their
// own (a non-pharma session with no camp:book previously reached a
// 200-rendered "no pharma portal for your role" dead end here instead of a
// real /unauthorized redirect, like every other ungated route in the app).
const PHARMA_VIEW_PERMISSIONS = ['camp:book']

export const pharmaRoutes: RouteObject[] = [
  { path: PHARMA_ROUTES.PHARMA, lazy: lazyRoute(() => import('./pages/PharmaRedirectPage'), PHARMA_VIEW_PERMISSIONS) },
  { path: PHARMA_ROUTES.PHARMA_HO, lazy: lazyRoute(() => import('./pages/HoPortalPage'), PHARMA_VIEW_PERMISSIONS) },
  { path: PHARMA_ROUTES.PHARMA_RSM, lazy: lazyRoute(() => import('./pages/RsmPortalPage'), PHARMA_VIEW_PERMISSIONS) },
  { path: PHARMA_ROUTES.PHARMA_ASM, lazy: lazyRoute(() => import('./pages/AsmPortalPage'), PHARMA_VIEW_PERMISSIONS) },
  { path: PHARMA_ROUTES.PHARMA_MR, lazy: lazyRoute(() => import('./pages/MrPortalPage'), PHARMA_VIEW_PERMISSIONS) },
  { path: PHARMA_ROUTES.PHARMA_PROJECT_CAMPS, lazy: lazyRoute(() => import('./pages/PharmaProjectCampsPage'), PHARMA_VIEW_PERMISSIONS) },
]
