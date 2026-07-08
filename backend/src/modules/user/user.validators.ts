import { z } from 'zod';

import { USER_GENDERS, USER_STATUS } from './user.constants';

//1: update ====================================>
export const UpdateUserPayloadSchema = z.object({
    firstName: z.string().min(1).openapi({ example: 'john' }),
    lastName: z.string().optional().openapi({ example: 'doe' }),
    status: z
        .enum([
            USER_STATUS.ACTIVE,
            USER_STATUS.INACTIVE,
            USER_STATUS.SUSPENDED,
            USER_STATUS.DELETED,
        ])
        .optional()
        .openapi({ example: 'active' }),
    gender: z
        .enum([USER_GENDERS.MALE, USER_GENDERS.FEMALE, USER_GENDERS.OTHER])
        .optional()
        .openapi({ example: 'male' }),
});

export type IUpdateUserPayload = z.infer<typeof UpdateUserPayloadSchema>;

//2: search ====================================>
export const SearchUserQuerySchema = z.object({
    name: z.string().optional().openapi({ example: 'john' }),
    email: z.email().optional().openapi({ example: 'john.doe@example.com' }),
    status: z
        .enum([
            USER_STATUS.ACTIVE,
            USER_STATUS.INACTIVE,
            USER_STATUS.SUSPENDED,
            USER_STATUS.DELETED,
        ])
        .optional()
        .openapi({ example: 'active' }),
    gender: z
        .enum([USER_GENDERS.MALE, USER_GENDERS.FEMALE, USER_GENDERS.OTHER])
        .optional()
        .openapi({ example: 'male' }),
    joinedFrom: z.iso
        .datetime()
        .optional()
        .openapi({ example: '2022-01-01T00:00:00.000Z' }),
    joinedTo: z.iso
        .datetime()
        .optional()
        .openapi({ example: '2022-12-31T23:59:59.999Z' }),
    page: z.string().optional(),
    limit: z.string().optional(),
});

export type ISearchUserQuery = z.infer<typeof SearchUserQuerySchema>;
