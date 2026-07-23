import express from 'express';
import { registry } from '../../shared/config/swagger/swagger.registry';

import { AuthController } from './auth.controller';
import {
    ForgotPasswordPayloadSchema,
    LoginUserPayloadSchema,
    RegisterUserPayloadSchema,
    ResetPasswordPayloadSchema,
} from './auth.validators';
import { AuthMiddleware } from '../../shared/middlewares/authmiddleware';
import { AuthorizeMiddleware } from '../../shared/middlewares/authorizeMiddleware';
import { TENANT_PERMISSIONS } from '../access-management/tenant/tenant.constants';

export const AuthRouter = express.Router();
//
// ========== SWAGGER ============================
// registry.registerPath({
//     //register
//     method: 'post',
//     path: '/auth/register',
//     tags: ['AUTH'],
//     summary: 'Register a new user',

//     request: {
//         body: {
//             content: {
//                 'application/json': {
//                     schema: RegisterUserPayloadSchema,
//                 },
//             },
//         },
//     },

//     responses: {
//         201: { description: 'User registered successfully' },
//         400: { description: 'User registration failed' },
//     },
// });
registry.registerPath({
    //login
    method: 'post',
    path: '/auth/login',
    tags: ['AUTH'],
    summary: 'Login a user',

    request: {
        body: {
            content: {
                'application/json': {
                    schema: LoginUserPayloadSchema,
                },
            },
        },
    },

    responses: {
        200: { description: 'User logged in successfully' },
        400: { description: 'User login failed' },
    },
});

registry.registerPath({
    //logout
    method: 'post',
    path: '/auth/logout',
    tags: ['AUTH'],
    summary: 'Logout a user',

    responses: {
        200: { description: 'User logged out successfully' },
        400: { description: 'User logout failed' },
    },
});

registry.registerPath({
    //refresh token
    method: 'post',
    path: '/auth/refresh-token',
    tags: ['AUTH'],
    summary: 'Refresh access token',
    responses: {
        200: { description: 'Token refreshed successfully' },
        400: { description: 'Token refresh failed' },
    },
});

registry.registerPath({
    //current session
    method: 'get',
    path: '/auth/me',
    tags: ['AUTH'],
    summary: 'Get current session (profile, role, role type, tenant, permissions)',
    responses: {
        200: { description: 'Current session fetched successfully' },
        401: { description: 'Unauthorized' },
    },
});

registry.registerPath({
    //reset own password (self-service)
    method: 'post',
    path: '/auth/reset-password',
    tags: ['AUTH'],
    summary: 'Reset own password (verifies the current password)',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: ResetPasswordPayloadSchema,
                },
            },
        },
    },
    responses: {
        200: { description: 'Password reset successfully' },
        400: { description: 'Password reset failed' },
    },
});

registry.registerPath({
    //admin reset of a user's password (tenant:admin)
    method: 'post',
    path: '/auth/forgot-password',
    tags: ['AUTH'],
    summary: 'Admin reset of a user password within the tenant (tenant:admin)',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: ForgotPasswordPayloadSchema,
                },
            },
        },
    },
    responses: {
        200: { description: 'Password reset successfully' },
        400: { description: 'Password reset failed' },
    },
});
// ===================================================
// ==========EXPORT ROUTES============================
// ===================================================
// AuthRouter.post(
//     '/register',
//     AuthMiddleware,
//     AuthorizeMiddleware([TENANT_PERMISSIONS.MANAGE.code]),
//     AuthController.register,
// );
AuthRouter.post('/login', AuthController.login);
AuthRouter.post('/logout', AuthMiddleware, AuthController.logout);
AuthRouter.post('/refresh-token', AuthController.refreshToken);
AuthRouter.get('/me', AuthMiddleware, AuthController.me);

// self-service: any authenticated user changes their own password
AuthRouter.post('/reset-password', AuthMiddleware, AuthController.resetPassword);

// admin-initiated: tenant:admin resets a user's password within their tenant
AuthRouter.post(
    '/forgot-password',
    AuthMiddleware,
    AuthorizeMiddleware([TENANT_PERMISSIONS.ADMIN.code]),
    AuthController.forgotPassword,
);
