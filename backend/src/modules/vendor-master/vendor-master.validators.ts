// Vendor-master Validators
import { z } from 'zod';
import { VENDOR_STATUS } from './vendor-master.constants';

// coordinates are stored GeoJSON-style: [longitude, latitude] (lng first)
const CoordinatesSchema = z
    .tuple([
        z.number().min(-180).max(180), // longitude
        z.number().min(-90).max(90), // latitude
    ])
    .openapi({ example: [72.8296, 19.1197] });

// the vendor's address — optional as a whole; when supplied it is replaced wholesale.
// coordinates are optional too.
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

// a vendor's point of contact — name is required, the rest optional
const ContactSchema = z.object({
    name: z.string().min(1).openapi({ example: 'Ramesh Kumar' }),
    number: z.string().optional().openapi({ example: '+91 98765 43210' }),
    email: z.string().email().optional().openapi({ example: 'ramesh@acme.com' }),
    designation: z.string().optional().openapi({ example: 'Sales Manager' }),
});

//1: create ====================================>
// code is the natural key — required here, and never editable afterwards.
export const CreateVendorMasterPayloadSchema = z.object({
    code: z.string().min(1).openapi({ example: 'VEN-ACME-01' }),
    name: z.string().min(1).openapi({ example: 'Acme Medical Supplies' }),
    contacts: z.array(ContactSchema).optional(),
    address: AddressSchema.optional(),
    status: z.enum(Object.values(VENDOR_STATUS)).optional().openapi({ example: 'active' }),
});
export type ICreateVendorMasterPayload = z.infer<typeof CreateVendorMasterPayloadSchema>;

//2: update ====================================>
// code is intentionally omitted — it is immutable after create.
export const UpdateVendorMasterPayloadSchema = z.object({
    name: z.string().min(1).optional(),
    // replaced wholesale when supplied — pass the full contacts array to change any of them
    contacts: z.array(ContactSchema).optional(),
    // replaced wholesale when supplied — pass the full address object to change any part of it
    address: AddressSchema.optional(),
    status: z.enum(Object.values(VENDOR_STATUS)).optional(),
});
export type IUpdateVendorMasterPayload = z.infer<typeof UpdateVendorMasterPayloadSchema>;

//3: search ====================================>
export const SearchVendorMasterQuerySchema = z.object({
    code: z.string().optional().openapi({ example: 'VEN-ACME-01' }),
    name: z.string().optional().openapi({ example: 'Acme' }),
    city: z.string().optional().openapi({ example: 'Mumbai' }),
    status: z.enum(Object.values(VENDOR_STATUS)).optional().openapi({ example: 'active' }),
    page: z.string().optional().openapi({ example: '1' }),
    limit: z.string().optional().openapi({ example: '10' }),
});
export type ISearchVendorMasterQuery = z.infer<typeof SearchVendorMasterQuerySchema>;
