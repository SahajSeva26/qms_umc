import { z } from 'zod';

import { USER_GENDERS } from './user.constants';


//2: update ====================================>
export const UpdateUserPayloadSchema = z.object({
    firstName: z.string().min(1).openapi({ example: 'john' }),
    lastName: z.string().optional().openapi({ example: 'doe' }),
    status: z.boolean().optional().openapi({ example: true }),
    gender: z.enum([USER_GENDERS.MALE, USER_GENDERS.FEMALE,USER_GENDERS.OTHER]).optional().openapi({ example: 'male' }),
});
export type IUpdateUserPayload = z.infer<typeof UpdateUserPayloadSchema>;
