import { useQuery } from '@tanstack/react-query'
import { getDashboardData } from '@/features/dashboard/dashboard.service'

export const useDashboardData = () => {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboardData,
  })
}
