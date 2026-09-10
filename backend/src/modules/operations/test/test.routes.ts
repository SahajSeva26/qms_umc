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
    summary: 'Get test',
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
    request: { query: SearchTestQuerySchema },
    responses: {
        200: { description: 'Tests fetched successfully' },
    },
});

// create test
registry.registerPath({
    method: 'post',
    path: '/tests',
    tags: ['TEST'],
    summary: 'Record a patient test result (screening must be completed; tenant derived from it)',
    request: {
        body: { content: { 'application/json': { schema: CreateTestPayloadSchema } } },
    },
    responses: {
        201: { description: 'Test created successfully' },
        400: { description: 'Validation error' },
        404: { description: 'Screening or test master not found' },
        409: { description: 'Screening not completed, or test already recorded' },
    },
});

// update test
registry.registerPath({
    method: 'put',
    path: '/tests/{id}',
    tags: ['TEST'],
    summary: 'Update a test result',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    request: {
        body: { content: { 'application/json': { schema: UpdateTestPayloadSchema } } },
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
// reads require the matching read permission (or manage); writes require the matching write
// permission (or manage).
TestRouter.get('/:id', AuthorizeMiddleware([TEST_PERMISSIONS.GET.code, TEST_PERMISSIONS.MANAGE.code], 'OR'), TestController.get);
TestRouter.get('/', AuthorizeMiddleware([TEST_PERMISSIONS.SEARCH.code, TEST_PERMISSIONS.MANAGE.code], 'OR'), TestController.search);

TestRouter.post('/', AuthorizeMiddleware([TEST_PERMISSIONS.CREATE.code, TEST_PERMISSIONS.MANAGE.code], 'OR'), TestController.create);
TestRouter.put('/:id', AuthorizeMiddleware([TEST_PERMISSIONS.UPDATE.code, TEST_PERMISSIONS.MANAGE.code], 'OR'), TestController.update);
