import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as doctorsService from '@/features/doctors/doctors.service'
import type { Doctor, DoctorBroadcast } from '@/features/doctors/doctors.types'
import { useCampsData } from '@/hooks/useCampsData'

// Camp reads go through the shared useCampsData hook — doctors.service.ts
// itself never imports features/camps/ internals beyond the DOCTORS seed
// array, per CLAUDE.md §3. Engagement/prediction helpers are pure functions
// exported from the service and called here (or in components) with the
// camps this hook already has on hand.
export const useDoctors = () => {
  const queryClient = useQueryClient()
  const { camps } = useCampsData()

  const doctorsQuery = useQuery({ queryKey: ['doctors-all'], queryFn: doctorsService.getAllDoctors })
  const broadcastsQuery = useQuery({ queryKey: ['doctors-broadcasts'], queryFn: doctorsService.getBroadcasts })

  const invalidateDoctors = () => queryClient.invalidateQueries({ queryKey: ['doctors-all'] })
  const invalidateBroadcasts = () => queryClient.invalidateQueries({ queryKey: ['doctors-broadcasts'] })

  const addDoctorMutation = useMutation({
    mutationFn: (rec: Doctor) => doctorsService.addDoctor(rec),
    onSuccess: invalidateDoctors,
  })

  const editDoctorMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Doctor> }) => doctorsService.editDoctor(id, patch),
    onSuccess: invalidateDoctors,
  })

  const addBroadcastMutation = useMutation({
    mutationFn: (entry: DoctorBroadcast) => doctorsService.addBroadcast(entry),
    onSuccess: invalidateBroadcasts,
  })

  return {
    doctors: doctorsQuery.data ?? [],
    camps,
    broadcasts: broadcastsQuery.data ?? [],
    isLoading: doctorsQuery.isLoading,

    addDoctor: (rec: Doctor) => addDoctorMutation.mutateAsync(rec),
    editDoctor: (id: string, patch: Partial<Doctor>) => editDoctorMutation.mutateAsync({ id, patch }),
    addBroadcast: (entry: DoctorBroadcast) => addBroadcastMutation.mutateAsync(entry),

    engagementFor: (doctorId: string) => doctorsService.engagementFor(doctorId, camps),
    engagementBand: doctorsService.engagementBand,
    engagementScore: doctorsService.engagementScore,
    doctorPrediction: doctorsService.doctorPrediction,
    genUIN: doctorsService.genUIN,
  } as const
}
