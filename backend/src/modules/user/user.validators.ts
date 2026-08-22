import { z } from 'zod';

import { USER_GENDERS, USER_REPORT_GRANULARITY, USER_STATUS } from './user.constants';

//1: update ====================================>
export const UpdateUserPayloadSchema = z.object({
    firstName: z.string().optional().openapi({ example: 'john' }),
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
    email: z.string().optional().openapi({ example: 'john.doe@example.com' }),
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

//3: report ====================================>
export const UserReportQuerySchema = z.object({
    from: z.iso.datetime().optional().openapi({ example: '2026-07-01T00:00:00.000Z' }),
    to: z.iso.datetime().optional().openapi({ example: '2026-08-01T00:00:00.000Z' }),
    granularity: z
        .enum([USER_REPORT_GRANULARITY.DAY, USER_REPORT_GRANULARITY.MONTH])
        .optional()
        .openapi({ example: 'day' }),
});

export type IUserReportQuery = z.infer<typeof UserReportQuerySchema>;
