import z from 'zod';
import { USER_GENDERS } from '../user/user.constants';

//1: register ====================================>
export const RegisterUserPayloadSchema = z.object({
    firstName: z.string().min(1).openapi({ example: 'john' }),
    lastName: z.string().optional().openapi({ example: 'doe' }),
    email: z.email().openapi({ example: 'john@example.com' }),
    password: z.string().min(1).openapi({ example: 'Test@123' }),
    phone: z.string().min(1).optional().openapi({ example: '1234567890' }),
    gender: z
        .enum([USER_GENDERS.MALE, USER_GENDERS.FEMALE, USER_GENDERS.OTHER])
        .optional()
        .openapi({ example: 'male' }),
});
export type IRegisterUserPayload = z.infer<typeof RegisterUserPayloadSchema>;

//2: login ====================================>
export const LoginUserPayloadSchema = z.object({
    email: z.email().openapi({ example: 'shailu@example.com' }),
    password: z.string().min(1).openapi({ example: 'Test@123' }),
});
export type ILoginUserPayload = z.infer<typeof LoginUserPayloadSchema>;
