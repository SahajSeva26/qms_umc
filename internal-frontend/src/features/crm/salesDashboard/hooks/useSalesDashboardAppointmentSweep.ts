import { useQuery } from '@tanstack/react-query'
import { appointmentsRealService } from '@/features/crm/appointments/appointmentsReal.service'
import type { AppointmentEntity } from '@/types/appointment.types'
import { fetchRemainingPagesBounded } from '@/lib/api/pagination'

const STALE_TIME_MS = 60_000
const PAGE_SIZE = 200

// Real data shared by the Performance tab (Meetings/Follow-ups columns) and Activity tab (feed +
// heatmap) — appointment.service.ts's applyOwnScope auto-pins a non-manage actor (KAM) to their own
// appointments, same own-scope-agnostic pattern as useMySalesSweep for leads. Both sales-rep and
// sales-head hold appointment:search/manage by default (see
// backend/src/shared/env/defaultRoleTypes.ts), so no permission change was needed.
async function fetchAllAppointments(): Promise<AppointmentEntity[]> {
  const firstPage = await appointmentsRealService.searchAppointments({ limit: String(PAGE_SIZE), page: '1' })
  const { count, items } = firstPage.data

  const totalPages = Math.ceil(count / PAGE_SIZE)
  if (totalPages <= 1) return items

  const restPages = await fetchRemainingPagesBounded(totalPages, (page) =>
    appointmentsRealService.searchAppointments({ limit: String(PAGE_SIZE), page: String(page) }),
  )
  return [items, ...restPages.map((p) => p.data.items)].flat()
}

export const useSalesDashboardAppointmentSweep = (enabled: boolean) =>
  useQuery({
    queryKey: ['appointments', 'sales-dashboard-sweep'],
    queryFn: fetchAllAppointments,
    enabled,
    staleTime: STALE_TIME_MS,
    retry: false,
  })
