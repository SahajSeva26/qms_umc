// Otp Validators
import { z } from 'zod';
import { isValidObjectID } from '../../shared/utils/strings';
import { OTP_STATUS } from './otp.constants';

const objectId = (label: string) =>
    z.string().refine((val) => isValidObjectID(val), {
        message: `${label} must be a valid id`,
    });

//1: create / generate ====================================>
// The caller states what the OTP is FOR (purpose + an optional entity link). The code, status, expiry
// and attempt counters are derived/pinned by the service — never accepted from the client. The entity
// ref is three flat fields, folded into a nested `entity` so the service sees model.entity.* (all
// optional; the whole block is dropped when none are supplied). `expiresInMinutes`/`maxAttempts` are
// optional overrides — the service applies its defaults when omitted.
export const CreateOtpPayloadSchema = z
    .object({
        purpose: z.string().min(1).openapi({ example: 'screening-consent' }),
        entityId: objectId('Entity').optional().openapi({ example: '665f0c3a1a2b3c4d5e6f7a8a' }),
        entityType: z.string().min(1).optional().openapi({ example: 'screening' }),
        entityRelation: z.string().min(1).optional().openapi({ example: 'consent' }),
        expiresInMinutes: z.number().int().positive().optional().openapi({ example: 10 }),
        maxAttempts: z.number().int().positive().optional().openapi({ example: 5 }),
    })
    .transform((v) => ({
        purpose: v.purpose,
        entity:
            v.entityId || v.entityType || v.entityRelation
                ? { id: v.entityId, type: v.entityType, relation: v.entityRelation }
                : undefined,
        expiresInMinutes: v.expiresInMinutes,
        maxAttempts: v.maxAttempts,
    }));
export type ICreateOtpPayload = z.infer<typeof CreateOtpPayloadSchema>;

//2: verify ====================================>
// Match a submitted code against an OTP looked up by purpose (+ the optional entity it was issued for).
// The entity ref is the same three flat fields as create, folded into a nested `entity` so the service
// locates the OTP the same way it was stored. The service then checks status, expiry and the attempt
// count, and marks it verified / blocked accordingly.
export const VerifyOtpPayloadSchema = z
    .object({
        purpose: z.string().min(1).openapi({ example: 'screening-consent' }),
        code: z.string().min(1).openapi({ example: '483920' }),
        entityId: objectId('Entity').optional().openapi({ example: '665f0c3a1a2b3c4d5e6f7a8a' }),
        entityType: z.string().min(1).optional().openapi({ example: 'screening' }),
        entityRelation: z.string().min(1).optional().openapi({ example: 'consent' }),
    })
    .transform((v) => ({
        purpose: v.purpose,
        code: v.code,
        entity:
            v.entityId || v.entityType || v.entityRelation
                ? { id: v.entityId, type: v.entityType, relation: v.entityRelation }
                : undefined,
    }));
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
