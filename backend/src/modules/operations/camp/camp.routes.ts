// Camp Routes
import express from 'express';
import { CampController } from './camp.controller';
import { registry } from '../../../shared/config/swagger/swagger.registry';
import {
    ActivateCampPayloadSchema,
    ApproveVoidCampPayloadSchema,
    BookCampPayloadSchema,
    BookingAvailabilityPayloadSchema,
    CampFileCompletePayloadSchema,
    CampFileListQuerySchema,
    CampFileUploadPayloadSchema,
    CampReportQuerySchema,
    CreateCampPayloadSchema,
    MoveStagePayloadSchema,
    SearchCampQuerySchema,
    UpdateCampPayloadSchema,
    VoidCampPayloadSchema,
} from './camp.validators';
import { AuthMiddleware } from '../../../shared/middlewares/authmiddleware';
import { Authorize } from '../../../shared/middlewares/authorize.middleware';
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

// start a camp (confirmed → live) — the camp's assigned field officer / dietitian only
registry.registerPath({
    method: 'patch',
    path: '/camps/{id}/activate',
    tags: ['CAMP'],
    summary: 'Start a camp — moves it confirmed → live (assigned FO/dietitian only, on/after its scheduled date)',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: ActivateCampPayloadSchema,
                },
            },
        },
    },
    responses: {
        200: { description: 'Camp started successfully' },
        403: { description: 'Not the assigned field worker' },
        404: { description: 'Camp not found' },
        409: { description: 'Camp is not in the confirmed stage' },
        422: { description: 'Camp cannot be started before its scheduled date' },
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

// create camp file upload intents (single or bulk) — assigned field worker only
registry.registerPath({
    method: 'post',
    path: '/camps/{id}/files',
    tags: ['CAMP'],
    summary: 'Create camp file upload intents (bulk) — returns a presigned PUT URL per file (assigned FO/dietitian only)',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    request: {
        body: { content: { 'application/json': { schema: CampFileUploadPayloadSchema } } },
    },
    responses: {
        201: { description: 'Upload intents created; response carries an uploadUrl per file' },
        400: { description: 'Validation error / bad purpose, mime or size' },
        403: { description: 'Not the assigned worker' },
        404: { description: 'Camp not found' },
        409: { description: 'Camp status does not allow this upload' },
    },
});

// complete (activate) camp files in bulk — partial success
registry.registerPath({
    method: 'patch',
    path: '/camps/{id}/files',
    tags: ['CAMP'],
    summary: 'Complete (verify + activate) uploaded camp files in bulk — partial success per file (assigned FO/dietitian only)',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    request: {
        body: { content: { 'application/json': { schema: CampFileCompletePayloadSchema } } },
    },
    responses: {
        200: { description: 'Per-file completion results' },
        400: { description: 'Validation error' },
        403: { description: 'Not the assigned worker' },
        404: { description: 'Camp not found' },
    },
});

// list a camp's files (optionally by purpose)
registry.registerPath({
    method: 'get',
    path: '/camps/{id}/files',
    tags: ['CAMP'],
    summary: "List a camp's active files (optionally filtered by purpose) with presigned read URLs",
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    request: { query: CampFileListQuerySchema },
    responses: {
        200: { description: 'Camp files fetched successfully' },
        404: { description: 'Camp not found' },
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
    Authorize.anyPermissions(GUARD),
    CampController.report
);

// my camps — role-gated to field-force + pharma management (HO/RSM/ASM); MUST be before '/:id'
// so '/my' isn't treated as an id. The service own-scopes each role (HO → division, ASM/RSM → the
// slots stamped on their camps, FO/dietitian/MR → their own slot), so the summary a manager sees
// is the same scoped set as the list they drill into.
CampRouter.get(
    '/my',
    Authorize.roles([
        ALLOWED_ROLETYPE_CODES.PLATFORM.FIELD_OFFICER,
        ALLOWED_ROLETYPE_CODES.PLATFORM.DIETITIAN,
        ALLOWED_ROLETYPE_CODES.CUSTOMER.PHARMA_MR,
        ALLOWED_ROLETYPE_CODES.CUSTOMER.PHARMA_ASM,
        ALLOWED_ROLETYPE_CODES.CUSTOMER.PHARMA_RSM,
        ALLOWED_ROLETYPE_CODES.CUSTOMER.PHARMA_DIVISION_HEAD,
    ]),
    CampController.myCamps,
);

CampRouter.get(
    '/:id',
    Authorize.anyPermissions([
        CAMP_PERMISSIONS.MANAGE.code,
        CAMP_PERMISSIONS.GET.code,
        CAMP_PERMISSIONS.BOOK.code, // pharma field-force (book-only) may read camps; service scopes them to their division
        TENANT_PERMISSIONS.MANAGE.code,
    ]),
    CampController.get,
);
CampRouter.put(
    '/:id',
    Authorize.anyPermissions([
        CAMP_PERMISSIONS.UPDATE.code,
        CAMP_PERMISSIONS.MANAGE.code,
        TENANT_PERMISSIONS.MANAGE.code,
    ]),
    CampController.update,
);
CampRouter.patch(
    '/:id/stage',
    Authorize.anyPermissions([CAMP_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.MANAGE.code]),
    CampController.moveStage,
);
// start a camp (confirmed → live) — role-gated to the field staff who run it; ownership + stage +
// scheduled-date are enforced in the service. NOT permission-gated (field staff, not managers).
CampRouter.patch(
    '/:id/activate',
    Authorize.roles([ALLOWED_ROLETYPE_CODES.PLATFORM.FIELD_OFFICER, ALLOWED_ROLETYPE_CODES.PLATFORM.DIETITIAN]),
    CampController.activate,
);

// approve a void camp (requested → closed) — camp:manage (ops) / tenant:manage only
CampRouter.patch(
    '/:id/approve-void',
    Authorize.anyPermissions([CAMP_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.MANAGE.code]),
    CampController.approveVoidCamp,
);

CampRouter.post(
    '/:id/allocate',
    Authorize.anyPermissions([
        CAMP_PERMISSIONS.UPDATE.code,
        CAMP_PERMISSIONS.MANAGE.code,
        TENANT_PERMISSIONS.MANAGE.code,
    ]),
    CampController.allocateWorker,
);

// camp files — writes (post = create intents, patch = complete/activate) are role-gated to the field
// staff who run the camp (assigned-worker + status checks live in CampService); reads use the same
// permission gate as GET /camps/:id.
CampRouter.get(
    '/:id/files',
    Authorize.anyPermissions([
        CAMP_PERMISSIONS.MANAGE.code,
        CAMP_PERMISSIONS.GET.code,
        CAMP_PERMISSIONS.BOOK.code,
        TENANT_PERMISSIONS.MANAGE.code,
    ]),
    CampController.getFiles,
);
CampRouter.post(
    '/:id/files',
    Authorize.roles([ALLOWED_ROLETYPE_CODES.PLATFORM.FIELD_OFFICER, ALLOWED_ROLETYPE_CODES.PLATFORM.DIETITIAN]),
    CampController.postFiles,
);
CampRouter.patch(
    '/:id/files',
    Authorize.roles([ALLOWED_ROLETYPE_CODES.PLATFORM.FIELD_OFFICER, ALLOWED_ROLETYPE_CODES.PLATFORM.DIETITIAN]),
    CampController.patchFiles,
);

CampRouter.get(
    '/',
    Authorize.anyPermissions([
        CAMP_PERMISSIONS.SEARCH.code,
        CAMP_PERMISSIONS.MANAGE.code,
        CAMP_PERMISSIONS.BOOK.code, // pharma field-force (book-only) may read camps; service scopes them to their division
        TENANT_PERMISSIONS.MANAGE.code,
    ]),
    CampController.search,
);

CampRouter.post(
    '/',
    Authorize.anyPermissions([
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
    Authorize.anyPermissions([CAMP_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.MANAGE.code]),
    CampController.voidCamp,
);

// booking availability — a pre-booking check for the pharma field-force. Entry is limited to
// camp:book holders (pharma role types); the service further restricts to customer tenants.
CampRouter.post(
    '/booking-availability',
    Authorize.anyPermissions([CAMP_PERMISSIONS.BOOK.code]),
    CampController.bookingAvailability,
);

// pharma field-force booking — only pharma role types hold camp:book. The service then authorizes
// the caller against the target MR (self / downline). No manage fallback: booking is pharma-only.
CampRouter.post('/book', Authorize.anyPermissions([CAMP_PERMISSIONS.BOOK.code]), CampController.book);


