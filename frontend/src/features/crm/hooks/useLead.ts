import { useGetEntity } from '@/hooks/useGetEntity'
import { crmService } from '@/features/crm/crm.service'

export const useLead = (id: string | undefined) =>
  useGetEntity((leadId) => ['leads', 'detail', leadId] as const, crmService.getLead, id)
