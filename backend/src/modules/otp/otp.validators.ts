// Otp Validators
import { z } from 'zod';
import { isValidObjectID } from '../../shared/utils/strings';
import { OTP_CHANNELS, OTP_STATUS } from './otp.constants';

const objectId = (label: string) =>
    z.string().refine((val) => isValidObjectID(val), {
        message: `${label} must be a valid id`,
    });

// optional link back to the record the OTP is issued for — used to retrieve/verify it later
const EntityRefSchema = z
    .object({
        type: z.string().min(1).optional().openapi({ example: 'screening' }),
        relation: z.string().min(1).optional().openapi({ example: 'consent' }),
        id: objectId('Entity').optional().openapi({ example: '665f0c3a1a2b3c4d5e6f7a8a' }),
    })
    .openapi({ example: { type: 'screening', relation: 'consent', id: '665f0c3a1a2b3c4d5e6f7a8a' } });

//1: create / generate ====================================>
// purpose + channel are required; expiry (minutes) + entity are optional. Code/status/attempts are
// pinned by the service, never accepted here.
export const CreateOtpPayloadSchema = z.object({
    purpose: z.string().min(1).openapi({ example: 'screening-consent' }),
    channel: z
        .object({
            type: z.enum(Object.values(OTP_CHANNELS)).openapi({ example: 'sms' }),
            value: z.string().min(1).openapi({ example: '+919876543210' }),
        })
        .openapi({ example: { type: 'sms', value: '+919876543210' } }),
    expiresInMinutes: z.number().int().positive().optional().openapi({ example: 5 }),
    entity: EntityRefSchema.optional(),
});
export type ICreateOtpPayload = z.infer<typeof CreateOtpPayloadSchema>;

//2: verify ====================================>
// a code matched against the OTP found by purpose (+ optional entity)
export const VerifyOtpPayloadSchema = z.object({
    purpose: z.string().min(1).openapi({ example: 'screening-consent' }),
    code: z.string().min(1).openapi({ example: '483920' }),
    entity: EntityRefSchema.optional(),
});
export type IVerifyOtpPayload = z.infer<typeof VerifyOtpPayloadSchema>;

//3: search ====================================>
export const SearchOtpQuerySchema = z.object({
    purpose: z.string().optional().openapi({ example: 'screening-consent' }),
    status: z.enum(Object.values(OTP_STATUS)).optional().openapi({ example: 'pending' }),
    entityType: z.string().optional().openapi({ example: 'screening' }),
    entityRelation: z.string().optional().openapi({ example: 'consent' }),
    entityId: z.string().optional().openapi({ example: '665f0c3a1a2b3c4d5e6f7a8a' }),
    page: z.string().optional().openapi({ example: '1' }),
    limit: z.string().optional().openapi({ example: '10' }),
});
export type ISearchOtpQuery = z.infer<typeof SearchOtpQuerySchema>;
