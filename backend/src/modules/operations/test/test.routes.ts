// Test Routes
import express from 'express';
import { TestController } from './test.controller';
import { registry } from '../../../shared/config/swagger/swagger.registry';
import { CreateTestPayloadSchema, SearchTestQuerySchema, UpdateTestPayloadSchema } from './test.validators';
import { AuthMiddleware } from '../../../shared/middlewares/authmiddleware';
import { AuthorizeMiddleware } from '../../../shared/middlewares/authorizeMiddleware';
import { TEST_PERMISSIONS } from './test.constants';

export const TestRouter = express.Router();

TestRouter.use(AuthMiddleware);

// get test
registry.registerPath({
    method: 'get',
    path: '/tests/{id}',
    tags: ['TEST'],
    summary: 'Get test (by id or code)',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    responses: {
        200: { description: 'Test fetched successfully' },
        404: { description: 'Test not found' },
    },
});

// search tests
registry.registerPath({
    method: 'get',
    path: '/tests',
    tags: ['TEST'],
    summary: 'Search tests',
    request: {
        query: SearchTestQuerySchema,
    },
    responses: {
        200: { description: 'Tests fetched successfully' },
    },
});

// create test
registry.registerPath({
    method: 'post',
    path: '/tests',
    tags: ['TEST'],
    summary: 'Create test (global catalog record)',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: CreateTestPayloadSchema,
                },
            },
        },
    },
    responses: {
        201: { description: 'Test created successfully' },
        400: { description: 'Validation error' },
        409: { description: 'A test with this code already exists' },
    },
});

// update test
registry.registerPath({
    method: 'put',
    path: '/tests/{id}',
    tags: ['TEST'],
    summary: 'Update test (code is immutable)',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: UpdateTestPayloadSchema,
                },
            },
        },
    },
    responses: {
        200: { description: 'Test updated successfully' },
        400: { description: 'Validation error' },
        404: { description: 'Test not found' },
    },
});

// =======================================================================
// ========================= EXPORT TEST ROUTES ==========================
// =======================================================================
// reads are open to any authenticated user — the catalog is a global reference registry.
// only writes (create/update) are permission-guarded.
TestRouter.get('/:id', TestController.get);
TestRouter.get('/', TestController.search);

TestRouter.post('/', AuthorizeMiddleware([TEST_PERMISSIONS.MANAGE.code]), TestController.create);
TestRouter.put('/:id', AuthorizeMiddleware([TEST_PERMISSIONS.MANAGE.code]), TestController.update);
