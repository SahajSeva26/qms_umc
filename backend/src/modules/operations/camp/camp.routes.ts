// Camp Routes
import express from 'express';
import { CampController } from './camp.controller';
import { registry } from '../../../shared/config/swagger/swagger.registry';
import {
    BookCampPayloadSchema,
    CampReportQuerySchema,
    CreateCampPayloadSchema,
    MoveStagePayloadSchema,
    SearchCampQuerySchema,
    UpdateCampPayloadSchema,
} from './camp.validators';
import { AuthMiddleware } from '../../../shared/middlewares/authmiddleware';
import { AuthorizeMiddleware } from '../../../shared/middlewares/authorizeMiddleware';
import { reportRateLimiter } from '../../../shared/middlewares/rateLimiter';
import { CAMP_PERMISSIONS } from './camp.constants';
import { TENANT_PERMISSIONS } from '../../access-management/tenant/tenant.constants';

export const CampRouter = express.Router();

CampRouter.use(AuthMiddleware);

// camp report
registry.registerPath({
    method: 'get',
    path: '/camps/report',
    tags: ['CAMP'],
    summary: 'Get camp operational report',
    description:
        'Tenant-scoped camp report. Window-scoped sections (status/type/billing/time-slot/state ' +
        'distributions, FO workload, scheduled-month trend, requested-to-confirmed turnaround) honour ' +
        'from/to on the SCHEDULED date (camp.date, default 180d back / 90d forward). Current-state ' +
        'sections (live, scheduled today/7d/30d, unallocated, exceptions) ignore the window by design. ' +
        'byFieldOfficer is WORKLOAD (camp counts), not performance; its null row = camps in the window ' +
        'with no FO across ANY status, which is deliberately a different metric from ' +
        'summary.unallocatedCamps (current state, requested only). trend.closed/cancelled are the ' +
        'CURRENT status of camps SCHEDULED in that month, not closures/cancellations that occurred in ' +
        'it. turnaround is system workflow time (creation to the confirmed transition), not real-world ' +
        'response time and not camp duration; it reports avg + sampleSize only (no median).',
    request: {
        query: CampReportQuerySchema,
    },
    responses: {
        200: { description: 'Camp report generated successfully' },
        400: { description: 'Validation error' },
        403: { description: 'Forbidden' },
    },
});

// get camp
registry.registerPath({
    method: 'get',
    path: '/camps/{id}',
    tags: ['CAMP'],
    summary: 'Get camp',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    responses: {
        200: { description: 'Camp fetched successfully' },
        404: { description: 'Camp not found' },
    },
});

// search camps
registry.registerPath({
    method: 'get',
    path: '/camps',
    tags: ['CAMP'],
    summary: 'Search camps',
    request: {
        query: SearchCampQuerySchema,
    },
    responses: {
        200: { description: 'Camps fetched successfully' },
    },
});

// create camp
registry.registerPath({
    method: 'post',
    path: '/camps',
    tags: ['CAMP'],
    summary: 'Create camp (tenant + division required; project optional)',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: CreateCampPayloadSchema,
                },
            },
        },
    },
    responses: {
        201: { description: 'Camp created successfully' },
        400: { description: 'Validation error' },
        404: { description: 'Project or division not found' },
    },
});

// book camp (pharma field force — for an MR)
registry.registerPath({
    method: 'post',
    path: '/camps/book',
    tags: ['CAMP'],
    summary: 'Book a camp for an MR (pharma HO/RSM/ASM/MR — MR books only for themselves)',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: BookCampPayloadSchema,
                },
            },
        },
    },
    responses: {
        201: { description: 'Camp booked successfully' },
        400: { description: 'Validation error / MR not in your tenant or division' },
        403: { description: 'Not allowed to book for this MR' },
        404: { description: 'MR or doctor not found' },
    },
});

// update camp
registry.registerPath({
    method: 'put',
    path: '/camps/{id}',
    tags: ['CAMP'],
    summary: 'Update camp',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: UpdateCampPayloadSchema,
                },
            },
        },
    },
    responses: {
        200: { description: 'Camp updated successfully' },
        400: { description: 'Validation error' },
        404: { description: 'Camp not found' },
    },
});

// move camp stage
registry.registerPath({
    method: 'patch',
    path: '/camps/{id}/stage',
    tags: ['CAMP'],
    summary: 'Move camp to a new stage (records reason in stage history)',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: MoveStagePayloadSchema,
                },
            },
        },
    },
    responses: {
        200: { description: 'Camp stage updated successfully' },
        400: { description: 'Invalid stage transition or validation error' },
        404: { description: 'Camp not found' },
    },
});

// allocate field officer (nearest-FO auto-assign)
registry.registerPath({
    method: 'post',
    path: '/camps/{id}/allocate',
    tags: ['CAMP'],
    summary:
        "Auto-allocate the nearest available field officer to the camp (based on the camp's coordinates)",
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    responses: {
        200: { description: 'Field officer allocated successfully' },
        404: { description: 'Camp not found' },
        422: { description: 'Camp has no coordinates, or no field officer covers this location' },
    },
});

// =======================================================================
// ========================= EXPORT CAMP ROUTES ==========================
// =======================================================================
const GUARD = [CAMP_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.MANAGE.code];
const READ_GUARD = [CAMP_PERMISSIONS.SEARCH.code, ...GUARD]; // assigned field-force (camp:search) may read; service scopes them to their own camps

CampRouter.get(
    '/report',
    reportRateLimiter,
    AuthorizeMiddleware(GUARD),
    CampController.report
);

CampRouter.get(
    '/:id',
    AuthorizeMiddleware([
        CAMP_PERMISSIONS.MANAGE.code,
        CAMP_PERMISSIONS.GET.code,
        CAMP_PERMISSIONS.BOOK.code, // pharma field-force (book-only) may read camps; service scopes them to their division
        TENANT_PERMISSIONS.MANAGE.code,
    ]),
    CampController.get,
);
CampRouter.put(
    '/:id',
    AuthorizeMiddleware([
        CAMP_PERMISSIONS.UPDATE.code,
        CAMP_PERMISSIONS.MANAGE.code,
        TENANT_PERMISSIONS.MANAGE.code,
    ]),
    CampController.update,
);
CampRouter.patch(
    '/:id/stage',
    AuthorizeMiddleware([CAMP_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.MANAGE.code]),
    CampController.moveStage,
);

CampRouter.post(
    '/:id/allocate',
    AuthorizeMiddleware([
        CAMP_PERMISSIONS.UPDATE.code,
        CAMP_PERMISSIONS.MANAGE.code,
        TENANT_PERMISSIONS.MANAGE.code,
    ]),
    CampController.allocateFo,
);

CampRouter.get(
    '/',
    AuthorizeMiddleware([
        CAMP_PERMISSIONS.SEARCH.code,
        CAMP_PERMISSIONS.MANAGE.code,
        CAMP_PERMISSIONS.BOOK.code, // pharma field-force (book-only) may read camps; service scopes them to their division
        TENANT_PERMISSIONS.MANAGE.code,
    ]),
    CampController.search,
);

CampRouter.post(
    '/',
    AuthorizeMiddleware([
        CAMP_PERMISSIONS.CREATE.code,
        CAMP_PERMISSIONS.MANAGE.code,
        TENANT_PERMISSIONS.MANAGE.code,
    ]),
    CampController.create,
);

// pharma field-force booking — only pharma role types hold camp:book. The service then authorizes
// the caller against the target MR (self / downline). No manage fallback: booking is pharma-only.
CampRouter.post('/book', AuthorizeMiddleware([CAMP_PERMISSIONS.BOOK.code]), CampController.book);
