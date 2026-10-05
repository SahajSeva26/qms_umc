// Camp Routes
import express from 'express';
import { CampController } from './camp.controller';
import { registry } from '../../../shared/config/swagger/swagger.registry';
import {
    ApproveVoidCampPayloadSchema,
    BookCampPayloadSchema,
    BookingAvailabilityPayloadSchema,
    CampReportQuerySchema,
    CreateCampPayloadSchema,
    MoveStagePayloadSchema,
    SearchCampQuerySchema,
    UpdateCampPayloadSchema,
    VoidCampPayloadSchema,
} from './camp.validators';
import { AuthMiddleware } from '../../../shared/middlewares/authmiddleware';
import { AuthorizeMiddleware } from '../../../shared/middlewares/authorizeMiddleware';
import { RoleGuard } from '../../../shared/middlewares/roleGuard';
import { reportRateLimiter } from '../../../shared/middlewares/rateLimiter';
import { CAMP_PERMISSIONS } from './camp.constants';
import { TENANT_PERMISSIONS } from '../../access-management/tenant/tenant.constants';
import { ALLOWED_ROLETYPE_CODES } from '../../access-management/role-type/roleType.constants';

export const CampRouter = express.Router();

CampRouter.use(AuthMiddleware);

// camp report
registry.registerPath({
    method: 'get',
    path: '/camps/report',
    tags: ['CAMP'],
    summary: 'Get camp statistics report (total count, status/type/billing-type counts)',
    request: {
        query: CampReportQuerySchema,
    },
    responses: {
        200: { description: 'Camp report generated successfully' },
        400: { description: 'Validation error' },
        403: { description: 'Forbidden' },
    },
});

// my camps — field-force (FO / dietitian / MR) see only camps assigned to them
registry.registerPath({
    method: 'get',
    path: '/camps/my',
    tags: ['CAMP'],
    summary: 'List the camps assigned to the calling field-force user (FO / dietitian / MR)',
    request: {
        query: SearchCampQuerySchema,
    },
    responses: {
        200: { description: 'My camps fetched successfully' },
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

// void camp (internal team — record a camp done without a PO, no lifecycle)
registry.registerPath({
    method: 'post',
    path: '/camps/void-camp',
    tags: ['CAMP'],
    summary: 'Record a void camp (done without a PO) — internal team only; no lifecycle/allocation, billingType forced to void, lands in requested',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: VoidCampPayloadSchema,
                },
            },
        },
    },
    responses: {
        201: { description: 'Void camp created successfully' },
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

// booking availability
registry.registerPath({
    method: 'post',
    path: '/camps/booking-availability',
    tags: ['CAMP'],
    summary: 'Check camp booking availability for a project around a location within a date range',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: BookingAvailabilityPayloadSchema,
                },
            },
        },
    },
    responses: {
        200: { description: 'Booking availability fetched successfully' },
        400: { description: 'Validation error' },
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

// approve a void camp (requested → closed) — internal team only
registry.registerPath({
    method: 'patch',
    path: '/camps/{id}/approve-void',
    tags: ['CAMP'],
    summary: 'Approve a void camp — moves it requested → closed (camp:manage only; records reason + approver in stage history)',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: ApproveVoidCampPayloadSchema,
                },
            },
        },
    },
    responses: {
        200: { description: 'Void camp approved successfully' },
        400: { description: 'Not a void camp / validation error' },
        404: { description: 'Camp not found' },
        409: { description: 'Void camp is not in the requested stage' },
    },
});

// allocate the camp's field worker (nearest-free auto-assign) — a field officer for screening/lab
// camps, a dietitian for diet camps (decided by the camp's type).
registry.registerPath({
    method: 'post',
    path: '/camps/{id}/allocate',
    tags: ['CAMP'],
    summary:
        "Auto-allocate the nearest available field worker (field officer, or dietitian for diet camps) to the camp (based on the camp's coordinates)",
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    responses: {
        200: { description: 'Field worker allocated successfully' },
        404: { description: 'Camp not found' },
        422: { description: 'Camp has no coordinates, or no field worker covers this location' },
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

// my camps — role-gated to field-force; MUST be before '/:id' so '/my' isn't treated as an id
CampRouter.get(
    '/my',
    RoleGuard([
        ALLOWED_ROLETYPE_CODES.PLATFORM.FIELD_OFFICER,
        ALLOWED_ROLETYPE_CODES.PLATFORM.DIETITIAN,
        ALLOWED_ROLETYPE_CODES.CUSTOMER.PHARMA_MR,
    ]),
    CampController.myCamps,
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

// approve a void camp (requested → closed) — camp:manage (ops) / tenant:manage only
CampRouter.patch(
    '/:id/approve-void',
    AuthorizeMiddleware([CAMP_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.MANAGE.code]),
    CampController.approveVoidCamp,
);

CampRouter.post(
    '/:id/allocate',
    AuthorizeMiddleware([
        CAMP_PERMISSIONS.UPDATE.code,
        CAMP_PERMISSIONS.MANAGE.code,
        TENANT_PERMISSIONS.MANAGE.code,
    ]),
    CampController.allocateWorker,
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

// void camp — internal team records a camp done without a PO (no lifecycle). Gated to camp:manage
// (ops managers) / tenant:manage, never to pharma field-force (no camp:book here).
CampRouter.post(
    '/void-camp',
    AuthorizeMiddleware([CAMP_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.MANAGE.code]),
    CampController.voidCamp,
);

// booking availability — a pre-booking check for the pharma field-force. Entry is limited to
// camp:book holders (pharma role types); the service further restricts to customer tenants.
CampRouter.post(
    '/booking-availability',
    AuthorizeMiddleware([CAMP_PERMISSIONS.BOOK.code]),
    CampController.bookingAvailability,
);

// pharma field-force booking — only pharma role types hold camp:book. The service then authorizes
// the caller against the target MR (self / downline). No manage fallback: booking is pharma-only.
CampRouter.post('/book', AuthorizeMiddleware([CAMP_PERMISSIONS.BOOK.code]), CampController.book);
