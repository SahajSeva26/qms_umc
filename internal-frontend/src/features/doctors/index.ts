// Public surface of the Doctors feature — other features import from here, never from
// features/doctors/components/* or features/doctors/hooks/* directly. Keeps doctor create/update
// internals (DoctorSingleForm, DoctorCsvImport, useCreateDoctor, etc.) free to change without
// touching every cross-feature consumer.
export { default as EditDoctorModal } from '@/features/doctors/components/EditDoctorModal'
