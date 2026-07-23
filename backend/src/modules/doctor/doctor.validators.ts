// Doctor Validators
import { z } from 'zod';
import { DOCTOR_SPECIALIZATION, DOCTOR_STATUS } from './doctor.constants';

//1: create ====================================>
// pharmaCode is the natural key — required here, and never editable afterwards.
export const CreateDoctorPayloadSchema = z.object({
    pharmaCode: z.string().min(1).openapi({ example: 'DOC-0012' }),
    name: z.string().min(1).openapi({ example: 'Dr. Anil Kumar' }),
    specialization: z.enum(Object.values(DOCTOR_SPECIALIZATION)).openapi({ example: 'cp' }),
    mobile: z.string().min(10).openapi({ example: '9876543210' }),
    city: z.string().min(1).openapi({ example: 'Haldwani' }),
    state: z.string().min(1).openapi({ example: 'Uttarakhand' }),
    pincode: z.string().min(6).openapi({ example: '263139' }),
    email: z.email().openapi({ example: 'anil.kumar@example.com' }),
    googleMapLink: z.string().optional().openapi({ example: 'https://maps.app.goo.gl/xyz' }),
    status: z.enum(Object.values(DOCTOR_STATUS)).optional().openapi({ example: 'active' }),
});
export type ICreateDoctorPayload = z.infer<typeof CreateDoctorPayloadSchema>;

//2: update ====================================>
// pharmaCode is intentionally omitted — it is immutable after create.
export const UpdateDoctorPayloadSchema = z.object({
    name: z.string().min(1).optional(),
    specialization: z.enum(Object.values(DOCTOR_SPECIALIZATION)).optional(),
    mobile: z.string().min(10).optional(),
    city: z.string().min(1).optional(),
    state: z.string().min(1).optional(),
    pincode: z.string().min(6).optional(),
    email: z.email().optional(),
    googleMapLink: z.string().optional(),
    status: z.enum(Object.values(DOCTOR_STATUS)).optional(),
});
export type IUpdateDoctorPayload = z.infer<typeof UpdateDoctorPayloadSchema>;

//3: search ====================================>
export const SearchDoctorQuerySchema = z.object({
    name: z.string().optional().openapi({ example: 'Anil' }),
    specialization: z.enum(Object.values(DOCTOR_SPECIALIZATION)).optional().openapi({ example: 'cp' }),
    status: z.enum(Object.values(DOCTOR_STATUS)).optional().openapi({ example: 'active' }),
    city: z.string().optional().openapi({ example: 'Haldwani' }),
    state: z.string().optional().openapi({ example: 'Uttarakhand' }),
    pharmaCode: z.string().optional().openapi({ example: 'DOC-0012' }),
    page: z.string().optional().openapi({ example: '1' }),
    limit: z.string().optional().openapi({ example: '10' }),
});
export type ISearchDoctorQuery = z.infer<typeof SearchDoctorQuerySchema>;
