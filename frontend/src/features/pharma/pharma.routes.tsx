import type { RouteObject } from 'react-router-dom'
import PharmaPage from './pages/PharmaPage'

export const PHARMA_ROUTES = {
  PHARMA:     '/pharma',
  PHARMA_HO:  '/pharma/ho',
  PHARMA_RSM: '/pharma/rsm',
  PHARMA_ASM: '/pharma/asm',
  PHARMA_MR:  '/pharma/mr',
}

export const pharmaRoutes: RouteObject[] = [
  { path: PHARMA_ROUTES.PHARMA,     element: <PharmaPage /> },
  { path: PHARMA_ROUTES.PHARMA_HO,  element: <PharmaPage /> },
  { path: PHARMA_ROUTES.PHARMA_RSM, element: <PharmaPage /> },
  { path: PHARMA_ROUTES.PHARMA_ASM, element: <PharmaPage /> },
  { path: PHARMA_ROUTES.PHARMA_MR,  element: <PharmaPage /> },
]
