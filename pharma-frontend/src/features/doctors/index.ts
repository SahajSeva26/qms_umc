// Public surface of the Doctors feature — other features import from here, never by reaching
// into features/pharma/doctors.service.ts (the doctor-create/update flow's own home) directly.
export { doctorKeys } from '@/hooks/doctorKeys'

import { doctorsService } from '@/features/pharma/doctors.service'

export const searchDoctors = doctorsService.searchDoctors
