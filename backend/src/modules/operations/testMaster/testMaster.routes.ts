// TestMaster Routes
import express from 'express';
import { TestMasterController } from './testMaster.controller';
import { registry } from '../../../shared/config/swagger/swagger.registry';
import { CreateTestMasterPayloadSchema, SearchTestMasterQuerySchema, UpdateTestMasterPayloadSchema } from './testMaster.validators';
import { AuthMiddleware } from '../../../shared/middlewares/authmiddleware';
import { AuthorizeMiddleware } from '../../../shared/middlewares/authorizeMiddleware';
import { TEST_MASTER_PERMISSIONS } from './testMaster.constants';
import { TestMasterReportQuerySchema } from './testMaster.validators';

export const TestMasterRouter = express.Router();

TestMasterRouter.use(AuthMiddleware);

// test master report
registry.registerPath({
    method: 'get',
    path: '/test-masters/report',
    tags: ['TEST_MASTER'],
    summary: 'Get test master report',
    description:
        'Current-state snapshot of the ENTIRE global test master catalog — there is no date window ' +
        'and nothing is time-filtered. TestMaster carries no tenant field, so the report is global ' +
        'by design and applies no tenant scope. Returns the catalog size, the active/inactive split, ' +
        'and counts by status, camp type and therapy. All three breakdowns are ZERO-FILLED from their ' +
        'code-owned enums (TEST_MASTER_STATUS / CAMP_TYPES / PROJECT_THERAPY_TYPES) in declaration ' +
        'order, so every enum value always appears even at count 0. Aggregate counts only — no ' +
        'document-level detail (id, code, name, description, price, duration, config, consumption) is ' +
        'exposed, and there is no exceptions section. No Test/Project/Inventory data is joined. ' +
        'Guarded by test-master:manage alone: status is already manage-only information in this ' +
        'module (search defaults non-manage actors to active-only and the mapper hides status from ' +
        'them), so the inactive counts must not be reachable with test-master:search.',
    request: {
        query: TestMasterReportQuerySchema,
    },
    responses: {
        200: {
            description:
                'Test master report generated successfully. Exact response shape: ' +
                '{ meta: { generatedAt }, summary: { totalTestMasters, activeTestMasters, ' +
                'inactiveTestMasters }, byStatus: [{ status, count }] (active, inactive), ' +
                'byCampType: [{ campType, count }] (screening, diet, lab), byTherapy: ' +
                '[{ therapy, count }] (cardiology, diabetes, pulmonology, endocrine, orthopedics, ' +
                'gynaecology, neurology, hepatology, nephrology) }. All breakdown arrays are always ' +
                'returned at full enum length, in the order listed, with count 0 where absent. ' +
                'No other key is returned — in particular there is no exceptions section.',
        },
        400: { description: 'Validation error' },
        403: { description: 'Forbidden' },
    },
});

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
// reads require the matching read permission (or manage); writes require manage.
TestMasterRouter.get('/report', AuthorizeMiddleware([TEST_MASTER_PERMISSIONS.MANAGE.code]), TestMasterController.report);
TestMasterRouter.get('/:id', AuthorizeMiddleware([TEST_MASTER_PERMISSIONS.GET.code, TEST_MASTER_PERMISSIONS.MANAGE.code], 'OR'), TestMasterController.get);
TestMasterRouter.get('/', AuthorizeMiddleware([TEST_MASTER_PERMISSIONS.SEARCH.code, TEST_MASTER_PERMISSIONS.MANAGE.code], 'OR'), TestMasterController.search);

TestMasterRouter.post('/', AuthorizeMiddleware([TEST_MASTER_PERMISSIONS.MANAGE.code]), TestMasterController.create);
TestMasterRouter.put('/:id', AuthorizeMiddleware([TEST_MASTER_PERMISSIONS.MANAGE.code]), TestMasterController.update);
