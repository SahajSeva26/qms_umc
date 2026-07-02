import express from 'express';
import { registry } from '../../shared/config/swagger/swagger.registry';

import { AuthController } from './auth.controller';
import { LoginUserPayloadSchema, RegisterUserPayloadSchema } from './auth.validators';

export const AuthRouter = express.Router(); 

// 
// ========== SWAGGER ============================
registry.registerPath({ //register
    method: 'post',
    path: '/auth/register',
    tags: ['AUTH'],
    summary: 'Register a new user',

    request: {
        body: {
            content: {
                'application/json': {
                    schema: RegisterUserPayloadSchema,
                },
            },
        },
    },

    responses: {
        200: { description: 'User registered successfully' },
        400: { description: 'User registration failed' },
    },
});
registry.registerPath({ //login
    method: 'post',
    path: '/auth/login',
    tags: ['AUTH'],
    summary: 'Login a user',

    request: {
        body: {
            content: {
                'application/json': {
                    schema: LoginUserPayloadSchema  ,
                },
            },
        },
    },

    responses: {
        200: { description: 'User logged in successfully' },
        400: { description: 'User login failed' },
    },
});

// ===================================================
// ==========EXPORT ROUTES============================
// ===================================================
AuthRouter.post('/register', AuthController.register);
AuthRouter.post('/login', AuthController.login);