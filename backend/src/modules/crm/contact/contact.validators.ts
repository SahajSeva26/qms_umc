import { z } from 'zod';
import { CONTACT_STATUS, CONTACT_TYPES } from './contact.constants';
import { isValidObjectID } from '../../../shared/utils/strings';

const objectId = (label: string) =>
    z.string().refine((val) => isValidObjectID(val), { message: `${label} must be a valid id` });

//1: create ====================================>
export const CreateContactPayloadSchema = z.object({
    // required only for platform (QMS) staff — which tenant this contact belongs to.
    // ignored for customer users: the service pins it to their own tenant.
    tenant: objectId('Tenant').optional().openapi({ example: '665f0c3a1a2b3c4d5e6f7a8a' }),
    name: z.string().min(1).openapi({ example: 'Dr. Anil Mehta' }),
    designation: z.string().optional().openapi({ example: 'Medical Advisor' }),
    email: z.string().email().optional().openapi({ example: 'anil.mehta@pharma.com' }),
    phone: z.string().optional().openapi({ example: '+91 98765 43210' }),
    location: z.string().optional().openapi({ example: 'Mumbai, MH' }),
    type: z.enum(Object.values(CONTACT_TYPES)).optional().openapi({ example: 'customer' }),
    // optional — set only when this person also has a login account
    user: objectId('User').optional().openapi({ example: '665f0c3a1a2b3c4d5e6f7a8d' }),
});
export type ICreateContactPayload = z.infer<typeof CreateContactPayloadSchema>;

//2: update ====================================>
// tenant is NOT editable here — a contact never changes the company it belongs to
export const UpdateContactPayloadSchema = z.object({
    name: z.string().min(1).optional(),
    designation: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    location: z.string().optional(),
    type: z.enum(Object.values(CONTACT_TYPES)).optional(),
    user: objectId('User').optional(),
    status: z.enum(Object.values(CONTACT_STATUS)).optional(),
});
export type IUpdateContactPayload = z.infer<typeof UpdateContactPayloadSchema>;

//3: search ====================================>
export const SearchContactQuerySchema = z.object({
    name: z.string().optional().openapi({ example: 'Anil' }),
    type: z.enum(Object.values(CONTACT_TYPES)).optional().openapi({ example: 'customer' }),
    status: z.enum(Object.values(CONTACT_STATUS)).optional().openapi({ example: 'active' }),
    // only honoured for platform staff; customer users stay pinned to their own tenant
    tenant: objectId('Tenant').optional().openapi({ example: '665f0c3a1a2b3c4d5e6f7a8a' }),
    page: z.string().optional().openapi({ example: '1' }),
    limit: z.string().optional().openapi({ example: '10' }),
});
export type ISearchContactQuery = z.infer<typeof SearchContactQuerySchema>;
