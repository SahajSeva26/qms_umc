import { z } from 'zod';
import { TENANT_STATUS, TENANT_TYPE } from './tenant.constants';
import {
    isValidObjectID,
    stripWhitespace,
} from '../../../shared/utils/strings';
import { RegisterUserPayloadSchema } from '../../auth/auth.validators';

// coordinates are stored GeoJSON-style: [longitude, latitude] (lng first)
const CoordinatesSchema = z
    .tuple([
        z.number().min(-180).max(180), // longitude
        z.number().min(-90).max(90), // latitude
    ])
    .openapi({ example: [72.8296, 19.1197] });

// the tenant's registered/office address
const AddressSchema = z.object({
    addressLine1: z.string().min(1).openapi({ example: '12 MG Road' }),
    addressLine2: z.string().optional().openapi({ example: 'Near City Mall' }),
    locality: z.string().optional().openapi({ example: 'Andheri West' }),
    city: z.string().min(1).openapi({ example: 'Mumbai' }),
    state: z.string().min(1).openapi({ example: 'Maharashtra' }),
    country: z.string().min(1).optional().openapi({ example: 'India' }),
    pincode: z.string().min(1).openapi({ example: '400058' }),
    googlePlaceId: z.string().optional().openapi({ example: 'ChIJ...' }),
    coordinates: CoordinatesSchema.optional(),
});

//1: create ====================================>
export const CreateTenantPayloadSchema = z.object({
    code: z
        .preprocess(
            stripWhitespace,
            z
                .string()
                .min(3)
                .lowercase()
                .refine((val) => !isValidObjectID(val), {
                    message: 'Code must not be an ObjectId',
                }),
        )
        .openapi({ example: 'cipla' }),
    name: z.string().min(1).openapi({ example: 'Cipla pvt ltd' }),
    description: z
        .string()
        .optional()
        .openapi({ example: 'Cipla private limited' }),
    owner: RegisterUserPayloadSchema,
    // optional — the platform sales person (a Role) assigned to this tenant account
    salesPerson: z
        .string()
        .refine((val) => isValidObjectID(val), { message: 'salesPerson must be a valid ObjectId' })
        .optional()
        .openapi({ example: '64f0c2a1b3d4e5f6a7b8c9d0' }),
    // optional — the tenant's registered/office address
    address: AddressSchema.optional(),
});
export type ICreateTenantPayload = z.infer<typeof CreateTenantPayloadSchema>;

//2: update ====================================>
export const UpdateTenantPayloadSchema = z.object({
    name: z.string().min(1).optional().openapi({ example: 'Acme Corp' }),
    description: z.string().optional().openapi({ example: 'Acme Corporation' }),
    status: z
        .enum([TENANT_STATUS.ACTIVE, TENANT_STATUS.INACTIVE])
        .optional()
        .openapi({ example: 'active' }),
    type: z
        .enum([TENANT_TYPE.PLATFORM, TENANT_TYPE.CUSTOMER])
        .optional()
        .openapi({ example: 'platform' }),
    // reassign the sales person; pass null to unassign
    salesPerson: z
        .string()
        .refine((val) => isValidObjectID(val), { message: 'salesPerson must be a valid ObjectId' })
        .nullable()
        .optional()
        .openapi({ example: '64f0c2a1b3d4e5f6a7b8c9d0' }),
    // replaced wholesale when supplied — pass the full address object to change any part of it
    address: AddressSchema.optional(),
});
export type IUpdateTenantPayload = z.infer<typeof UpdateTenantPayloadSchema>;

//3: search ====================================>
export const SearchTenantQuerySchema = z.object({
    name: z.string().optional().openapi({ example: 'Acme Corp' }),
    code: z.string().lowercase().optional().openapi({ example: 'acme' }),
    type: z
        .enum([TENANT_TYPE.PLATFORM, TENANT_TYPE.CUSTOMER])
        .optional()
        .openapi({ example: 'platform' }),
    status: z
        .enum([TENANT_STATUS.ACTIVE, TENANT_STATUS.INACTIVE])
        .optional()
        .openapi({ example: 'active' }),
    page: z.string().optional().openapi({ example: '1' }),

    limit: z.string().optional().openapi({ example: '10' }),
});
export type ISearchTenantQuery = z.infer<typeof SearchTenantQuerySchema>;
