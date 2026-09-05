import { useMutation, useQueryClient } from '@tanstack/react-query'
import { doctorsService } from '@/features/doctors/doctors.service'
import { doctorKeys } from '@/features/doctors/hooks/useDoctors'
import type { BulkDoctorPayload } from '@/types/doctor.types'

export const useBulkCreateDoctors = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: BulkDoctorPayload) => doctorsService.bulkCreateDoctors(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: doctorKeys.all })
    },
  })
}
