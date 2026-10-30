import { useMutation, useQueryClient } from '@tanstack/react-query'
import { projectsService } from '@/features/projects/projects.service'
import { projectKeys } from '@/hooks/projectKeys'
import type { PurchaseOrder } from '@/types/project.types'

interface AddProjectPurchaseOrderVariables {
  projectId: string
  purchaseOrder: PurchaseOrder
}

/**
 * The backend currently exposes only the general project PUT, not an atomic
 * append-PO operation. Re-read immediately before updating so a stale drawer
 * snapshot does not overwrite POs that were added since the drawer opened.
 */
export const useAddProjectPurchaseOrder = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectId, purchaseOrder }: AddProjectPurchaseOrderVariables) => {
      const latest = await projectsService.getProject(projectId)
      if (!latest.data || latest.data.executionMode?.mode !== 'po') {
        throw new Error('This project is no longer configured for purchase orders.')
      }

      const existing = latest.data.executionMode.po?.purchaseOrders ?? []
      return projectsService.updateProject(projectId, {
        executionMode: {
          mode: 'po',
          po: { purchaseOrders: [...existing, purchaseOrder] },
        },
      })
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all })
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.projectId) })
    },
  })
}
