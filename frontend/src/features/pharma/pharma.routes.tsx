import type { RouteObject } from 'react-router-dom'
import PharmaRedirectPage from './pages/PharmaRedirectPage'
import HoPortalPage from './pages/HoPortalPage'
import RsmPortalPage from './pages/RsmPortalPage'
import AsmPortalPage from './pages/AsmPortalPage'
import MrPortalPage from './pages/MrPortalPage'

export const PHARMA_ROUTES = {
  PHARMA:     '/pharma',
  PHARMA_HO:  '/pharma/ho',
  PHARMA_RSM: '/pharma/rsm',
  PHARMA_ASM: '/pharma/asm',
  PHARMA_MR:  '/pharma/mr',
}

export const pharmaRoutes: RouteObject[] = [
  { path: PHARMA_ROUTES.PHARMA,     element: <PharmaRedirectPage /> },
  { path: PHARMA_ROUTES.PHARMA_HO,  element: <HoPortalPage /> },
  { path: PHARMA_ROUTES.PHARMA_RSM, element: <RsmPortalPage /> },
  { path: PHARMA_ROUTES.PHARMA_ASM, element: <AsmPortalPage /> },
  { path: PHARMA_ROUTES.PHARMA_MR,  element: <MrPortalPage /> },
]
