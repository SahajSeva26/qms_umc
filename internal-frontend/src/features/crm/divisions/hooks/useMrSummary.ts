import { useCampsReal } from '@/features/camps/hooks/useCampsReal'
import { useDoctorSearch } from '@/hooks/useDoctorSearch'

// Camps booked/executed are real per-MR counts; doctors mapped is division-level only (doctor
// has no mr field).
export function useMrSummary(mrRoleId: string, divisionId: string | undefined) {
  const campsBooked = useCampsReal({ mr: mrRoleId, limit: '1' }, !!mrRoleId)
  const campsExecuted = useCampsReal({ mr: mrRoleId, status: 'closed', limit: '1' }, !!mrRoleId)
  const doctorsMapped = useDoctorSearch({ division: divisionId, limit: '1' }, { enabled: !!divisionId })

  return {
    campsBookedCount: campsBooked.data?.data?.count,
    campsBookedLoading: campsBooked.isLoading,
    campsBookedError: campsBooked.isError,
    campsExecutedCount: campsExecuted.data?.data?.count,
    campsExecutedLoading: campsExecuted.isLoading,
    campsExecutedError: campsExecuted.isError,
    doctorsMappedCount: doctorsMapped.data?.data?.count,
    doctorsMappedLoading: doctorsMapped.isLoading,
    doctorsMappedError: doctorsMapped.isError,
  }
}
