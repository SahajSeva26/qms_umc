// Screening Routes
import express from 'express';
import { ScreeningController } from './screening.controller';
import { registry } from '../../../shared/config/swagger/swagger.registry';
import {
    CreateScreeningPayloadSchema,
    MoveStagePayloadSchema,
    SearchScreeningQuerySchema,
    UpdateScreeningPayloadSchema,
    VerifyConsentPayloadSchema,
} from './screening.validators';
import { AuthMiddleware } from '../../../shared/middlewares/authmiddleware';
import { AuthorizeMiddleware } from '../../../shared/middlewares/authorizeMiddleware';
import { SCREENING_PERMISSIONS } from './screening.constants';

export const ScreeningRouter = express.Router();

ScreeningRouter.use(AuthMiddleware);

// get screening
registry.registerPath({
    method: 'get',
    path: '/screenings/{id}',
    tags: ['SCREENING'],
    summary: 'Get screening',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    responses: {
        200: { description: 'Screening fetched successfully' },
        404: { description: 'Screening not found' },
    },
});

// search screenings
registry.registerPath({
    method: 'get',
    path: '/screenings',
    tags: ['SCREENING'],
    summary: 'Search screenings',
    request: { query: SearchScreeningQuerySchema },
    responses: {
        200: { description: 'Screenings fetched successfully' },
    },
});

// create screening
registry.registerPath({
    method: 'post',
    path: '/screenings',
    tags: ['SCREENING'],
    summary: 'Create screening (tenant derived from camp; consent OTP generated)',
    request: {
        body: { content: { 'application/json': { schema: CreateScreeningPayloadSchema } } },
    },
    responses: {
        201: { description: 'Screening created successfully' },
        400: { description: 'Validation error' },
        404: { description: 'Camp or patient not found' },
        409: { description: 'Patient already screened at this camp' },
    },
});

// update screening
registry.registerPath({
    method: 'put',
    path: '/screenings/{id}',
    tags: ['SCREENING'],
    summary: 'Update screening (symptoms / referral; only while pending)',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    request: {
        body: { content: { 'application/json': { schema: UpdateScreeningPayloadSchema } } },
    },
    responses: {
        200: { description: 'Screening updated successfully' },
        400: { description: 'Validation error' },
        404: { description: 'Screening not found' },
    },
});

// move screening stage
registry.registerPath({
    method: 'patch',
    path: '/screenings/{id}/stage',
    tags: ['SCREENING'],
    summary: 'Move screening to a new stage (records reason in stage history)',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    request: {
        body: { content: { 'application/json': { schema: MoveStagePayloadSchema } } },
    },
    responses: {
        200: { description: 'Screening stage updated successfully' },
        400: { description: 'Invalid stage transition or validation error' },
        422: { description: 'Consent not verified' },
    },
});

// verify consent
registry.registerPath({
    method: 'post',
    path: '/screenings/{id}/verify-consent',
    tags: ['SCREENING'],
    summary: 'Verify patient consent by matching the OTP',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    request: {
        body: { content: { 'application/json': { schema: VerifyConsentPayloadSchema } } },
    },
    responses: {
        200: { description: 'Consent verified successfully' },
        400: { description: 'Invalid or already-verified OTP' },
        404: { description: 'Screening not found' },
    },
});

// =======================================================================
// ====================== EXPORT SCREENING ROUTES ========================
// =======================================================================
// reads require the matching read permission (or manage); writes/stage/consent require the
// matching write permission (or manage).
ScreeningRouter.get('/:id', AuthorizeMiddleware([SCREENING_PERMISSIONS.GET.code, SCREENING_PERMISSIONS.MANAGE.code], 'OR'), ScreeningController.get);
ScreeningRouter.get('/', AuthorizeMiddleware([SCREENING_PERMISSIONS.SEARCH.code, SCREENING_PERMISSIONS.MANAGE.code], 'OR'), ScreeningController.search);

ScreeningRouter.post('/', AuthorizeMiddleware([SCREENING_PERMISSIONS.CREATE.code, SCREENING_PERMISSIONS.MANAGE.code], 'OR'), ScreeningController.create);
ScreeningRouter.put('/:id', AuthorizeMiddleware([SCREENING_PERMISSIONS.UPDATE.code, SCREENING_PERMISSIONS.MANAGE.code], 'OR'), ScreeningController.update);
ScreeningRouter.patch('/:id/stage', AuthorizeMiddleware([SCREENING_PERMISSIONS.UPDATE.code, SCREENING_PERMISSIONS.MANAGE.code], 'OR'), ScreeningController.moveStage);
ScreeningRouter.post('/:id/verify-consent', AuthorizeMiddleware([SCREENING_PERMISSIONS.UPDATE.code, SCREENING_PERMISSIONS.MANAGE.code], 'OR'), ScreeningController.verifyConsent);
