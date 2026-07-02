import express from 'express';
import { registry } from '../../shared/config/swagger/swagger.registry';
import { RegisterPayloadSchema } from '../user/user.validators';
import { AuthController } from './auth.controller';

export const AuthRouter = express.Router(); 

// 
// ==========REGISTER SWAGGER PATH============================
registry.registerPath({
    method: 'post',
    path: '/auth/register',
    tags: ['AUTH'],
    summary: 'Register a new user',

    request: {
        body: {
            content: {
                'application/json': {
                    schema: RegisterPayloadSchema,
                },
            },
        },
    },

    responses: {
        200: { description: 'User registered successfully' },
        400: { description: 'User registration failed' },
    },
});


// ===================================================
// ==========EXPORT ROUTES============================
// ===================================================
AuthRouter.post('/register', AuthController.register);