import { z } from 'zod';

import { USER_GENDERS } from './user.constants';

//1: register ====================================>
export const RegisterPayloadSchema = z.object({
    firstName: z.string().min(1).openapi({ example: 'john' }),
    lastName: z.string().optional().openapi({ example: 'doe' }),
    email: z.email().openapi({ example: 'john@example.com' }),
    password: z.string().min(1).openapi({ example: 'Test@123' }),
    phone: z.string().min(1).optional().openapi({ example: '1234567890' }),
    gender: z.enum(Object.keys(USER_GENDERS)).optional().openapi({ example: 'male' }),
});
export type IRegisterPayload = z.infer<typeof RegisterPayloadSchema>;
