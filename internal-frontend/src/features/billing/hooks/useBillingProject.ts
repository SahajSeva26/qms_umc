import { useGetEntity } from '@/hooks/useGetEntity'
import { billingProjectsService } from '@/features/billing/billingProjects.service'

export const useBillingProject = (id: string | undefined) =>
  useGetEntity(
    (projectId) => ['billing', 'project', projectId] as const,
    billingProjectsService.getProject,
    id,
  )
