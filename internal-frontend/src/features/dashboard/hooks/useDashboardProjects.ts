import { useQuery } from '@tanstack/react-query'
import { projectsService } from '@/features/projects/projects.service'
import { PROJECT_THERAPY_LABEL } from '@/types/project.types'
import type { ProjectEntity } from '@/types/project.types'

const STALE_TIME_MS = 60_000
const PAGE_SIZE = 200

export interface DashboardProjectRow {
  id: string
  code: string
  name: string
  clientName: string
  divisionName: string | null
  therapyLabel: string
  // campCost * totalCamps — same formula GET /projects/report uses server-side. Not an actual invoiced amount.
  estimatedValue: number
  executedCamps: number
}

export interface DashboardProjectsData {
  // Top 6 by estimatedValue, for "Top projects by estimated value".
  topByEstimatedValue: DashboardProjectRow[]
  // Every PO-mode project with no PO number recorded yet but camps already executed.
  pendingPurchaseOrders: DashboardProjectRow[]
}

function toRow(p: ProjectEntity): DashboardProjectRow {
  return {
    id: p.id,
    code: p.code,
    name: p.name,
    clientName: typeof p.tenant === 'object' && p.tenant ? p.tenant.name : '—',
    divisionName: typeof p.division === 'object' && p.division ? p.division.name : null,
    therapyLabel: PROJECT_THERAPY_LABEL[p.therapy],
    estimatedValue: p.campCost * p.totalCamps,
    executedCamps: p.stats?.executedCamps ?? 0,
  }
}

// One fully-paginated GET /projects?report=true sweep, shared by both "Top projects by estimated
// value" and "POs pending" — avoids two separate single-page (and silently truncating) fetches.
async function fetchAllProjects(): Promise<ProjectEntity[]> {
  const firstPage = await projectsService.searchProjects({ report: 'true', limit: String(PAGE_SIZE), page: '1' })
  const { count, items } = firstPage.data

  const totalPages = Math.ceil(count / PAGE_SIZE)
  if (totalPages <= 1) return items

  const restPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) =>
      projectsService.searchProjects({ report: 'true', limit: String(PAGE_SIZE), page: String(i + 2) }),
    ),
  )
  return [items, ...restPages.map((p) => p.data.items)].flat()
}

export const useDashboardProjects = (enabled = true) =>
  useQuery({
    queryKey: ['projects', 'dashboard-full-sweep'],
    queryFn: async (): Promise<DashboardProjectsData> => {
      const projects = await fetchAllProjects()
      const rows = projects.map(toRow)

      const topByEstimatedValue = [...rows].sort((a, b) => b.estimatedValue - a.estimatedValue).slice(0, 6)

      // PO-mode project (not agreement/mail-confirmation) with no recorded PO number, but camps
      // already executed — the real gap the prototype's "POs pending" list gestures at.
      const pendingPurchaseOrders = projects
        .filter((p) => p.executionMode?.mode === 'po')
        .filter((p) => !p.executionMode?.po?.purchaseOrders?.some((po) => !!po.number))
        .filter((p) => (p.stats?.executedCamps ?? 0) > 0)
        .map(toRow)
        .sort((a, b) => b.executedCamps - a.executedCamps)

      return { topByEstimatedValue, pendingPurchaseOrders }
    },
    enabled,
    staleTime: STALE_TIME_MS,
  })
