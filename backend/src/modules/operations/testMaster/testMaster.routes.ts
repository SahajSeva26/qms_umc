// TestMaster Routes
import express from 'express';
import { TestMasterController } from './testMaster.controller';
import { registry } from '../../../shared/config/swagger/swagger.registry';
import { CreateTestMasterPayloadSchema, SearchTestMasterQuerySchema, UpdateTestMasterPayloadSchema } from './testMaster.validators';
import { AuthMiddleware } from '../../../shared/middlewares/authmiddleware';
import { AuthorizeMiddleware } from '../../../shared/middlewares/authorizeMiddleware';
import { TEST_MASTER_PERMISSIONS } from './testMaster.constants';

export const TestMasterRouter = express.Router();

TestMasterRouter.use(AuthMiddleware);

// get test master
registry.registerPath({
    method: 'get',
    path: '/test-masters/{id}',
    tags: ['TEST_MASTER'],
    summary: 'Get test master (by id or code)',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    responses: {
        200: { description: 'Test master fetched successfully' },
        404: { description: 'Test master not found' },
    },
});

// search test masters
registry.registerPath({
    method: 'get',
    path: '/test-masters',
    tags: ['TEST_MASTER'],
    summary: 'Search test masters',
    request: {
        query: SearchTestMasterQuerySchema,
    },
    responses: {
        200: { description: 'Test masters fetched successfully' },
    },
});

// create test master
registry.registerPath({
    method: 'post',
    path: '/test-masters',
    tags: ['TEST_MASTER'],
    summary: 'Create test master (global catalog record)',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: CreateTestMasterPayloadSchema,
                },
            },
        },
    },
    responses: {
        201: { description: 'Test master created successfully' },
        400: { description: 'Validation error' },
        409: { description: 'A test master with this code already exists' },
    },
});

// update test master
registry.registerPath({
    method: 'put',
    path: '/test-masters/{id}',
    tags: ['TEST_MASTER'],
    summary: 'Update test master (code is immutable)',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: UpdateTestMasterPayloadSchema,
                },
            },
        },
    },
    responses: {
        200: { description: 'Test master updated successfully' },
        400: { description: 'Validation error' },
        404: { description: 'Test master not found' },
    },
});

// =======================================================================
// ===================== EXPORT TEST MASTER ROUTES =======================
// =======================================================================
// reads are open to any authenticated user — the catalog is a global reference registry.
// only writes (create/update) are permission-guarded.
TestMasterRouter.get('/:id', TestMasterController.get);
TestMasterRouter.get('/', TestMasterController.search);

TestMasterRouter.post('/', AuthorizeMiddleware([TEST_MASTER_PERMISSIONS.MANAGE.code]), TestMasterController.create);
TestMasterRouter.put('/:id', AuthorizeMiddleware([TEST_MASTER_PERMISSIONS.MANAGE.code]), TestMasterController.update);
