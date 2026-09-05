// Patient Validators
import { z } from 'zod';
import { PATIENT_GENDERS, PATIENT_STATUS } from './patient.constants';

// Address is an embedded value object. When supplied on create, the core fields are required
// (mirrors the model); line2 is optional.
const AddressSchema = z.object({
    line1: z.string().min(1).openapi({ example: '12 MG Road' }),
    line2: z.string().min(1).optional().openapi({ example: 'Near City Hospital' }),
    city: z.string().min(1).openapi({ example: 'Pune' }),
    state: z.string().min(1).openapi({ example: 'Maharashtra' }),
    pincode: z.string().min(1).openapi({ example: '411001' }),
});

//1: create ====================================>
// code is auto-generated from the global `patient` counter (pat-000001) — never supplied by the
// caller. createdBy is taken from the authenticated actor, not the payload.
export const CreatePatientPayloadSchema = z.object({
    firstName: z.string().min(1).openapi({ example: 'Rahul' }),
    middleName: z.string().min(1).optional().openapi({ example: 'Kumar' }),
    lastName: z.string().min(1).optional().openapi({ example: 'Sharma' }),
    dateOfBirth: z.coerce.date().openapi({ example: '1985-06-15' }),
    gender: z.enum(Object.values(PATIENT_GENDERS)).openapi({ example: 'male' }),
    // Digits only, not just length — a non-numeric value would otherwise
    // become unsearchable by mobile (search routes on /^\d+$/ before hitting the DB).
    mobile: z.string().regex(/^\d{10,}$/, 'Mobile must be at least 10 digits, numbers only').openapi({ example: '9876543210' }),
    email: z.email().optional().openapi({ example: 'rahul@example.com' }),
    address: AddressSchema.optional(),
    status: z.enum(Object.values(PATIENT_STATUS)).optional().openapi({ example: 'active' }),
});
export type ICreatePatientPayload = z.infer<typeof CreatePatientPayloadSchema>;

//2: update ====================================>
// code is intentionally omitted — it is immutable after create.
export const UpdatePatientPayloadSchema = z.object({
    firstName: z.string().min(1).optional(),
    middleName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    dateOfBirth: z.coerce.date().optional(),
    gender: z.enum(Object.values(PATIENT_GENDERS)).optional(),
    mobile: z.string().regex(/^\d{10,}$/, 'Mobile must be at least 10 digits, numbers only').optional(),
    email: z.email().optional(),
    address: AddressSchema.optional(),
    status: z.enum(Object.values(PATIENT_STATUS)).optional(),
});
export type IUpdatePatientPayload = z.infer<typeof UpdatePatientPayloadSchema>;

//3: search ====================================>
export const SearchPatientQuerySchema = z.object({
    // free-text keyword matched against first / middle / last name
    name: z.string().optional().openapi({ example: 'Rahul' }),
    code: z.string().optional().openapi({ example: 'pat-000001' }),
    mobile: z.string().optional().openapi({ example: '9876543210' }),
    email: z.string().optional().openapi({ example: 'rahul@example.com' }),
    gender: z.enum(Object.values(PATIENT_GENDERS)).optional().openapi({ example: 'male' }),
    status: z.enum(Object.values(PATIENT_STATUS)).optional().openapi({ example: 'active' }),
    page: z.string().optional().openapi({ example: '1' }),
    limit: z.string().optional().openapi({ example: '10' }),
});
export type ISearchPatientQuery = z.infer<typeof SearchPatientQuerySchema>;

//4: report ====================================>
export const PatientReportQuerySchema = z.object({});
export type IPatientReportQuery = z.infer<typeof PatientReportQuerySchema>;
