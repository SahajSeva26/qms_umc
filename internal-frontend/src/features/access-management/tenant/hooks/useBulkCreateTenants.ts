import { useMutation, useQueryClient } from '@tanstack/react-query'
import { accessManagementService } from '@/features/access-management/accessManagement.service'
import { tenantKeys } from '@/features/access-management/tenant/hooks/useTenants'

export const useBulkCreateTenants = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (file: File) => accessManagementService.bulkCreateTenants(file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tenantKeys.all }),
  })
}
