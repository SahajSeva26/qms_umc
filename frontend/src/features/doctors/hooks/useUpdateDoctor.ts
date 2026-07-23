import { useMutation, useQueryClient } from '@tanstack/react-query'
import { doctorsService } from '@/features/doctors/doctors.service'
import type { UpdateDoctorPayload } from '@/types/doctor.types'

// Mirrors `@/features/access-management/role/hooks/useUpdateRole.ts` exactly.
export const useUpdateDoctor = (id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateDoctorPayload) => doctorsService.updateDoctor(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor', id] })
      queryClient.invalidateQueries({ queryKey: ['doctors'] })
    },
  })
}
