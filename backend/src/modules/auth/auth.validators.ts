import z from 'zod';
import { USER_GENDERS } from '../user/user.constants';

//1: register ====================================>
export const RegisterUserPayloadSchema = z.object({
    firstName: z.string().min(1).openapi({ example: 'john' }),
    lastName: z.string().optional().openapi({ example: 'doe' }),
    email: z.email().openapi({ example: 'john@example.com' }),
    password: z.string().min(6).openapi({ example: 'Test@123' }),
    phone: z.string().min(10).optional().openapi({ example: '1234567890' }),
    gender: z
        .enum([USER_GENDERS.MALE, USER_GENDERS.FEMALE, USER_GENDERS.OTHER])
        .optional()
        .openapi({ example: 'male' }),
});
export type IRegisterUserPayload = z.infer<typeof RegisterUserPayloadSchema>;

//2: login ====================================>
export const LoginUserPayloadSchema = z.object({
    email: z.email().openapi({ example: 'admin@gmail.com' }),
    password: z.string().min(1).openapi({ example: 'Test@123' }),
});
export type ILoginUserPayload = z.infer<typeof LoginUserPayloadSchema>;

//3: reset password (self-service — user changes own password) ====================================>
export const ResetPasswordPayloadSchema = z.object({
    currentPassword: z.string().min(1).openapi({ example: 'Test@123' }),
    newPassword: z.string().min(6).openapi({ example: 'NewTest@123' }),
});
export type IResetPasswordPayload = z.infer<typeof ResetPasswordPayloadSchema>;

//4: forgot password (admin-initiated — tenant:admin resets a user) ====================================>
export const ForgotPasswordPayloadSchema = z.object({
    email: z.email().openapi({ example: 'john@example.com' }),
    newPassword: z.string().min(6).openapi({ example: 'NewTest@123' }),
});
export type IForgotPasswordPayload = z.infer<typeof ForgotPasswordPayloadSchema>;
