// Employee Validators
import { z } from 'zod';
import { EMPLOYEE_TYPES, EMPLOYEE_STATUS, EMPLOYEE_GENDER, DA_RULE_TYPES } from './employee.constants';

// ----------------------------------------------------------------------------------------
// shared sub-schemas
// ----------------------------------------------------------------------------------------
const ProfilePictureSchema = z.object({
    url: z.string().optional().openapi({ example: 'https://cdn.example.com/p/abc.jpg' }),
    thumbnail: z.string().optional().openapi({ example: 'https://cdn.example.com/p/abc-thumb.jpg' }),
});

// dearness/daily allowance rule — fixed amount OR percent of salary
const DaRuleSchema = z.object({
    type: z.enum([DA_RULE_TYPES.FIXED, DA_RULE_TYPES.PERCENTAGE]).openapi({ example: 'percentage' }),
    value: z.coerce.number().min(0).openapi({ example: 12 }),
});

const BankDetailsSchema = z.object({
    accountHolderName: z.string().min(1).optional().openapi({ example: 'John Doe' }),
    accountNumber: z.string().min(1).optional().openapi({ example: '123456789012' }),
    ifscCode: z
        .string()
        .regex(/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/, 'Invalid IFSC code')
        .optional()
        .openapi({ example: 'HDFC0001234' }),
    bankName: z.string().min(1).optional().openapi({ example: 'HDFC Bank' }),
    branch: z.string().min(1).optional().openapi({ example: 'Andheri West' }),
});

// coordinates are stored GeoJSON-style: [longitude, latitude] (lng first) — mirrors camp/geoProfile.
const CoordinatesSchema = z
    .tuple([
        z.number().min(-180).max(180), // longitude
        z.number().min(-90).max(90), // latitude
    ])
    .openapi({ example: [79.513, 29.2183] });

// full postal address — mirrors the LocationSchema in operations/camp/camp.validators.ts
const LocationSchema = z.object({
    addressLine1: z.string().min(1).openapi({ example: '12 MG Road' }),
    addressLine2: z.string().optional().openapi({ example: 'Near City Mall' }),
    locality: z.string().optional().openapi({ example: 'Andheri West' }),
    city: z.string().min(1).openapi({ example: 'Mumbai' }),
    state: z.string().min(1).openapi({ example: 'Maharashtra' }),
    country: z.string().min(1).optional().openapi({ example: 'India' }),
    pincode: z.string().min(1).openapi({ example: '400058' }),
    googlePlaceId: z.string().optional().openapi({ example: 'ChIJ...' }),
    coordinates: CoordinatesSchema,
});

// Aadhaar: 12 digits. PAN: 5 letters + 4 digits + 1 letter (case-insensitive — stored uppercase).
const AadharSchema = z.string().regex(/^\d{12}$/, 'Aadhaar must be 12 digits');
const PanSchema = z.string().regex(/^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/, 'Invalid PAN');

const EmployeeProfileSchema = z.object({
    firstName: z.string().min(1).optional().openapi({ example: 'John' }),
    lastName: z.string().min(1).optional().openapi({ example: 'Doe' }),
    profilePicture: ProfilePictureSchema.optional(),
    dob: z.coerce.date().optional().openapi({ example: '1995-06-15' }),
    fatherName: z.string().min(1).optional().openapi({ example: 'Richard Doe' }),
    bloodGroup: z.string().min(1).optional().openapi({ example: 'O+' }),
    gender: z
        .enum([EMPLOYEE_GENDER.MALE, EMPLOYEE_GENDER.FEMALE, EMPLOYEE_GENDER.OTHER])
        .optional()
        .openapi({ example: 'male' }),
});

//1: create ====================================>
export const CreateEmployeePayloadSchema = z.object({
    // links to an EXISTING user (minted earlier via the Role flow); validated in the service
    user: z.string().min(1).openapi({ example: '64f1a2b3c4d5e6f7a8b9c0d1' }),
    email: z.email().toLowerCase().openapi({ example: 'john.doe@example.com' }),
    phone: z.string().min(1).openapi({ example: '+919876543210' }),
    type: z.enum([EMPLOYEE_TYPES.FIELD_OFFICER]).openapi({ example: 'field-officer' }),
    doj: z.coerce.date().openapi({ example: '2026-01-15' }),
    dol: z.coerce.date().optional().openapi({ example: '2026-12-31' }),
    reason: z.string().optional().openapi({ example: 'Resigned' }),
    profile: EmployeeProfileSchema.optional(),
    // optional reporting link — another employee in the same tenant (validated in the service)
    supervisor: z.string().min(1).optional().openapi({ example: '64f1a2b3c4d5e6f7a8b9c0d2' }),
    // platform actors supply the owning tenant; customer actors are pinned to their own tenant
    tenant: z.string().min(1).optional().openapi({ example: '64f1a2b3c4d5e6f7a8b9c0d3' }),
    status: z
        .enum([EMPLOYEE_STATUS.ACTIVE, EMPLOYEE_STATUS.INACTIVE, EMPLOYEE_STATUS.TERMINATED])
        .optional()
        .openapi({ example: 'active' }),

    // compensation
    salary: z.coerce.number().min(0).optional().openapi({ example: 45000 }),
    daRule: DaRuleSchema.optional(),

    // KYC
    aadharNumber: AadharSchema.optional().openapi({ example: '123412341234' }),
    panNumber: PanSchema.optional().openapi({ example: 'ABCDE1234F' }),

    // payout account + address
    bankDetails: BankDetailsSchema.optional(),
    location: LocationSchema.optional(),

    meta: z.record(z.string(), z.any()).optional().openapi({ example: { employeeCode: 'FO-1024' } }),
});

export type ICreateEmployeePayload = z.infer<typeof CreateEmployeePayloadSchema>;

//2: update ====================================>
// tenant, user and email are identity — not editable here.
export const UpdateEmployeePayloadSchema = z.object({
    phone: z.string().min(1).optional().openapi({ example: '+919876543210' }),
    type: z.enum([EMPLOYEE_TYPES.FIELD_OFFICER]).optional().openapi({ example: 'field-officer' }),
    doj: z.coerce.date().optional().openapi({ example: '2026-01-15' }),
    dol: z.coerce.date().optional().openapi({ example: '2026-12-31' }),
    reason: z.string().optional().openapi({ example: 'Resigned' }),
    profile: EmployeeProfileSchema.optional(),
    supervisor: z.string().min(1).optional().openapi({ example: '64f1a2b3c4d5e6f7a8b9c0d2' }),
    status: z
        .enum([EMPLOYEE_STATUS.ACTIVE, EMPLOYEE_STATUS.INACTIVE, EMPLOYEE_STATUS.TERMINATED])
        .optional()
        .openapi({ example: 'inactive' }),

    // compensation
    salary: z.coerce.number().min(0).optional().openapi({ example: 45000 }),
    daRule: DaRuleSchema.optional(),

    // KYC
    aadharNumber: AadharSchema.optional(),
    panNumber: PanSchema.optional(),

    // payout account + address (each replaced wholesale when supplied)
    bankDetails: BankDetailsSchema.optional(),
    location: LocationSchema.optional(),

    meta: z.record(z.string(), z.any()).optional().openapi({ example: { employeeCode: 'FO-1024' } }),
});

export type IUpdateEmployeePayload = z.infer<typeof UpdateEmployeePayloadSchema>;

//3: search ====================================>
export const SearchEmployeeQuerySchema = z.object({
    // free-text over profile first/last name
    name: z.string().optional().openapi({ example: 'john' }),
    email: z.string().optional().openapi({ example: 'john.doe@example.com' }),
    type: z.enum([EMPLOYEE_TYPES.FIELD_OFFICER]).optional().openapi({ example: 'field-officer' }),
    status: z
        .enum([EMPLOYEE_STATUS.ACTIVE, EMPLOYEE_STATUS.INACTIVE, EMPLOYEE_STATUS.TERMINATED])
        .optional()
        .openapi({ example: 'active' }),
    // platform actors may narrow to a specific tenant; ignored for customer actors
    tenant: z.string().optional().openapi({ example: '64f1a2b3c4d5e6f7a8b9c0d3' }),
    supervisor: z.string().optional().openapi({ example: '64f1a2b3c4d5e6f7a8b9c0d2' }),
    user: z.string().optional().openapi({ example: '64f1a2b3c4d5e6f7a8b9c0d1' }),
    page: z.string().optional().openapi({ example: '1' }),
    limit: z.string().optional().openapi({ example: '10' }),
});

export type ISearchEmployeeQuery = z.infer<typeof SearchEmployeeQuerySchema>;
