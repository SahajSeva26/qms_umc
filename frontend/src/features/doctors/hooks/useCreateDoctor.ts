import { useMutation, useQueryClient } from '@tanstack/react-query'
import { doctorsService } from '@/features/doctors/doctors.service'
import type { CreateDoctorPayload } from '@/types/doctor.types'

// Mirrors `@/features/access-management/role/hooks/useCreateRole.ts` exactly —
// invalidates the doctors list so a newly created doctor shows up immediately.
export const useCreateDoctor = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateDoctorPayload) => doctorsService.createDoctor(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] })
    },
  })
}
