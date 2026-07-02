import { email, z } from 'zod';

import { USER_GENDERS } from './user.constants';

//1: update ====================================>
export const UpdateUserPayloadSchema = z.object({
    firstName: z.string().min(1).openapi({ example: 'john' }),
    lastName: z.string().optional().openapi({ example: 'doe' }),
    status: z.boolean().optional().openapi({ example: true }),
    gender: z
        .enum([USER_GENDERS.MALE, USER_GENDERS.FEMALE, USER_GENDERS.OTHER])
        .optional()
        .openapi({ example: 'male' }),
});

export type IUpdateUserPayload = z.infer<typeof UpdateUserPayloadSchema>;

//2: search ====================================>
export const SearchUserQuerySchema = z.object({
    name: z.string().optional().openapi({ example: 'john' }),
    email: email().optional().openapi({ example: 'john.doe@example.com' }),
    status: z.boolean().optional().openapi({ example: true }),
    gender: z
        .enum([USER_GENDERS.MALE, USER_GENDERS.FEMALE, USER_GENDERS.OTHER])
        .optional()
        .openapi({ example: 'male' }),
    joinedFrom: z.iso.datetime().optional().openapi({ example: '2022-01-01T00:00:00.000Z' }),
    joinedTo: z.iso.datetime().optional().openapi({ example: '2022-12-31T23:59:59.999Z' }),
});

export type ISearchUserQuery = z.infer<typeof SearchUserQuerySchema>;
